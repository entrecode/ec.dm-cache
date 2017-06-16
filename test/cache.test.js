const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');

const expect = chai.expect;
chai.use(sinonChai);
const eventSource = require('../lib/eventsource-amqp');

const eventEmitter = eventSource.eventEmitter;

describe('cache.js', () => {
  let cache;
  before(() => {
    cache = require('../lib/cache');
  });

  it('put and get entry', () => {
    const key = 'myKey';
    const payload = { pay: 'load1' };

    return cache.putEntry(key, 'mymodel', 'myEntry', Object.assign({}, payload))
    .then(() => cache.getEntry(key))
    .then((result) => {
      expect(result).to.eql(payload);
    })
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
    })
  });

  it('put and get entries', () => {
    const key = 'some filter';
    const payload = { pay: 'load1' };

    return cache.putEntries(key, 'mymodel', Object.assign({}, payload))
    .then(() => cache.getEntries(key))
    .then((result) => {
      expect(result).to.eql(payload);
    })
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
    })
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
    })
  });
});