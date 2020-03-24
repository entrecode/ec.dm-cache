const EventEmitter = require('events');

const channelWrapperSymbol = Symbol('channelWrapper');
const channelSymbol = Symbol('channel');
const queueSymbol = Symbol('queue');
const dataManagerShortIDSymbol = Symbol('dataManagerShortID');
const watchedModelsSymbol = Symbol('watchedModels');
const watchedEntriesSymbol = Symbol('watchedEntries');
const emitEventSymbol = Symbol('emitEvent');

class EventSourceAMQP {
  constructor({ rabbitMQChannel, dataManagerShortID }) {
    this.eventEmitter = new EventEmitter();
    this[emitEventSymbol] = this[emitEventSymbol].bind(this);
    this[watchedModelsSymbol] = new Map();
    this[watchedEntriesSymbol] = new Map();
    this.dataManagerShortID = dataManagerShortID;
    if (rabbitMQChannel) {
      this.rabbitMQChannel = rabbitMQChannel;
    }
  }

  get dataManagerShortID() {
    return this[dataManagerShortIDSymbol];
  }

  set dataManagerShortID(id) {
    this[dataManagerShortIDSymbol] = id;
  }

  set rabbitMQChannel(channelWrapper) {
    this[channelWrapperSymbol] = channelWrapper;
    this[channelWrapperSymbol]
      .addSetup((channel) => {
        channel
          .assertQueue('', { exclusive: true })
          .then((queue) => {
            this[channelSymbol] = channel;
            this[queueSymbol] = queue.queue;
            this.eventEmitter.emit('channelOpen');
            return channel.consume(queue.queue, this[emitEventSymbol]);
          })
          .catch((err) => {
            if (err) {
              console.error(err);
            }
          });
        channel.on('error', (error) => {
          if (error.message.indexOf('Channel ended') !== -1) {
            // Channel ended, no reply will be forthcoming.
            this[channelSymbol] = false;
            error.message = `Channel ended in DMCache: ${error.message}`;
            console.error(error);
          } else {
            console.error(error);
          }
        });
      })
      .catch((error) => {
        Object.assign(error, { message: `Error adding setup to channelWrapper: ${error.message}` });
        console.error(error);
      });
  }

  [emitEventSymbol](message) {
    const event = JSON.parse(message.content.toString());
    const { type } = message.properties;
    this.eventEmitter.emit('entryUpdated', {
      type,
      modelTitle: event.modelTitle,
      entryID: event.entryID,
    });
    if (this[channelSymbol]) {
      try {
        this[channelSymbol].ack(message);
      } catch (error) {
        if (error.message.indexOf('Channel ended') !== -1) {
          console.warn('Could not ack message - channel ended. Discard Message');
        } else {
          error.message = `Could not ack message: ${error.message}`;
          console.error(error);
        }
      }
    }
  }

  watch(modelTitle, entryID) {
    if (!(this[channelWrapperSymbol] && this[queueSymbol])) {
      throw new Error('missing AMQP Channel and Queue');
    }
    if (entryID) {
      // watch entry
      if (
        // if model is already watched, do nothing
        !this[watchedModelsSymbol].has(modelTitle) &&
        // if this entry is already watched, do nothing
        (!this[watchedEntriesSymbol].has(modelTitle) || !this[watchedEntriesSymbol].get(modelTitle).has(entryID))
      ) {
        const entryWatcher = (channel) =>
          // eslint-disable-next-line implicit-arrow-linebreak
          channel
            .bindQueue(this[queueSymbol], 'publicAPI', `${this.dataManagerShortID}.${modelTitle}.${entryID}.#`)
            .catch((error) => {
              // TODO
              // Object.assign(error, { message: `Error binding queue for entry: ${error.message}` });
              // console.error(error);
            });
        this[channelWrapperSymbol].addSetup(entryWatcher).catch((error) => {
          Object.assign(error, { message: `Error adding setup for entry to channelWrapper: ${error.message}` });
          console.error(error);
        });
        if (!this[watchedEntriesSymbol].has(modelTitle)) {
          // watch entry, save that we do that
          this[watchedEntriesSymbol].set(modelTitle, new Map());
        }
        this[watchedEntriesSymbol].get(modelTitle).set(entryID, entryWatcher);
      }
    } else if (!this[watchedModelsSymbol].has(modelTitle)) {
      // watch model, if model is already watched, do nothing
      const modelWatcher = (channel) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        channel
          .bindQueue(this[queueSymbol], 'publicAPI', `${this.dataManagerShortID}.${modelTitle}.#`)
          .catch((error) => {
            // Object.assign(error, { message: `Error binding queue for model: ${error.message}` });
            // console.error(error);
          });
      this[channelWrapperSymbol].addSetup(modelWatcher).catch((error) => {
        Object.assign(error, { message: `Error adding setup for model to channelWrapper: ${error.message}` });
        console.error(error);
      });
      this[watchedModelsSymbol].set(modelTitle, modelWatcher); // watch model, save that we do that
      if (this[watchedEntriesSymbol].has(modelTitle)) {
        // if we have watched for single entries before, unbind them because they are unnecessary now
        this[watchedEntriesSymbol].get(modelTitle).forEach((entryWatcher, eID) => {
          if (entryWatcher) {
            this[channelWrapperSymbol]
              .removeSetup(entryWatcher, async (channel) =>
                // eslint-disable-next-line implicit-arrow-linebreak
                channel
                  .unbindQueue(this[queueSymbol], 'publicAPI', `${this.dataManagerShortID}.${modelTitle}.${eID}.#`)
                  .catch((e) => {
                    e.message = `Could not unbind queue in DMCache: ${e.message}`;
                    console.error(e);
                  })
              )
              .catch((e) => {
                e.message = `Could not remove setup in DMCache: ${e.message}`;
                console.error(e);
              });
          }
        });
        this[watchedEntriesSymbol].delete(modelTitle);
      }
    }
  }

  watchEntry(modelTitle, entryID) {
    return this.watch(modelTitle, entryID);
  }

  watchModel(modelTitle) {
    return this.watch(modelTitle);
  }
}

module.exports = EventSourceAMQP;
