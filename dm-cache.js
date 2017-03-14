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
    return Promise.resolve(event.data)
    .then((data) => {
      return Object.assign(data, {
        id: event.entryID,
        _id: event.entryID,
        modified: event.modified,
        _modified: event.modified,
        _creator: event.user.userType === 'ecUser' ? null : event.user.accountID,
        private: event.private
      });
    })
    .then((data) => {
      const transformationFunction = watchedModels.get(event.modelTitle);
      if (!transformationFunction) {
        return data;
      }
      return transformationFunction(data);
    })
    .then((data) => {
      const cachedData = cache.get(event.modelTitle + event.entryID);
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
    .then(() => {
      if (typeof modelTitle !== 'string' || !modelTitle) {
        throw new Error(`modelTitle '${modelTitle}' given to dmCache.getEntry is invalid!`);
      }
      if (typeof entryID !== 'string' || !entryID) {
        throw new Error(`entryID '${entryID}' given to dmCache.getEntry is invalid!`);
      }
      if (transformFunction && typeof entryID !== 'function') {
        throw new Error(`transformFunction given to dmCache.getEntry is invalid!`);
      }
      return cache.get(modelTitle + entryID);
    })
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
