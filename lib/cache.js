const eventSource = require('./eventsource-amqp');

const cacheManager = require('cache-manager');

const entryCache = cacheManager.caching({
  store: 'memory',
  //max: 100,
  //ttl: config.memoryCacheTtl
});
const modelCache = cacheManager.caching({
  store: 'memory',
  //max: 100,
  //ttl: config.memoryCacheTtl
});

const modelCacheMap = new Map();
const entryCacheMap = new Map();

function buildKey(...args) {
  return [...args].join('|');
}

function deleteFromModelCache(modelTitle) {
  if (modelCacheMap.has(modelTitle)) {
    modelCacheMap.get(modelTitle).forEach(key => modelCache.del(key));
  }
  modelCacheMap.delete(modelTitle);
}

function deleteFromEntryCache(modelTitle, entryID) {
  if (entryCacheMap.has(buildKey(modelTitle, entryID))) {
    entryCacheMap.get(buildKey(modelTitle, entryID)).forEach(key => entryCache.del(key));
  }
  entryCacheMap.delete(buildKey(modelTitle, entryID));
}

eventSource.eventEmitter.on('entryUpdated', ({ type, modelTitle, entryID }) => {
  deleteFromModelCache(modelTitle);
  if (type !== 'entryCreated') {
    deleteFromEntryCache(modelTitle, entryID);
  }
});

function getEntry(key) {
  return entryCache.get(key);
}

function putEntry(key, modelTitle, entryID, payload) {
  return entryCache.set(key, payload)
  .then((result) => {
    if (entryCacheMap.has(buildKey(modelTitle, entryID))) {
      const set = entryCacheMap.get(buildKey(modelTitle, entryID));
      set.add(key);
      entryCacheMap.set(buildKey(modelTitle, entryID), set);
    } else {
      entryCacheMap.set(buildKey(modelTitle, entryID), new Set([key]));
    }
    return result;
  })
}

function getEntries(key) {
  return modelCache.get(key);
}

function putEntries(key, modelTitle, payload) {
  return modelCache.set(key, payload)
  .then((result) => {
    if (modelCacheMap.has(modelTitle)) {
      const set = modelCacheMap.get(modelTitle);
      set.add(key);
      modelCacheMap.set(modelTitle, set);
    } else {
      modelCacheMap.set(modelTitle, new Set([key]));
    }
    return result;
  });
}

module.exports = {
  getEntry,
  putEntry,
  getEntries,
  putEntries,
};
