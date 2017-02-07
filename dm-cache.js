'use strict';

const cache = require('memory-cache');
const DataManager = require('ec.datamanager');
const logger = require('ec.logger');

let dm;
const amqp = {
  channel: null,
  queue: null,
};
const watchedModels = new Map();

function updateEntryInCache(message) {
  return Promise.resolve()
  .then(() => {
    const event = JSON.parse(message.content.toString());
    const type = message.properties.type;
    if (type === 'entryDeleted') {
      logger.debug(`deleted ${event.modelTitle}/${event.entryID} from cache`)
      return cache.del(event.modelTitle + event.entryID);
    }
    logger.debug(`updated ${event.modelTitle}/${event.entryID} in cache`)
    return Promise.resolve()
    .then(() => {
      const transformationFunction = watchedModels.get(event.modelTitle);
      if (!transformationFunction) {
        return event.data;
      }
      return transformationFunction(event.data);
    })
    .then((data) => {
      return cache.get(event.modelTitle + event.entryID)
      .then((cachedData) => {
        if (!cachedData) { // don't cache if not requested yet
          return data;
        }
        Object.assign(cachedData, data); // update cached object
        if ('_entryTitle' in cachedData && '_modelTitleField' in cachedData) {
          cachedData._entryTitle = cachedData[cachedData._modelTitleField];
        }
        return cache.put(event.modelTitle + event.entryID, cachedData);
      })
    })
  })
  .then(() => amqp.channel.ack(message))
  .catch((e) => {
    logger.error(e);
    amqp.channel.nack(message);
  });
}

function watchModel(modelTitle, transformFunction) {
  if (amqp.channel && amqp.queue) {
    amqp.channel.bindQueue(amqp.queue, 'publicAPI', `${dm.id}.${modelTitle}.#`);
    watchedModels.set(modelTitle, transformFunction);
  } else {
    logger.warn('No AMQP connection given to dm-cache! Deleting cached entries after 5 minutes');
  }
}

const dmCache = {
  setDataManager(dataManagerURL, accessToken) {
    dm = new DataManager({
      url: dataManagerURL,
      accessToken,
    });
  },
  setDataManagerInstance(dataManagerInstance) {
    dm = dataManagerInstance;
  },
  setRabbitMQConnection(connection) {
    connection.createChannel({
      setup(channel) {
        return Promise.all([
          channel.assertExchange('publicAPI', 'topic', { durable: true }),
          channel.assertQueue('', { exclusive: true })
          .then((queue) => {
            channel.consume(queue.queue, updateEntryInCache);
            amqp.channel = channel;
            amqp.queue = queue.queue;
          }),
        ])
        .catch(logger.error);
      },
    });
  },

  /**
   * load an entry from datamanager
   * @param  {String} modelTitle        Title of the model to get the entry from
   * @param  {String} entryID           ID of the entry to get
   * @param  {Function} [transformFunction] A function to be applied to the entry
   * @return {Promise.<Entry>}         Entry Value
   */
  getEntry(modelTitle, entryID, transformFunction) {
    return Promise.resolve()
    .then(() => cache.get(modelTitle + entryID))
    .then((cachedEntry) => {
      if (cachedEntry) {
        logger.debug(`loaded ${modelTitle}/${entryID} from cache`);
        return cachedEntry;
      }
      if (!dm) {
        throw new Error('No DataManager instance given to dm-cache');
      }
      if (!watchedModels.has(modelTitle)) {
        watchModel(modelTitle, transformFunction);
      }
      return dm.model(modelTitle)
      .entry(entryID)
      .then(entry => transformFunction ? transformFunction(entry.value) : entry.value)
      .then((entry) => {
        const cacheTime = (amqp.channel && amqp.queue ? undefined : 5 * 60 * 1000);
        cache.put(modelTitle + entryID, entry, cacheTime);
        logger.debug(`loaded ${modelTitle}/${entryID} from dm and cache now`);
        return entry;
      });
    });
  },
};

module.exports = dmCache;
