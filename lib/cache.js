const cacheManager = require('cache-manager');

const entryCacheSymbol = Symbol('entryCache');
const modelCacheSymbol = Symbol('modelCache');
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
  constructor(eventEmitter, cacheSize, timeToLive) {
    const cacheOptions = { store: 'memory' };
    if (cacheSize) {
      cacheOptions.max = cacheSize;
    } else {
      cacheOptions.max = 1000;
    }
    if (timeToLive) {
      cacheOptions.ttl = timeToLive;
    }
    this[cacheSizeSymbol] = cacheOptions.max;
    this[timeToLiveSymbol] = timeToLive;
    this[entryCacheSymbol] = cacheManager.caching(cacheOptions);
    this[modelCacheSymbol] = cacheManager.caching(cacheOptions);
    this[entryCacheMapSymbol] = new Map();
    this[modelCacheMapSymbol] = new Map();
    this[eventListenerSymbol] = this[eventListenerSymbol].bind(this);
    this.eventEmitter = eventEmitter;
  }

  set eventEmitter(newEventEmitter) {
    if (this[eventEmitterSymbol]) {
      this[eventEmitterSymbol].removeListener('entryUpdated', this[eventListenerSymbol]);
    }
    this[eventEmitterSymbol] = newEventEmitter;
    this[eventEmitterSymbol].on('entryUpdated', this[eventListenerSymbol]);
  }

  getStats() {
    return Promise.all([
      this[entryCacheSymbol].keys(),
      this[modelCacheSymbol].keys(),
    ])
    .then(keyArrays => keyArrays.map(keyArray => keyArray.length))
    .then(([itemsInEntryCache, itemsInModelCache]) => ({
      maxCacheSize: this[cacheSizeSymbol],
      timeToLive: this[timeToLiveSymbol],
      itemsInEntryCache,
      itemsInModelCache,
    }));
  }

  [deleteFromModelCacheSymbol](modelTitle) {
    if (this[modelCacheMapSymbol].has(modelTitle)) {
      this[modelCacheMapSymbol].get(modelTitle).forEach(key => this[modelCacheSymbol].del(key));
    }
    this[modelCacheMapSymbol].delete(modelTitle);
  }

  [deleteFromEntryCacheSymbol](modelTitle, entryID) {
    if (this[entryCacheMapSymbol].has(buildKey(modelTitle, entryID))) {
      this[entryCacheMapSymbol].get(buildKey(modelTitle, entryID)).forEach(key => this[entryCacheSymbol].del(key));
    }
    this[entryCacheMapSymbol].delete(buildKey(modelTitle, entryID));
  }

  [eventListenerSymbol]({ type, modelTitle, entryID }) {
    this[deleteFromModelCacheSymbol](modelTitle);
    if (type !== 'entryCreated') {
      this[deleteFromEntryCacheSymbol](modelTitle, entryID);
    }
  }

  getEntry(key) {
    return this[entryCacheSymbol].get(key)
    .then(result => result ? Object.assign({}, result) : undefined);
  }

  putEntry(key, modelTitle, entryID, payload) {
    return this[entryCacheSymbol].set(key, payload)
    .then((result) => {
      if (this[entryCacheMapSymbol].has(buildKey(modelTitle, entryID))) {
        const set = this[entryCacheMapSymbol].get(buildKey(modelTitle, entryID));
        set.add(key);
        this[entryCacheMapSymbol].set(buildKey(modelTitle, entryID), set);
      } else {
        this[entryCacheMapSymbol].set(buildKey(modelTitle, entryID), new Set([key]));
      }
      return result;
    })
  }

  getEntries(key) {
    return this[modelCacheSymbol].get(key)
    .then(result => result ? Object.assign({}, result) : undefined);
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
}

module.exports = Cache;
