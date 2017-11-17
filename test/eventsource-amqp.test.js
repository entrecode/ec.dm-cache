const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');

const expect = chai.expect;
chai.use(sinonChai);
const expectedDMID = 'abcdef01';

const queueMock = {};
const subscribedFullModels = new Set();
const subscribedEntries = new Set();
let eventListener;
const channelMock = {
  assertQueue: sinon.spy((name, options) => {
    if (name === '' && options.exclusive) {
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
    if (queue !== queueMock) {
      return Promise.reject(new Error('wrong queue given to bindQueue'));
    }
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
    } else {
      if (subscribedEntries.has(model + entry)) {
        return Promise.reject(new Error(`double entry subscribe: ${model}${entry}`));
      }
      subscribedEntries.add(model + entry);
    }
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
    } else {
      if (!subscribedEntries.has(model + entry)) {
        return Promise.reject(new Error(`entry not found for subscribe: ${model}${entry}`));
      }
      subscribedEntries.delete(model + entry);
    }
  },
  ack: sinon.spy(),
};

function simulateAMQPMessage(modelTitle, entryID, type) {
  const event = JSON.stringify({ modelTitle, entryID });
  const message = {
    content: Buffer.from(event, 'utf8'),
    properties: { type },
  };
  if ((subscribedFullModels.has(modelTitle) || subscribedEntries.has(modelTitle + entryID))
    && eventListener && typeof eventListener === 'function'
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
    channelMock.assertQueue.reset();
    channelMock.assertExchange.reset();
    channelMock.ack.reset();
    channelMock.consume.reset();
    eventSource.eventEmitter.removeAllListeners();
  });
  it('set nothing throws', (done) => {
    expect(() => eventSource.watchModel('test1')).to.throw('missing AMQP Channel and Queue');
    done();
  });
  it('setRabbitMQChannel', (done) => {
    eventSource.rabbitMQChannel = channelMock;
    expect(channelMock.assertQueue).to.have.been.calledOnce;
    setImmediate(() => {
      expect(channelMock.consume).to.have.been.calledOnce;
      done();
    });
  });
  describe('watchModel', () => {
    before(() => {
      eventSource.rabbitMQChannel = channelMock;
      eventSource.watchModel('test1');
    });
    it('event is fired and message ACKed', (done) => {
      eventSource.eventEmitter.once('entryUpdated', ({ type, modelTitle, entryID }) => {
        expect(type).to.eql('mytype');
        expect(modelTitle).to.eql('test1');
        expect(entryID).to.eql('myentry');
        setImmediate(() => {
          expect(channelMock.ack).to.have.been.called;
          expect(channelMock.ack).to.have.nested.property('args.0.0.properties.type', 'mytype');
          done();
        });
      });
      simulateAMQPMessage('test1', 'myentry', 'mytype');
    });
    it('event to other model is ignored', (done) => {
      eventSource.eventEmitter.once('entryUpdated', x => done(new Error(`event was fired: ${JSON.stringify(x)}`)));
      simulateAMQPMessage('test2', 'myentry', 'mytype');
      setTimeout(done, 1500);
    });
  });
  describe('watchEntry', () => {
    before(() => {
      eventSource.rabbitMQChannel = channelMock;
      eventSource.watchEntry('test3', 'watchedE');
    });
    it('event is fired and message ACKed', (done) => {
      eventSource.eventEmitter.once('entryUpdated', ({ type, modelTitle, entryID }) => {
        expect(type).to.eql('mytype');
        expect(modelTitle).to.eql('test3');
        expect(entryID).to.eql('watchedE');
        setImmediate(() => {
          expect(channelMock.ack).to.have.been.called;
          expect(channelMock.ack).to.have.nested.property('args.0.0.properties.type', 'mytype');
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
    it('duplicate watchEntry is ignored', (done) => {
      const modelsBefore = [...subscribedFullModels];
      const entriesBefore = [...subscribedEntries];
      eventSource.watchEntry('test3', 'watchedE');
      eventSource.watchEntry('test3', 'watchedE');
      expect([...subscribedEntries]).to.eql(entriesBefore);
      expect([...subscribedFullModels]).to.eql(modelsBefore);
      done();
    });
    it('watch another entry works', (done) => {
      const entriesBefore = [...subscribedEntries];
      eventSource.watchEntry('test3', 'watchedE');
      eventSource.watchEntry('test3', 'otherE');
      expect([...subscribedEntries]).to.eql(entriesBefore.concat(['test3otherE']));
      done();
    });
  });
  describe('watchEntry after watchModel', () => {
    before(() => {
      eventSource.rabbitMQChannel = channelMock;
      eventSource.watchModel('test1');
    });
    it('watchEntry is ignored, but works', (done) => {
      eventSource.watchEntry('test1', 'watchedE');
      eventSource.eventEmitter.once('entryUpdated', ({ type, modelTitle, entryID }) => {
        expect(type).to.eql('mytype');
        expect(modelTitle).to.eql('test1');
        expect(entryID).to.eql('watchedE');
        done();
      });
      expect(subscribedEntries.has('test1watchedE')).to.be.not.ok;
      simulateAMQPMessage('test1', 'watchedE', 'mytype');
    });
  });
  describe('watchModel after watchEntry', () => {
    before(() => {
      eventSource.rabbitMQChannel = channelMock;
      eventSource.watchEntry('test4', 'watchedE');
    });
    it('watchModel replaces watchEntry', (done) => {
      expect(subscribedEntries.has('test4watchedE')).to.be.ok;
      eventSource.watchModel('test4');
      eventSource.eventEmitter.once('entryUpdated', ({ type, modelTitle, entryID }) => {
        expect(type).to.eql('mytype');
        expect(modelTitle).to.eql('test4');
        expect(entryID).to.eql('watchedE');
        done();
      });
      expect(subscribedEntries.has('test4watchedE')).to.be.not.ok;
      simulateAMQPMessage('test4', 'watchedE', 'mytype');
    });
  });
});
