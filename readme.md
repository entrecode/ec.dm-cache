# ec.dm-cache

Module for Node.js to cache data manager entries with live updating/invalidation using AMQP. By entrecode.

Basically, this module offers a function `getEntry(modelTitle, entryID)` which, well, gets an entry. 
The difference to the default Data Manager SDK is that it uses an in-memory cache and AMQP (RabbitMQ) to invalidate that cache.
This way, you'll get maximum caching without stale data.

## Setup:
Add this line to your package.json dependencies: 

```js
    "ec.dm-cache": "git+ssh://git@stash.entrecode.de:7999/cms/ec.dm-cache.git#0.1.0",
```

(check the version number)
And `npm install` it.

## Usage:

```js
const dmCache = require('ec.dm-cache');
const amqp = require('amqp-connection-manager');
const DataManager = require('ec.datamanager');

// connect to RabbitMQ
const connectionManager = amqp.connect([config.amqp.url], { json: true });
connectionManager.on('connect', (c) => logger.info(' [*] connected to ' + c.url));
connectionManager.on('disconnect', () => logger.warn(' [!] disconnected (' + config.amqp.url + ')'));
dmCache.setRabbitMQConnection(connectionManager);

// connect to Data Manager
const dataManager = new DataManager({
  url: `${config.dataManagerURL}/api/${config.dm.shortID}`,
});
dmCache.setDataManagerInstance(dataManager);

dmCache.getEntry('myModel', 'myEntryID')
.then((entry) => {
    // you got your entry
})
.catch(console.error);

```

## Full API Documentation

### `dmCache.setDataManager(dataManagerURL[, accessToken])`

Allows setting a data Manager without having an own SDK instance.

### `dmCache.setDataManagerInstance(sdkInstance)`

Give a ready SDK instance to use

### `dmCache.setRabbitMQConnection(connection)`

Expects an AMQP connection like that from `amqp-connection-manager`. The module will create an own channel with it.
If you want to re-use an existing channel, use `dmCache.setRabbitMQChannel(channel)`.

### `dmCache.setRabbitMQChannel(channel)`

Expects an AMQP channel like that from `amqp-connection-manager`. If you don't have a channel, use `dmCache.setRabbitMQConnection(connection)`.

### `dmCache.getEntry(modelTitle, entryID[, transformFunction])`

Returns an entry. Will load it from cache, if possible. Will cache it if loaded from Data Manager.
The optional `transformFunction` can be used to only cache and return a part of the entry. Note that this transform function should be the same for each call to a specific model. It may be synchronous or returning a Promise.
The entry will only ever contain the values (not an SDK Entry object).

Note that model structure changes will not be reflected in the cache, as there are currently no events for that.

### `dmCache.eventEmitter`

An event Emitter you can use to get notified on updates.
Emitted events:

#### event `updatedCache`, `{ type, model, entryID}`
`type` is one of `entryUpdated`, `entryDeleted`. `model` is the model title.

