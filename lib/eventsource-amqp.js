const EventEmitter = require('events');

const channelSymbol = Symbol('channel');
const queueSymbol = Symbol('queue');
const dataManagerShortIDSymbol = Symbol('dataManagerShortID');
const watchedModelsSymbol = Symbol('watchedModels');
const watchedEntriesSymbol = Symbol('watchedEntries');
const emitEventSymbol = Symbol('emitEvent');

class EventSourceAMQP {

  constructor({rabbitMQChannel, dataManagerShortID}) {
    this.eventEmitter = new EventEmitter();
    this[emitEventSymbol] = this[emitEventSymbol].bind(this);
    this[watchedModelsSymbol] = new Set();
    this[watchedEntriesSymbol] = new Map();
    this.dataManagerShortID = dataManagerShortID;
    if (rabbitMQChannel) {
      this.rabbitMQChannel = rabbitMQChannel;
    }
  }

  [emitEventSymbol](message) {
    const event = JSON.parse(message.content.toString());
    const type = message.properties.type;
    this.eventEmitter.emit('entryUpdated', {
      type,
      modelTitle: event.modelTitle,
      entryID: event.entryID,
    });
    this[channelSymbol].ack(message);
  }

  watch(modelTitle, entryID) {
    if (!(this[channelSymbol] && this[queueSymbol])) {
      throw new Error('missing AMQP Channel and Queue');
    }
    if (entryID) { // watch entry
      if (!this[watchedModelsSymbol].has(modelTitle) // if model is already watched, do nothing
        && (!this[watchedEntriesSymbol].has(modelTitle) || !this[watchedEntriesSymbol].get(modelTitle).has(entryID))
      ) { // if this entry is already watched, do nothing
        this[channelSymbol].bindQueue(this[queueSymbol], 'publicAPI', `${this.dataManagerShortID}.${modelTitle}.${entryID}.#`);
        if (!this[watchedEntriesSymbol].has(modelTitle)) { // watch entry, save that we do that
          this[watchedEntriesSymbol].set(modelTitle, new Set());
        }
        this[watchedEntriesSymbol].get(modelTitle).add(entryID);
      }
    } else { // watch model
      if (!this[watchedModelsSymbol].has(modelTitle)) { // if model is already watched, do nothing
        this[channelSymbol].bindQueue(this[queueSymbol], 'publicAPI', `${this.dataManagerShortID}.${modelTitle}.#`);
        this[watchedModelsSymbol].add(modelTitle); // watch model, save that we do that
        if (this[watchedEntriesSymbol].has(modelTitle)) { // if we have watched for single entries before,
          this[watchedEntriesSymbol].get(modelTitle)
          .forEach(entryID => // unbind them because they are unnecessary now
            this[channelSymbol].unbindQueue(this[queueSymbol], 'publicAPI', `${this.dataManagerShortID}.${modelTitle}.${entryID}.#`)
          );
          this[watchedEntriesSymbol].delete(modelTitle);
        }
      }
    }
  }

  set dataManagerShortID(id) {
    this[dataManagerShortIDSymbol] = id;
  }
  get dataManagerShortID() {
    return this[dataManagerShortIDSymbol];
  }

  set rabbitMQChannel(channel) {
    channel.assertQueue('', { exclusive: true })
    .then((queue) => {
      channel.consume(queue.queue, this[emitEventSymbol]);
      this[channelSymbol] = channel;
      this[queueSymbol] = queue.queue;
      this.eventEmitter.emit('channelOpen');
    })
    .catch(console.error);
  }

  watchEntry(modelTitle, entryID) {
    return this.watch(modelTitle, entryID);
  }

  watchModel(modelTitle) {
    return this.watch(modelTitle);
  }

}

module.exports = EventSourceAMQP;
