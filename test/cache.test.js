const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const EventEmitter = require('events');

const expect = chai.expect;
chai.use(sinonChai);
const Cache = require('../lib/cache');

const eventEmitter = new EventEmitter();

describe('cache.js', () => {
  let cache;
  before(() => {
    cache = new Cache(eventEmitter);
  });

  it('put and get entry', () => {
    const key = 'myKey';
    const payload = { pay: 'load1' };

    return cache.putEntry(key, 'mymodel', 'myEntry', Object.assign({}, payload))
    .then(() => cache.getEntry(key))
    .then((result) => {
      expect(result).to.eql(payload);
    });
  });

  it('cache results are cloned', () => {
    const key = 'myKeyCloneTest';
    const payload = { pay: 'load1' };

    return cache.putEntry(key, 'mymodel', 'myEntry', Object.assign({}, payload))
    .then(() => cache.getEntry(key))
    .then((result) => {
      result.pay = 'load2';
      return cache.getEntry(key);
    })
    .then((result) => {
      expect(result).to.eql(payload);
      expect(result).to.have.property('pay', 'load1');
    });
  });

  it('deletedEntry get', () => {
    const key = 'myKey';
    const payload = { pay: 'load2' };

    return cache.putEntry(key, 'mymodel', 'myEntry', Object.assign({}, payload))
    .then(() => cache.getEntry(key))
    .then((result) => {
      expect(result).to.eql(payload);
      eventEmitter.emit('entryUpdated', {
        type: 'entryUpdated',
        modelTitle: 'mymodel',
        entryID: 'myEntry',
      });
      return cache.getEntry(key);
    })
    .then((result) => {
      expect(result).to.be.undefined;
    });
  });

  it('put and get entries', () => {
    const key = 'some filter';
    const payload = { pay: 'load1' };

    return cache.putEntries(key, 'mymodel', Object.assign({}, payload))
    .then(() => cache.getEntries(key))
    .then((result) => {
      expect(result).to.eql(payload);
    });
  });

  it('deletedEntries get', () => {
    const key = 'some filter';
    const payload = { pay: 'load2' };

    return cache.putEntries(key, 'mymodel', Object.assign({}, payload))
    .then(() => cache.getEntries(key))
    .then((result) => {
      expect(result).to.eql(payload);
      eventEmitter.emit('entryUpdated', {
        type: 'entryUpdated',
        modelTitle: 'mymodel',
        entryID: 'myEntry',
      });
      return cache.getEntries(key);
    })
    .then((result) => {
      expect(result).to.be.undefined;
    });
  });

  it('new entry triggers model cache purge', () => {
    const key = 'some filter';
    const payload = { pay: 'load3' };

    return cache.putEntries(key, 'mymodel', Object.assign({}, payload))
    .then(() => cache.getEntries(key))
    .then((result) => {
      expect(result).to.eql(payload);
      eventEmitter.emit('entryUpdated', {
        type: 'entryCreated',
        modelTitle: 'mymodel',
        entryID: 'myEntry',
      });
      return cache.getEntries(key);
    })
    .then((result) => {
      expect(result).to.be.undefined;
    });
  });

  it('re-setting of eventEmitter removes listener', (done) => {
    expect(eventEmitter.listenerCount('entryUpdated')).to.eql(1);
    const listener = eventEmitter.listeners('entryUpdated')[0];
    const newEmitter = new EventEmitter();
    cache.eventEmitter = newEmitter;
    expect(eventEmitter.listenerCount('entryUpdated')).to.eql(0);
    expect(newEmitter.listenerCount('entryUpdated')).to.eql(1);
    expect(newEmitter.listeners('entryUpdated')[0]).to.eql(listener);
    done();
  });

  it('stats method', () => cache.getStats()
  .then((stats) => {
    expect(stats).to.have.all.keys(['maxCacheSize', 'timeToLive', 'itemsInEntryCache', 'itemsInModelCache']);
    expect(stats).to.have.property('maxCacheSize', 1000);
  }));

  it('size and ttl can be set on creation', () => new Cache(eventEmitter, 500, 60).getStats()
  .then((stats) => {
    expect(stats).to.have.all.keys(['maxCacheSize', 'timeToLive', 'itemsInEntryCache', 'itemsInModelCache']);
    expect(stats).to.have.property('maxCacheSize', 500);
    expect(stats).to.have.property('timeToLive', 60);
  }));

  it('ttl can be set on creation to 0', () => new Cache(eventEmitter, null, 0).getStats()
  .then((stats) => {
    expect(stats).to.have.all.keys(['maxCacheSize', 'timeToLive', 'itemsInEntryCache', 'itemsInModelCache']);
    expect(stats).to.have.property('timeToLive', 0);
  }));
});
