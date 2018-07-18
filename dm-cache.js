const Cache = require('./lib/cache');
const DataManagerWrapper = require('./lib/datamanager');
const SDKWrapper = require('./lib/ec.sdk');
const EventSourceAMQP = require('./lib/eventsource-amqp');

const dataManagerSymbol = Symbol('dataManager');
const cacheSymbol = Symbol('cache');
const eventSourceSymbol = Symbol('eventSource');
const namespaceSymbol = Symbol('namespace');

class DMCache {
  constructor({
    dataManagerInstance,
    sdkInstance,
    rabbitMQChannel,
    appendSource,
    cacheSize,
    timeToLive,
    redisConfig,
    redisClient,
    namespace,
  }) {
    if (!dataManagerInstance && !sdkInstance) {
      throw new Error('missing either `dataManagerInstance` or `sdkInstance`');
    }
    if (sdkInstance) {
      this[dataManagerSymbol] = new SDKWrapper(sdkInstance);
    } else {
      this[dataManagerSymbol] = new DataManagerWrapper(dataManagerInstance);
    }
    this.addRabbitMQChannel(rabbitMQChannel);
    if (appendSource) {
      this.appendSource = appendSource;
    }

    if (namespace) {
      this[namespaceSymbol] = namespace;
    }

    const redis = {
      active: false,
    };
    if (redisConfig) {
      Object.assign(redis, redisConfig);
      if ('namespace' in redisConfig) {
        this[namespaceSymbol] = redisConfig.namespace;
        delete redis.namespace;
      }
    }

    this[cacheSymbol] = new Cache(this.eventEmitter, cacheSize, timeToLive, redis, redisClient);
  }

  get eventEmitter() {
    return this[eventSourceSymbol] ? this[eventSourceSymbol].eventEmitter : false;
  }

  addRabbitMQChannel(rabbitMQChannel) {
    if (rabbitMQChannel) {
      this[eventSourceSymbol] = new EventSourceAMQP({
        rabbitMQChannel,
        dataManagerShortID: this[dataManagerSymbol].id,
      });
    }
  }

  assetHelper(type, assetID, ...params) {
    // todo
    return Promise.reject(new Error('not implemented'));
  }

  getEntries(modelTitle, options) {
    return Promise.resolve()
      .then(() => {
        if (typeof modelTitle !== 'string' || !modelTitle) {
          throw new Error(`modelTitle '${modelTitle}' given to dmCache.getEntries is invalid!`);
        }
        let key = [modelTitle, JSON.stringify(options)];
        if (this[namespaceSymbol]) {
          key.unshift(this[namespaceSymbol]);
        }
        key = key.join('|');
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
                if (this[eventSourceSymbol]) {
                  this[eventSourceSymbol].watchModel(modelTitle);
                }
                if (this.appendSource) {
                  entriesResult.dmCacheHitFrom = 'source';
                }
                return entriesResult;
              });
          });
      });
  }

  /**
   * load an entry from datamanager
   * @param  {String} modelTitle        Title of the model to get the entry from
   * @param  {String} entryID           ID of the entry to get or an entry with id property
   * @param  {Array<string>} fields     Array of requested fields
   * @param  {Number} levels            Number of levels to request
   * @param  {Function} [transformFunction] A function to be applied to the entry
   * @return {Promise.<Entry>}         Entry Value
   */
  getEntry(modelTitle, entryID, fields = null, levels = 1, transformFunction) {
    return Promise.resolve()
      .then(() => {
        if (typeof modelTitle !== 'string' || !modelTitle) {
          throw new Error(`modelTitle '${modelTitle}' given to dmCache.getEntry is invalid!`);
        }
        let validatedEntryID = entryID;
        if (typeof entryID === 'object' && 'id' in entryID) {
          validatedEntryID = entryID.id;
        }
        if (typeof validatedEntryID !== 'string' || !validatedEntryID) {
          throw new Error(`entryID '${validatedEntryID}' given to dmCache.getEntry is invalid!`);
        }
        if (transformFunction && typeof transformFunction !== 'function') {
          throw new Error('transformFunction given to dmCache.getEntry is invalid!');
        }
        const fieldsString = Array.isArray(fields) ? JSON.stringify(fields) : false;
        const levelsString = levels > 1 ? levels : false;
        let key = [modelTitle, validatedEntryID, fieldsString, levelsString].filter(x => !!x);
        if (this[namespaceSymbol]) {
          key.unshift(this[namespaceSymbol]);
        }
        key = key.join('|');
        return this[cacheSymbol].getEntry(key)
          .then((cachedEntry) => {
            if (cachedEntry) {
              if (this.appendSource) {
                cachedEntry.dmCacheHitFrom = 'cache';
              }
              return cachedEntry;
            }
            return this[dataManagerSymbol].getEntry(modelTitle, validatedEntryID, { fields, levels })
              .then((entryResult) => {
                let linkedEntries = [];
                if (levels > 1) {
                  linkedEntries = this[dataManagerSymbol].findLinkedEntries(entryResult);
                }
                this[cacheSymbol].putEntry(key, modelTitle, validatedEntryID, entryResult, linkedEntries);
                if (this[eventSourceSymbol]) {
                  this[eventSourceSymbol].watchEntry(modelTitle, validatedEntryID);
                  linkedEntries.map(toWatch => this[eventSourceSymbol].watchEntry(...toWatch));
                }
                if (this.appendSource) {
                  entryResult.dmCacheHitFrom = 'source';
                }
                return entryResult;
              });
          })
          .then((result) => {
            if (transformFunction) {
              return transformFunction(result);
            }
            return result;
          });
      });
  }

  getStats() {
    return this[cacheSymbol].getStats();
  }

  watchEntry(modelTitle) {
    return this[eventSourceSymbol] ? this[eventSourceSymbol].watchEntry(modelTitle) : false;
  }

  watchModel(modelTitle) {
    return this[eventSourceSymbol] ? this[eventSourceSymbol].watchModel(modelTitle) : false;
  }

  destroy() {
    this[cacheSymbol].destroy();
  }
}

module.exports = DMCache;
