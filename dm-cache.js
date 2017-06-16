'use strict';
const cache = require('./lib/cache');
const datamanager = require('./lib/datamanager');
const eventSource = require('./lib/eventsource-amqp');

let appendSource = false;

const dmCache = {
  eventEmitter: eventSource.eventEmitter,

  /**
   * load an entry from datamanager
   * @param  {String} modelTitle        Title of the model to get the entry from
   * @param  {String} entryID           ID of the entry to get
   * @param  {Function} [transformFunction] A function to be applied to the entry
   * @return {Promise.<Entry>}         Entry Value
   */
  getEntry(modelTitle, entryID, fields = [], levels = 1, transformFunction) {
    return Promise.resolve()
    .then(() => {
      if (typeof modelTitle !== 'string' || !modelTitle) {
        throw new Error(`modelTitle '${modelTitle}' given to dmCache.getEntry is invalid!`);
      }
      if (typeof entryID !== 'string' || !entryID) {
        throw new Error(`entryID '${entryID}' given to dmCache.getEntry is invalid!`);
      }
      if (transformFunction && typeof transformFunction !== 'function') {
        throw new Error(`transformFunction given to dmCache.getEntry is invalid!`);
      }
      const fieldsString = fields.length > 0 ? JSON.stringify(fields) : false;
      const levelsString = levels > 1 ? levels : false;
      const key = [modelTitle, entryID, fieldsString, levelsString].filter(x => !!x).join('|');
      return cache.getEntry(key)
      .then((cachedEntry) => {
        if (cachedEntry) {
          if (appendSource) {
            cachedEntry.dmCacheHitFrom = 'cache';
          }
          return cachedEntry;
        }
        return datamanager.getEntry(modelTitle, entryID, { fields, levels })
        .then((entryResult) => {
          cache.putEntry(key, modelTitle, entryID, entryResult);
          eventSource.watchEntry(modelTitle, entryID);
          if (levels > 1) {
            datamanager.findLinkedEntries(entryResult)
            .map((toWatch) => eventSource.watchEntry(...toWatch));
          }
          if (appendSource) {
            entryResult.dmCacheHitFrom = 'source';
          }
          return entryResult;
        })
      })
      .then((result) => {
        if (transformFunction) {
          return transformFunction(result);
        }
        return result;
      });
    })
  },

  getEntries(modelTitle, options) {
    return Promise.resolve()
    .then(() => {
      if (typeof modelTitle !== 'string' || !modelTitle) {
        throw new Error(`modelTitle '${modelTitle}' given to dmCache.getEntries is invalid!`);
      }
      const key = [modelTitle, JSON.stringify(options)].join('|');
      return cache.getEntries(key)
      .then((cachedEntries) => {
        if (cachedEntries) {
          if (appendSource) {
            cachedEntries.dmCacheHitFrom = 'cache';
          }
          return cachedEntries;
        }
        return datamanager.getEntries(modelTitle, options)
        .then((entriesResult) => {
          cache.putEntries(key, modelTitle, entriesResult);
          eventSource.watchModel(modelTitle);
          if (appendSource) {
            entriesResult.dmCacheHitFrom = 'source';
          }
          return entriesResult;
        })
      });
    })
  },

  assetHelper(type, assetID, ...params) {
    // todo
    return Promise.reject('not implemented');
  },

  setup({ dataManagerInstance, sdkInstance, rabbitMQConnection, rabbitMQChannel, verbose }) {
    if (!dataManagerInstance || (!rabbitMQConnection && !rabbitMQChannel)) {
      throw new Error('missing setup options');
    }
    if (dataManagerInstance) {
      datamanager.setDataManagerInstance(dataManagerInstance);
      eventSource.setDataManagerID(dataManagerInstance.id);
    }
    if (sdkInstance) {
      // TODO support for ec.sdk
      throw new Error('ec.sdk is not yet supported');
    }
    if (rabbitMQConnection) {
      eventSource.setRabbitMQConnection(rabbitMQConnection);
    }
    if (rabbitMQChannel) {
      eventSource.setRabbitMQChannel(rabbitMQChannel);
    }
    if (verbose) {
      appendSource = verbose;
    }
  },

  setDataManagerInstance(dataManagerInstance) {
    datamanager.setDataManagerInstance(dataManagerInstance);
    eventSource.setDataManagerID(dataManagerInstance.id);
  },
};

module.exports = dmCache;
