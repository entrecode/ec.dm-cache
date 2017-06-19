const Cache = require('./lib/cache');
const DataManagerWrapper = require('./lib/datamanager');
const EventSourceAMQP = require('./lib/eventsource-amqp');

const dataManagerSymbol = Symbol('dataManager');
const cacheSymbol = Symbol('cache');
const eventSourceSymbol = Symbol('eventSource');

class DMCache {

  constructor({ dataManagerInstance, sdkInstance, rabbitMQChannel, appendSource, cacheSize, timeToLive }) {
    if (!rabbitMQChannel) {
      throw new Error('missing `rabbitMQChannel`');
    }
    if (!dataManagerInstance && !sdkInstance) {
      throw new Error('missing either `dataManagerInstance` or `sdkInstance`');
    }
    if (sdkInstance) {
      // TODO support for ec.sdk
      throw new Error('ec.sdk is not yet supported');
    }
    if (dataManagerInstance) {
      this[dataManagerSymbol] = new DataManagerWrapper(dataManagerInstance);
    }
    this[eventSourceSymbol] = new EventSourceAMQP({
      rabbitMQChannel,
      dataManagerShortID: dataManagerInstance.id,
    });
    if (appendSource) {
      this.appendSource = appendSource;
    }
    this[cacheSymbol] = new Cache(this.eventEmitter, cacheSize, timeToLive);
  }

  get eventEmitter() {
    return this[eventSourceSymbol].eventEmitter;
  }

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
      return this[cacheSymbol].getEntry(key)
      .then((cachedEntry) => {
        if (cachedEntry) {
          if (this.appendSource) {
            cachedEntry.dmCacheHitFrom = 'cache';
          }
          return cachedEntry;
        }
        return this[dataManagerSymbol].getEntry(modelTitle, entryID, { fields, levels })
        .then((entryResult) => {
          this[cacheSymbol].putEntry(key, modelTitle, entryID, entryResult);
          this[eventSourceSymbol].watchEntry(modelTitle, entryID);
          if (levels > 1) {
            this[dataManagerSymbol].findLinkedEntries(entryResult)
            .map((toWatch) => this[eventSourceSymbol].watchEntry(...toWatch));
          }
          if (this.appendSource) {
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
  }


  getEntries(modelTitle, options) {
    return Promise.resolve()
    .then(() => {
      if (typeof modelTitle !== 'string' || !modelTitle) {
        throw new Error(`modelTitle '${modelTitle}' given to dmCache.getEntries is invalid!`);
      }
      const key = [modelTitle, JSON.stringify(options)].join('|');
      return this[cacheSymbol].getEntries(key)
      .then((cachedEntries) => {
        if (cachedEntries) {
          if (this.appendSource) {
            cachedEntries.dmCacheHitFrom = 'cache';
          }
          return cachedEntries;
        }
        return this[dataManagerSymbol].getEntries(modelTitle, options)
        .then((entriesResult) => {
          this[cacheSymbol].putEntries(key, modelTitle, entriesResult);
          this[eventSourceSymbol].watchModel(modelTitle);
          if (this.appendSource) {
            entriesResult.dmCacheHitFrom = 'source';
          }
          return entriesResult;
        })
      });
    })
  }


  assetHelper(type, assetID, ...params) {
    // todo
    return Promise.reject('not implemented');
  }

  getStats() {
    return this[cacheSymbol].getStats();
  }
}

module.exports = DMCache;
