# ec.dm-cache

Module for Node.js to cache data manager entries with live updating/invalidation using AMQP. By entrecode.

Basically, this module offers a function `getEntry(modelTitle, entryID)` which, well, gets an Entry, 
and `getEntries(modelTitle, options)` which gets an EntryList.
The difference to the default Data Manager SDK is that it uses an in-memory cache and AMQP (RabbitMQ) to invalidate that cache.
This way, you'll get maximum caching without stale data.

Note that model structure changes will not be reflected in the cache, as there are currently no events for that.

## How it works
There are two functions with two different caches: one for single entries (by ID), and one for entryList requests.
All SDK functions for those two are supported, including leveled requests and fields filtering. 
If an entry is updated/deleted, all cached calls will be deleted from the cache, as well as calls where
the changed entry was included in a leveled request or referenced as linked entry.
If any event is fired (including `entryCreated`), all cached calls to its model are deleted from the
cache, to prevent stale data when getting lists.

Each DMCache instance has its own cache, so you can use it in multiple projects / with multiple Data Managers
in parallel.

## Setup:
Add this line to your package.json dependencies: 

```js
    "ec.dm-cache": "git+ssh://git@stash.entrecode.de:7999/cms/ec.dm-cache.git#0.3.0",
```

(check the version number)
And `npm install` it.

## Usage:

```js
const DMCache = require('ec.dm-cache');
const amqp = require('amqp-connection-manager');
const DataManager = require('ec.datamanager');

// connect to Data Manager
const dataManager = new DataManager({
  url: `${config.dataManagerURL}/api/${config.dm.shortID}`,
});

// connect to RabbitMQ
const connectionManager = amqp.connect([config.amqp.url], { json: true });
connectionManager.on('connect', (c) => logger.info(' [*] connected to ' + c.url));
connectionManager.on('disconnect', () => logger.warn(' [!] disconnected (' + config.amqp.url + ')'));

// create RabbitMQ Channel
return new Promise((resolve, reject) => {
  connectionManager.createChannel({
    setup(channel) {
      return channel.assertExchange('publicAPI', 'topic', { durable: true })
      .then(() => {
        resolve(channel);
      })
      .catch(reject);
    },
  });
})
.then((rabbitMQChannel) => {
  // create DMCache instance
  const dmCache = new DMCache({
    dataManagerInstance: dataManager,
    rabbitMQChannel,
    cacheSize: 1000, // max items in cache
    appendSource: false, // set to true to append property 'dmCacheHitFrom' to each response
  });
  
  // get an entry
  return dmCache.getEntry('myModel', 'myEntryID')
  .then((entry) => {
      // you got your entry
  })
})
.catch(console.error);

```

## Full API Documentation

### `new DMCache(options)`
The constructor expects an option object with the following properties:

- `dataManagerInstance` set ready datamanager.js instance to use *(required)*
- *`sdkInstance` set ready ec.sdk instance to use instead of datamanger* **not implemented yet**
- `rabbitMQChannel` give a connected rabbitMQ channel connected to the publicAPI exchange *(required)*
- `appendSource` (Boolean) flag to show/hide the `dmCacheHitFrom' flag in responses *(Default: false)*
- `cacheSize` (Integer) max number of items to be hold in each cache *(Default: 1000)*
- `timeToLive` (Integer) seconds until items will not be returned anymore *(Default: not set)*

### `dmCache.getEntry(modelTitle, entryID[, fields, levels, transformFunction])`

Returns an entry (as Promise). Will load it from cache, if possible. Will cache it if loaded from Data Manager before.
You may optionally supply `fields` and `levels` properties (default is all fields, level 1).

*Deprecated `transformFunction` parameter:*
The optional `transformFunction` can be used to only cache and return a part of the entry. It may be synchronous or returning a Promise.

### `dmCache.getEntries(modelTitle[, options])`

Returns an entryList (as Promise). Will load it from cache, if possible. Will cache it if loaded from Data Manager before.
You may optionally supply an options object for filtering etc.

### `dmCache.getStats()`

Returns a status JSON (as Promise), including the settings for `cacheSize` and the current sizes
of the two caches.

### `dmCache.eventEmitter`

An event Emitter you can use to get notified on updates:

`dmCache.eventEmitter.on('entryUpdated', ({ type, model, entryID }) => {})`

`type` is one of `entryUpdated`, `entryDeleted`, `entryCreated`. `model` is the model title.
Note that this event is always called `entryUpdated`, look for the `type` property to get the
Data Manager event type. 

