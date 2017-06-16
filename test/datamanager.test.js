const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');

const expect = chai.expect;
chai.use(sinonChai);


const entryMock = sinon.spy((entryID, levels, fields) => Promise.resolve());
const entriesMock = sinon.spy((options) => Promise.resolve());
const modelMock = sinon.spy((title) => {
  return {
    entry: entryMock,
    entries: entriesMock,
  }
});
const dmMock = { model: modelMock };

describe('datamanager.js', () => {
  let dm;
  before(() => {
    dm = require('../lib/datamanager');
  });
  it('setDataManager', (done) => {
    dm.setDataManager('https://datamanager.entrecode.de/api/abcdef', 'token');
    done()
  });
  it('setDataManagerInstance', (done) => {
    dm.setDataManagerInstance(dmMock);
    done();
  });
  describe('dm access methods', () => {
    before(() => {
      dm.setDataManagerInstance(dmMock);
    });
    beforeEach(() => {
      entryMock.reset();
      entriesMock.reset();
    });
    it('getEntry', () => {
      return dm.getEntry('title', 'id', { fields: ['prop'], levels: 2 })
      .then(() => {
        expect(modelMock).to.have.been.calledWith('title');
        expect(entryMock).to.have.been.calledWith('id', 2, ['prop']);
      })
    });
    it('getEntries', () => {
      return dm.getEntries('title', { fields: ['prop1'] })
      .then(() => {
        expect(modelMock).to.have.been.calledWith('title');
        expect(entriesMock).to.have.been.calledWith({ fields: ['prop1']});
      })
    });
  })
  describe('findLinkedEntries', () => {
    // TODO
  });
});