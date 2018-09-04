const cacheManager = require('cache-manager');
const redisStore = require('cache-manager-redis-store');

const configCacheMemorySymbol = Symbol('configCacheMemory');
const configCacheRedisSymbol = Symbol('configCacheRedis');
const configCacheSymbol = Symbol('configCache');
const entryCacheSymbol = Symbol('entryCache');
const entryCacheMemorySymbol = Symbol('entryCacheMemory');
const entryCacheRedisSymbol = Symbol('entryCacheRedis');
const modelCacheSymbol = Symbol('modelCache');
const modelCacheMemorySymbol = Symbol('modelCacheMemory');
const modelCacheRedisSymbol = Symbol('modelCacheRedis');
const entryCacheMapSymbol = Symbol('entryCacheMap');
const modelCacheMapSymbol = Symbol('modelCacheMap');
const deleteFromModelCacheSymbol = Symbol('deleteFromModelCache');
const deleteFromEntryCacheSymbol = Symbol('deleteFromEntryCache');
const eventEmitterSymbol = Symbol('eventEmitter');
const eventListenerSymbol = Symbol('eventListener');
const cacheSizeSymbol = Symbol('cacheSize');
const timeToLiveSymbol = Symbol('timeToLive');

function buildKey(...args) {
  return [...args].join('|');
}

class Cache {
  constructor(eventEmitter, cacheSize, timeToLive, redisConfig = {}, redisClient = false) {
    const cacheOptions = { store: 'memory' };
    const cacheOptionsRedis = { store: redisStore };
    Object.assign(cacheOptionsRedis, redisConfig);

    if (cacheSize) {
      cacheOptions.max = cacheSize;
    } else {
      cacheOptions.max = 1000;
    }

    if (timeToLive || timeToLive === 0) {
      cacheOptions.ttl = timeToLive;
      cacheOptionsRedis.ttl = timeToLive;
    } else if (redisConfig.active || redisClient) {
      // set ttl for memory cache when redis is active, proper ttl is handle by redis then
      let halfTtl = 120;
      if (timeToLive || timeToLive === 0) {
        halfTtl = Math.floor(timeToLive / 2);
      }
      cacheOptions.ttl = halfTtl;
    }

    this[cacheSizeSymbol] = cacheOptions.max;
    this[timeToLiveSymbol] = timeToLive;

    this[entryCacheMemorySymbol] = cacheManager.caching(cacheOptions);
    this[modelCacheMemorySymbol] = cacheManager.caching(cacheOptions);
    this[configCacheMemorySymbol] = cacheManager.caching(cacheOptions);

    if (redisConfig.active) {
      if (!('db' in cacheOptionsRedis)) {
        cacheOptionsRedis.db = 0;
      }

      this[configCacheRedisSymbol] = cacheManager.caching(cacheOptionsRedis);
      this[entryCacheRedisSymbol] = cacheManager.caching(cacheOptionsRedis);
      this[modelCacheRedisSymbol] = cacheManager.caching(cacheOptionsRedis);
    } else if (redisClient) {
      this[configCacheRedisSymbol] = cacheManager.caching(Object.assign(cacheOptionsRedis, { redisClient }));
      this[entryCacheRedisSymbol] = cacheManager.caching(Object.assign(cacheOptionsRedis, { redisClient }));
      this[modelCacheRedisSymbol] = cacheManager.caching(Object.assign(cacheOptionsRedis, { redisClient }));
    } else {
      this[configCacheRedisSymbol] = undefined;
      this[entryCacheRedisSymbol] = undefined;
      this[modelCacheRedisSymbol] = undefined;
    }

    this[entryCacheSymbol] = cacheManager.multiCaching([
      this[entryCacheMemorySymbol],
      this[entryCacheRedisSymbol],
    ]
      .filter(x => !!x));
    this[modelCacheSymbol] = cacheManager.multiCaching([
      this[modelCacheMemorySymbol],
      this[modelCacheRedisSymbol],
    ]
      .filter(x => !!x));
    this[configCacheSymbol] = cacheManager.multiCaching([
      this[configCacheMemorySymbol],
      this[configCacheRedisSymbol],
    ]
      .filter(x => !!x));

    this[entryCacheMapSymbol] = new Map();
    this[modelCacheMapSymbol] = new Map();
    this[eventListenerSymbol] = this[eventListenerSymbol].bind(this);
    this.eventEmitter = eventEmitter;
  }

  set eventEmitter(newEventEmitter) {
    if (newEventEmitter) {
      if (this[eventEmitterSymbol]) {
        this[eventEmitterSymbol].removeListener('entryUpdated', this[eventListenerSymbol]);
      }
      this[eventEmitterSymbol] = newEventEmitter;
      this[eventEmitterSymbol].on('entryUpdated', this[eventListenerSymbol]);
    }
  }

  [deleteFromEntryCacheSymbol](modelTitle, entryID) {
    if (this[entryCacheMapSymbol].has(buildKey(modelTitle, entryID))) {
      this[entryCacheMapSymbol].get(buildKey(modelTitle, entryID))
        .forEach(key => this[entryCacheSymbol].del(key));
    }
    this[entryCacheMapSymbol].delete(buildKey(modelTitle, entryID));
  }

  [deleteFromModelCacheSymbol](modelTitle) {
    if (this[modelCacheMapSymbol].has(modelTitle)) {
      this[modelCacheMapSymbol].get(modelTitle).forEach(key => this[modelCacheSymbol].del(key));
    }
    this[modelCacheMapSymbol].delete(modelTitle);
  }

  [eventListenerSymbol]({ type, modelTitle, entryID }) {
    this[deleteFromModelCacheSymbol](modelTitle);
    if (type !== 'entryCreated') {
      this[deleteFromEntryCacheSymbol](modelTitle, entryID);
    }
  }

  getEntries(key) {
    return this[modelCacheSymbol].get(key)
      .then(result => (result ? Object.assign({}, result) : undefined));
  }

  getEntry(key) {
    return this[entryCacheSymbol].get(key)
      .then(result => (result ? Object.assign({}, result) : undefined));
  }

  getDMConfig(key) {
    return this[entryCacheSymbol].get(key)
      .then(result => (result ? Object.assign({}, result) : undefined));
  }

  getStats() {
    return Promise.all([
      this[entryCacheMemorySymbol].keys(),
      this[modelCacheMemorySymbol].keys(),
      this[configCacheMemorySymbol].keys(),
    ])
      .then(keyArrays => keyArrays.map(keyArray => keyArray.length))
      .then(([itemsInEntryCache, itemsInModelCache, itemsInConfigCache]) => ({
        maxCacheSize: this[cacheSizeSymbol],
        timeToLive: this[timeToLiveSymbol],
        itemsInEntryCache,
        itemsInModelCache,
        itemsInConfigCache,
      }));
  }

  putEntries(key, modelTitle, payload) {
    return this[modelCacheSymbol].set(key, payload)
      .then((result) => {
        if (this[modelCacheMapSymbol].has(modelTitle)) {
          const set = this[modelCacheMapSymbol].get(modelTitle);
          set.add(key);
          this[modelCacheMapSymbol].set(modelTitle, set);
        } else {
          this[modelCacheMapSymbol].set(modelTitle, new Set([key]));
        }
        return result;
      });
  }

  putEntry(key, modelTitle, entryID, payload, linkedEntries = []) {
    return this[entryCacheSymbol].set(key, payload)
      .then((result) => {
        [[modelTitle, entryID]].concat(linkedEntries)
          .map(([modelTitle, entryID]) => {
            if (this[entryCacheMapSymbol].has(buildKey(modelTitle, entryID))) {
              const set = this[entryCacheMapSymbol].get(buildKey(modelTitle, entryID));
              set.add(key);
              this[entryCacheMapSymbol].set(buildKey(modelTitle, entryID), set);
            } else {
              this[entryCacheMapSymbol].set(buildKey(modelTitle, entryID), new Set([key]));
            }
          });
        return result;
      });
  }

  putDMConfig(key, payload) {
    return this[configCacheSymbol].set(key, payload)
      .then(result => result);
  }

  destroy() {
    if (this[entryCacheRedisSymbol]) {
      this[entryCacheRedisSymbol].store.getClient().quit();
      this[entryCacheRedisSymbol] = undefined;
    }
    if (this[modelCacheRedisSymbol]) {
      this[modelCacheRedisSymbol].store.getClient().quit();
      this[modelCacheRedisSymbol] = undefined;
    }
  }
}

module.exports = Cache;
