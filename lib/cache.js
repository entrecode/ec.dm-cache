const eventSource = require('./eventsource-amqp');

const cacheManager = require('cache-manager');

const entryCache = cacheManager.caching({
  store: 'memory',
  max: 100,
  ttl: config.memoryCacheTtl
});
const modelCache = cacheManager.caching({
  store: 'memory',
  max: 100,
  ttl: config.memoryCacheTtl
});

const modelCacheMap = new Map();
const entryCacheMap = new Map();



function deleteFromModelCache(modelTitle) {
  modelCacheMap.get(modelTitle).forEach(key => modelCache.delete(key));
}

function deleteFromEntryCache(modelTitle, entryID) {
  entryCacheMap.get({modelTitle, entryID}).forEach(key => entryCache.delete(key));
}

eventSource.eventEmitter.on('entryUpdated', ({ type, modelTitle, entryID }) => {
  deleteFromModelCache(modelTitle);
  if (type !== 'entryCreated') {
    deleteFromEntryCache(modelTitle, entryID);
  }
});


function getEntry(key) {
  entryCache.get(key);
}

function putEntry(key, modelTitle, entryID, payload) {
  entryCache.set(key, payload);
  entryCacheMap.put({modelTitle, entryID}, key);
}

function getEntries(key) {
  modelCache.get(key);
}

function putEntries(key, modelTitle, payload) {
  modelCache.set(key, payload);
  modelCacheMap.put(modelTitle, key);
}

module.exports = {
  getEntry,
  putEntry,
  getEntries,
  putEntries,
};
