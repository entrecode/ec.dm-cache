const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');


const expect = chai.expect;
chai.use(sinonChai);
const DMCache = require('../dm-cache');

let cache;
let datamanager;
let eventSource;
describe('dm-cache module', () => {
  let dmCache;
  before(() => {
    let fakeCache = new Map();

    dmCache = new DMCache({
      dataManagerInstance: { id: 'abcdefgh' },
      rabbitMQChannel: { assertQueue: () => Promise.reject() },
      appendSource: false,
    });
    Object.getOwnPropertySymbols(dmCache).forEach((symbol) => {
      if (symbol.toString() === 'Symbol(dataManager)') {
        datamanager = dmCache[symbol];
        sinon.stub(datamanager, 'getEntry', (modelTitle, entryID, options) => {
          if (modelTitle === 'testModel3' && entryID === 'entry0'
            && options.levels === 1 && !options.fields) {
            return Promise.resolve({ id: '3' });
          }
          if (modelTitle === 'testModel3' && entryID === 'entry3'
            && options.levels === 1 && !options.fields) {
            return Promise.resolve({ id: '7' });
          }
          if (modelTitle === 'testModel3' && entryID === 'entry1'
            && options.levels === 1 && options.fields.length === 1 && options.fields[0] === 'myfield') {
            return Promise.resolve({ id: '4' });
          }
          if (modelTitle === 'testModel3' && entryID === 'entry2'
            && options.levels === 2 && !options.fields) {
            return Promise.resolve({ id: '5' });
          }
          return Promise.reject(new Error('not found'));
        });
        sinon.stub(datamanager, 'getEntries', (modelTitle, options) => {
          switch (modelTitle) {
          case 'testModel1': {
            return Promise.resolve({ id: '1' });
          }
          case 'testModel2': {
            return Promise.resolve({ id: '2' });
          }
          case 'testModel4': {
            return Promise.resolve({ id: '6' });
          }
          default:
            return Promise.reject(new Error('not found'));
          }
        });
        sinon.stub(datamanager, 'findLinkedEntries', (result) => {
          if (result.id === '5') {
            return [['testModel2', 'entryx'], ['testModel3', 'entry0']];
          }
        });
      }
      if (symbol.toString() === 'Symbol(cache)') {
        cache = dmCache[symbol];
        sinon.stub(cache, 'getEntry', (key) => {
          if (fakeCache.has(key)) {
            return Promise.resolve(fakeCache.get(key));
          }
          return Promise.resolve();
        });
        sinon.stub(cache, 'getEntries', (key) => {
          if (fakeCache.has(key)) {
            return Promise.resolve(fakeCache.get(key));
          }
          return Promise.resolve();
        });
        sinon.stub(cache, 'putEntry', (key, modelTitle, entryID, payload) => {
          fakeCache.set(key, payload);
          return Promise.resolve();
        });
        sinon.stub(cache, 'putEntries', (key, modelTitle, payload) => {
          fakeCache.set(key, payload);
          return Promise.resolve();
        });
      }
      if (symbol.toString() === 'Symbol(eventSource)') {
        eventSource = dmCache[symbol];
        sinon.stub(eventSource, 'watchEntry', (modelTitle, entryID) => {

        });
        sinon.stub(eventSource, 'watchModel', (modelTitle) => {
        })
      }
    })
  });
  after(() => {
    cache.getEntry.restore();
    cache.getEntries.restore();
    cache.putEntry.restore();
    cache.putEntries.restore();
    datamanager.getEntry.restore();
    datamanager.getEntries.restore();
    eventSource.watchEntry.restore();
    eventSource.watchModel.restore();
  });
  beforeEach(() => {
    dmCache.appendSource = false;
    cache.getEntry.reset();
    cache.getEntries.reset();
    cache.putEntry.reset();
    cache.putEntries.reset();
    datamanager.getEntry.reset();
    datamanager.getEntries.reset();
    eventSource.watchEntry.reset();
    eventSource.watchModel.reset();
  });
  describe('getEntries', () => {
    it('returns from datamanager and watches model', () => {
      return dmCache.getEntries('testModel1')
      .then((result) => {
        expect(result.id).to.eql('1');
        expect(cache.getEntries).to.have.been.calledWith('testModel1|');
        expect(cache.putEntries).to.have.been.calledWith('testModel1|', 'testModel1', { id: '1' });
        expect(eventSource.watchModel).to.have.been.calledWith('testModel1');
      })
    });
    it('appendSource (returns from datamanager)', () => {
      dmCache.appendSource = true;
      return dmCache.getEntries('testModel4')
      .then((result) => {
        expect(result.id).to.eql('6');
        expect(result).to.have.property('dmCacheHitFrom', 'source');
      })
    });
    it('returns from cache and does nothing else', () => {
      return dmCache.getEntries('testModel2', { size: 1 })
      .then((result) => {
        expect(result.id).to.eql('2');
        datamanager.getEntries.reset();
        cache.putEntries.reset();
        eventSource.watchModel.reset();
        return dmCache.getEntries('testModel2', { size: 1 });
      })
      .then((result) => {
        expect(result.id).to.eql('2');
        expect(cache.getEntries).to.have.been.calledWith('testModel2|{"size":1}');
        expect(cache.putEntries).to.have.not.been.called;
        expect(datamanager.getEntries).to.have.not.been.called;
        expect(eventSource.watchModel).to.have.not.been.called;
      })
    });
    it('appendSource (returns from cache)', () => {
      return dmCache.getEntries('testModel2', { size: 1 })
      .then((result) => {
        expect(result.id).to.eql('2');
        dmCache.appendSource = true;
        return dmCache.getEntries('testModel2', { size: 1 });
      })
      .then((result) => {
        expect(result.id).to.eql('2');
        expect(result).to.have.property('dmCacheHitFrom', 'cache');
      })
    });
    it('fails early if missing model title', () => {
      return dmCache.getEntries()
      .then(
        () => Promise.reject(new Error('did not throw')),
        (error) => {
          expect(error.message).to.eql('modelTitle \'undefined\' given to dmCache.getEntries is invalid!');
          return Promise.resolve();
        }
      )
      .then(() => {
        expect(cache.getEntries).to.have.not.been.called;
      });
    });
  });

  describe('getEntry', () => {
    it('returns from datamanager and watches entry', () => {
      return dmCache.getEntry('testModel3', 'entry0')
      .then((result) => {
        expect(result.id).to.eql('3');
        expect(cache.getEntry).to.have.been.calledWith('testModel3|entry0');
        expect(cache.putEntry).to.have.been
        .calledWith('testModel3|entry0', 'testModel3', 'entry0', { id: '3' });
        expect(eventSource.watchEntry).to.have.been.calledWith('testModel3', 'entry0');
      });
    });
    it('appendSource (returns from datamanager)', () => {
      dmCache.appendSource = true;
      return dmCache.getEntry('testModel3', 'entry3')
      .then((result) => {
        expect(result.id).to.eql('7');
        expect(result).to.have.property('dmCacheHitFrom', 'source');
      });
    });
    it('returns from cache and does nothing else', () => {
      return dmCache.getEntry('testModel3', 'entry1', ['myfield'])
      .then((result) => {
        expect(result.id).to.eql('4');
        expect(cache.getEntry).to.have.been.calledWith('testModel3|entry1|["myfield"]');
        expect(cache.putEntry).to.have.been
        .calledWith('testModel3|entry1|["myfield"]', 'testModel3', 'entry1', { id: '4' });
        expect(eventSource.watchEntry).to.have.been.calledWith('testModel3', 'entry1');
        datamanager.getEntry.reset();
        cache.putEntry.reset();
        eventSource.watchEntry.reset();
        return dmCache.getEntry('testModel3', 'entry1', ['myfield']);
      })
      .then((result) => {
        expect(result.id).to.eql('4');
        expect(datamanager.getEntry).to.have.not.been.called;
        expect(cache.putEntry).to.have.not.been.called;
        expect(eventSource.watchEntry).to.have.not.been.called;
      });
    });
    it('appendSource (returns from cache)', () => {
      return dmCache.getEntry('testModel3', 'entry1', ['myfield'])
      .then((result) => {
        expect(result.id).to.eql('4');
        dmCache.appendSource = true;
        return dmCache.getEntry('testModel3', 'entry1', ['myfield']);
      })
      .then((result) => {
        expect(result.id).to.eql('4');
        expect(result).to.have.property('dmCacheHitFrom', 'cache');
      });
    });
    it('leveled request watches all linked entries', () => {
      return dmCache.getEntry('testModel3', 'entry2', null, 2)
      .then((result) => {
        expect(result.id).to.eql('5');
        expect(cache.getEntry).to.have.been.calledWith('testModel3|entry2|2');
        expect(cache.putEntry).to.have.been
        .calledWith('testModel3|entry2|2', 'testModel3', 'entry2', { id: '5' });
        expect(eventSource.watchEntry).to.have.been.calledWith('testModel3', 'entry2');
        expect(eventSource.watchEntry).to.have.been.calledWith('testModel2', 'entryx');
        expect(eventSource.watchEntry).to.have.been.calledWith('testModel3', 'entry0');
      });
    });
    it('transform function works', () => {
      return dmCache.getEntry('testModel3', 'entry0', null, 1, (x) => x.id)
      .then((result) => {
        expect(result).to.eql('3');
      });
    });

    it('fails early if missing model title', () => {
      return dmCache.getEntry()
      .then(
        () => Promise.reject(new Error('did not throw')),
        (error) => {
          expect(error.message).to.eql('modelTitle \'undefined\' given to dmCache.getEntry is invalid!');
          return Promise.resolve();
        }
      )
      .then(() => {
        expect(cache.getEntries).to.have.not.been.called;
      });
    });
    it('fails early if missing entryID', () => {
      return dmCache.getEntry('testModel3')
      .then(
        () => Promise.reject(new Error('did not throw')),
        (error) => {
          expect(error.message).to.eql('entryID \'undefined\' given to dmCache.getEntry is invalid!');
          return Promise.resolve();
        }
      )
      .then(() => {
        expect(cache.getEntries).to.have.not.been.called;
      });
    });
    it('fails early if transform function no function', () => {
      return dmCache.getEntry('testModel3', 'entry0', [], 1, true)
      .then(
        () => Promise.reject(new Error('did not throw')),
        (error) => {
          expect(error.message).to.eql('transformFunction given to dmCache.getEntry is invalid!');
          return Promise.resolve();
        }
      )
      .then(() => {
        expect(cache.getEntries).to.have.not.been.called;
      });
    });
  });

  describe('assetHelper', () => {
    it('not implemented', () => {
      return dmCache.assetHelper()
      .then(() => {
        throw new Error('unexpectedly resolved');
      })
      .catch((err) => {
        expect(err).to.be.equal('not implemented');
      })
    });
  });
  
  describe('constructor tests', () => {
    it('fail if missing rabbitmq', (done) => {
      expect(() => new DMCache({})).to.throw('missing `rabbitMQChannel`');
      done();
    });
    it('fail if missing dm instance', (done) => {
      expect(() => new DMCache({
        rabbitMQChannel: true
      })).to.throw('missing either `dataManagerInstance` or `sdkInstance`');
      done();
    });
    it('fail if SDK instance', (done) => {
      expect(() => new DMCache({
        rabbitMQChannel: true,
        sdkInstance: true
      })).to.throw('ec.sdk is not yet supported');
      done();
    });
    it('appendSource can be set directly', (done) => {
      expect(new DMCache({
        rabbitMQChannel: { assertQueue: () => Promise.reject() },
        dataManagerInstance: true,
        appendSource: true,
      }).appendSource).to.eql(true);
      done();
    });
  });

  it('stats method', () => {
    return dmCache.getStats()
    .then((stats) => {
      expect(stats).to.have.all.keys(['maxCacheSize', 'timeToLive', 'itemsInEntryCache', 'itemsInModelCache']);
      expect(stats).to.have.property('maxCacheSize', 1000);
    });
  });
});
