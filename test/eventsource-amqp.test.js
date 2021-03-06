const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

const { expect } = chai;
chai.use(sinonChai);
chai.use(chaiAsPromised);
const expectedDMID = 'abcdef01';

const queueMock = {};
const subscribedFullModels = new Set();
const subscribedEntries = new Set();
let eventListener;
const channelMock = {
  assertQueue: sinon.spy((name, options) => {
    if (name.startsWith('cache-') && options.exclusive) {
      return Promise.resolve({
        queue: queueMock,
      });
    }
    return Promise.reject(new Error('unallowed assertExchange parameters'));
  }),
  consume: sinon.spy((queue, fn) => {
    if (queue !== queueMock) {
      return Promise.reject(new Error('wrong queue given to consume'));
    }
    eventListener = fn;
  }),
  assertExchange: sinon.spy((name, type, options) => {
    if (name === 'publicAPI' && type === 'topic' && options.durable) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('unallowed assertExchange parameters'));
  }),
  bindQueue(queue, exchange, key) {
    if (exchange !== 'publicAPI') {
      return Promise.reject(new Error('wrong exchange name given to bindQueue'));
    }
    const [dm, model, entry] = key.split('.');
    if (dm !== expectedDMID) {
      return Promise.reject(new Error('wrong dm id in bindQueue key'));
    }
    if (entry === '#') {
      if (subscribedFullModels.has(model)) {
        return Promise.reject(new Error(`double model subscribe: ${model}`));
      }
      subscribedFullModels.add(model);
      return Promise.resolve();
    }

    if (subscribedEntries.has(model + entry)) {
      return Promise.reject(new Error(`double entry subscribe: ${model}${entry}`));
    }
    subscribedEntries.add(model + entry);
    return Promise.resolve();
  },
  unbindQueue(queue, exchange, key) {
    if (queue !== queueMock) {
      return Promise.reject(new Error('wrong queue given to unbindQueue'));
    }
    if (exchange !== 'publicAPI') {
      return Promise.reject(new Error('wrong exchange name given to unbindQueue'));
    }
    const [dm, model, entry] = key.split('.');
    if (dm !== expectedDMID) {
      return Promise.reject(new Error('wrong dm id in bindQueue key'));
    }
    if (entry === '#') {
      if (!subscribedFullModels.has(model)) {
        return Promise.reject(new Error(`model not found for unsubscribe: ${model}`));
      }
      subscribedFullModels.delete(model);
      return Promise.resolve();
    }

    if (!subscribedEntries.has(model + entry)) {
      return Promise.reject(new Error(`entry not found for subscribe: ${model}${entry}`));
    }
    subscribedEntries.delete(model + entry);
    return Promise.resolve();
  },
  on: sinon.spy(),
};
const channelWrapperMock = {
  addSetup: (callback) => {
    callback(channelMock);
    return Promise.resolve();
  },
  removeSetup: (_fkt, callback) => {
    callback(channelMock);
    return Promise.resolve();
  },
  ack: sinon.spy(),
  on: sinon.spy(),
};

function simulateAMQPMessage(modelTitle, entryID, type) {
  const event = JSON.stringify({ modelTitle, entryID });
  const message = {
    content: Buffer.from(event, 'utf8'),
    properties: { type },
  };
  if (
    (subscribedFullModels.has(modelTitle) || subscribedEntries.has(modelTitle + entryID)) &&
    eventListener &&
    typeof eventListener === 'function'
  ) {
    eventListener(message);
  } else {
    console.log(`did not publish amqp message ${type} ${modelTitle}/${entryID}`);
  }
}

const EventSourceAMQP = require('../lib/eventsource-amqp');

describe('eventsource-amqp.js', () => {
  let eventSource;
  before(() => {
    eventSource = new EventSourceAMQP({
      dataManagerShortID: expectedDMID,
    });
  });
  beforeEach(() => {
    channelMock.assertQueue.resetHistory();
    channelMock.assertExchange.resetHistory();
    channelMock.consume.resetHistory();
    channelWrapperMock.ack.resetHistory();
    eventSource.eventEmitter.removeAllListeners();
  });
  it('set nothing throws', () => {
    return expect(eventSource.watchModel('test1')).to.be.rejectedWith('missing AMQP Channel and Queue');
  });
  it('setRabbitMQChannel', (done) => {
    eventSource.rabbitMQChannel = channelWrapperMock;
    expect(channelMock.assertQueue).to.have.been.calledOnce;
    setImmediate(() => {
      expect(channelMock.consume).to.have.been.calledOnce;
      done();
    });
  });
  describe('watchModel', () => {
    before(() => {
      eventSource.rabbitMQChannel = channelWrapperMock;
      eventSource.watchModel('test1');
    });
    it('event is fired and message ACKed', (done) => {
      eventSource.eventEmitter.once('entryUpdated', ({ type, modelTitle, entryID }) => {
        expect(type).to.eql('mytype');
        expect(modelTitle).to.eql('test1');
        expect(entryID).to.eql('myentry');
        setImmediate(() => {
          expect(channelWrapperMock.ack).to.have.been.called;
          expect(channelWrapperMock.ack).to.have.nested.property('args.0.0.properties.type', 'mytype');
          done();
        });
      });
      simulateAMQPMessage('test1', 'myentry', 'mytype');
    });
    it('event to other model is ignored', (done) => {
      eventSource.eventEmitter.once('entryUpdated', (x) => done(new Error(`event was fired: ${JSON.stringify(x)}`)));
      simulateAMQPMessage('test2', 'myentry', 'mytype');
      setTimeout(done, 1500);
    });
  });
  describe('watchEntry', () => {
    before(async () => {
      eventSource.rabbitMQChannel = channelWrapperMock;
      await eventSource.watchEntry('test3', 'watchedE');
    });
    it('event is fired and message ACKed', (done) => {
      eventSource.eventEmitter.once('entryUpdated', ({ type, modelTitle, entryID }) => {
        expect(type).to.eql('mytype');
        expect(modelTitle).to.eql('test3');
        expect(entryID).to.eql('watchedE');
        setImmediate(() => {
          expect(channelWrapperMock.ack).to.have.been.called;
          expect(channelWrapperMock.ack).to.have.nested.property('args.0.0.properties.type', 'mytype');
          done();
        });
      });
      simulateAMQPMessage('test3', 'watchedE', 'mytype');
    });
    it('event to other model is ignored', (done) => {
      eventSource.eventEmitter.once('entryUpdated', () => done(new Error('event was fired')));
      simulateAMQPMessage('test2', 'watchedE', 'mytype');
      setTimeout(done, 1500);
    });
    it('event to other entry in model is ignored', (done) => {
      eventSource.eventEmitter.once('entryUpdated', () => done(new Error('event was fired')));
      simulateAMQPMessage('test3', 'notwatchedE', 'mytype');
      setTimeout(done, 1500);
    });
    it('duplicate watchEntry is ignored', async () => {
      const modelsBefore = [...subscribedFullModels];
      const entriesBefore = [...subscribedEntries];
      await eventSource.watchEntry('test3', 'watchedE');
      await eventSource.watchEntry('test3', 'watchedE');
      expect([...subscribedEntries]).to.eql(entriesBefore);
      expect([...subscribedFullModels]).to.eql(modelsBefore);
    });
    it('watch another entry works', async () => {
      const entriesBefore = [...subscribedEntries];
      await eventSource.watchEntry('test3', 'watchedE');
      await eventSource.watchEntry('test3', 'otherE');
      expect([...subscribedEntries]).to.eql(entriesBefore.concat(['test3otherE']));
    });
  });
  describe('watchEntry after watchModel', () => {
    before(() => {
      eventSource.rabbitMQChannel = channelWrapperMock;
      eventSource.watchModel('test1');
    });
    it('watchEntry is ignored, but works', async () => {
      await eventSource.watchEntry('test1', 'watchedE');
      expect(subscribedEntries.has('test1watchedE')).to.be.not.ok;
      await new Promise((resolve) => {
        eventSource.eventEmitter.once('entryUpdated', ({ type, modelTitle, entryID }) => {
          expect(type).to.eql('mytype');
          expect(modelTitle).to.eql('test1');
          expect(entryID).to.eql('watchedE');
          resolve();
        });
        simulateAMQPMessage('test1', 'watchedE', 'mytype');
      })
    });
  });
  describe('watchModel after watchEntry', () => {
    before(async () => {
      eventSource.rabbitMQChannel = channelWrapperMock;
      await eventSource.watchEntry('test4', 'watchedE');
    });
    it('watchModel replaces watchEntry', async () => {
      expect(subscribedEntries.has('test4watchedE')).to.be.ok;
      await eventSource.watchModel('test4');
      await new Promise((resolve) => {
        eventSource.eventEmitter.once('entryUpdated', ({ type, modelTitle, entryID }) => {
          // expect(subscribedEntries.has('test4watchedE')).to.be.not.ok;
          expect(type).to.eql('mytype');
          expect(modelTitle).to.eql('test4');
          expect(entryID).to.eql('watchedE');
          resolve();
        });
        simulateAMQPMessage('test4', 'watchedE', 'mytype');
      });
    });
  });
});
