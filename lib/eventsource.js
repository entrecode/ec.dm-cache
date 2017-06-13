let dm;
const amqp = {
  channel: null,
  queue: null,
};

const watchedModels = new Set();
const watchedEntries = new Map();

const eventEmitter = new EventEmitter();

function emitEvent(message) {
  const event = JSON.parse(message.content.toString());
  const type = message.properties.type;
  eventEmitter.emit('entryUpdated', {
    type,
    modelTitle: event.modelTitle,
    entryID: event.entryID,
  })
}

function watch(modelTitle, entryID) {
  if (amqp.channel && amqp.queue) {
    if (entryID) { // watch entry
      if (!watchedModels.has(modelTitle) // if model is already watched, do nothing
        && (!watchedEntries.has(modelTitle) || !watchedEntries.get(modelTitle).has(entryID))
      ) { // if this entry is already watched, do nothing
        amqp.channel.bindQueue(amqp.queue, 'publicAPI', `${dm.id}.${modelTitle}.${entryID}.#`);
        if (!watchedEntries.has(modelTitle)) { // watch entry, save that we do that
          watchedEntries.set(modelTitle, new Set());
        }
        watchedEntries.get(modelTitle).add(entryID);
      }
    } else { // watch model
      if (!watchedModels.has(modelTitle)) { // if model is already watched, do nothing
        amqp.channel.bindQueue(amqp.queue, 'publicAPI', `${dm.id}.${modelTitle}.#`);
        watchedModels.add(modelTitle); // watch model, save that we do that
        if (watchedEntries.has(modelTitle)) { // if we have watched for single entries before,
          watchedEntries.get(modelTitle)
          .forEach(entryID => // unbind them because they are unnecessary now
            amqp.channel.unbindQueue(amqp.queue, 'publicAPI', `${dm.id}.${modelTitle}.${entryID}.#`)
          );
          watchedEntries.delete(modelTitle);
        }
      }
    }
  } else {
    console.warn('No AMQP connection given to dm-cache! Deleting cached entries after 5 minutes');
  }
}


function setRabbitMQConnection(connection) {
  connection.createChannel({
    setup(channel) {
      return Promise.all([
        channel.assertExchange('publicAPI', 'topic', { durable: true }),
        channel.assertQueue('', { exclusive: true })
        .then((queue) => {
          channel.consume(queue.queue, emitEvent);
          amqp.channel = channel;
          amqp.queue = queue.queue;
        }),
      ])
      .catch(console.error);
    },
  });
}

function setRabbitMQChannel(channel) {
  channel.assertQueue('', { exclusive: true })
  .then((queue) => {
    channel.consume(queue.queue, emitEvent);
    amqp.channel = channel;
    amqp.queue = queue.queue;
  })
  .catch(console.error);
}

function watchEntry(modelTitle, entryID) {
  return watch(modelTitle, entryID);
}

function watchModel(modelTitle) {
  return watch(modelTitle);
}

module.exports = {
  eventEmitter,
  setRabbitMQConnection,
  setRabbitMQChannel,
  watchEntry,
  watchModel,
};
