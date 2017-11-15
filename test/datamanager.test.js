const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');

const expect = chai.expect;
chai.use(sinonChai);

const entryMock = sinon.spy((entryID, levels, fields) => Promise.resolve());
const entriesMock = sinon.spy(options => Promise.resolve());
const modelMock = sinon.spy(title => ({
  entry: entryMock,
  entryList: entriesMock,
}));
const dmMock = { model: modelMock, id: '76de6263' };

const DataManagerWrapper = require('../lib/datamanager');

describe('datamanager.js', () => {
  let dm;
  before(() => {
    dm = new DataManagerWrapper(dmMock);
  });
  describe('dm access methods', () => {
    before(() => {
      dm.dataManagerInstance = dmMock;
    });
    beforeEach(() => {
      entryMock.reset();
      entriesMock.reset();
    });
    it('getEntry', () => dm.getEntry('title', 'id', { fields: ['prop'], levels: 2 })
    .then(() => {
      expect(modelMock).to.have.been.calledWith('title');
      expect(entryMock).to.have.been.calledWith('id', 2, ['prop']);
    }));
    it('getEntries', () => dm.getEntries('title', { fields: ['prop1'] })
    .then(() => {
      expect(modelMock).to.have.been.calledWith('title');
      expect(entriesMock).to.have.been.calledWith({ fields: ['prop1'] });
    }));
  });
  describe('findLinkedEntries', () => {
    it('works', (done) => {
      const entry = {
        _id: 'ryHl9w70vzb',
        _created: '2017-06-09T07:50:57.986Z',
        _creator: '9ec732ab-5b37-41d1-8489-feac07a28b59',
        _modified: '2017-06-09T14:33:53.703Z',
        id: 'ryHl9w70vzb',
        created: '2017-06-09T07:50:57.986Z',
        modified: '2017-06-09T14:33:53.703Z',
        private: false,
        pages: [
          'HJNcDXAPMZ',
          'ByB9PmRDGb',
          'SyqqD7CvMW',
          'BypcD7RwGW',
        ],
        template_card: 'VkeJB2m6Gx',
        preview: null,
        format_template: 'EyJey-Fle',
        status: null,
        owner: '185df4e4-e369-44dd-8dbe-6bd53451caf1',
        product: null,
        _links: {
          collection: {
            profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_card',
            href: 'https://datamanager.entrecode.de/api/76de6263/user_card',
          },
          self: {
            profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_card',
            href: 'https://datamanager.entrecode.de/api/76de6263/user_card?_id=ryHl9w70vzb',
          },
          '76de6263:user_card/creator': {
            href: 'https://datamanager.entrecode.de/account?dataManagerID=d2be7360-3baf-47b4-977a-8b4208b5ddf5&accountID=9ec732ab-5b37-41d1-8489-feac07a28b59',
            title: '9ec732ab-5b37-41d1-8489-feac07a28b59',
            profile: 'https://entrecode.de/schema/dm-account',
          },
          '76de6263:user_card/_creator': {
            href: 'https://datamanager.entrecode.de/account?dataManagerID=d2be7360-3baf-47b4-977a-8b4208b5ddf5&accountID=9ec732ab-5b37-41d1-8489-feac07a28b59',
            title: '9ec732ab-5b37-41d1-8489-feac07a28b59',
            profile: 'https://entrecode.de/schema/dm-account',
          },
          'ec:model': {
            profile: 'https://entrecode.de/schema/model',
            href: 'https://datamanager.entrecode.de/model?modelID=5dac6670-0f66-4479-ba69-6f2375c0e743',
          },
          '76de6263:user_card/owner': {
            profile: 'https://entrecode.de/schema/dm-account',
            href: 'https://datamanager.entrecode.de/accounts?dataManagerID=d2be7360-3baf-47b4-977a-8b4208b5ddf5&accountID=185df4e4-e369-44dd-8dbe-6bd53451caf1',
            title: null,
          },
          '76de6263:user_card/pages': [
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=HJNcDXAPMZ',
              name: 'user_page',
              title: 'HJNcDXAPMZ',
            },
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=ByB9PmRDGb',
              name: 'user_page',
              title: 'ByB9PmRDGb',
            },
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=SyqqD7CvMW',
              name: 'user_page',
              title: 'SyqqD7CvMW',
            },
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=BypcD7RwGW',
              name: 'user_page',
              title: 'BypcD7RwGW',
            },
          ],
          '76de6263:user_card/template_card': {
            profile: 'https://datamanager.entrecode.de/api/schema/76de6263/card',
            href: 'https://datamanager.entrecode.de/api/76de6263/card?id=VkeJB2m6Gx',
            name: 'card',
            title: 'DIN lang folded',
          },
        },
        _modelTitleField: '_id',
        _modelTitle: 'user_card',
        _entryTitle: 'ryHl9w70vzb',
      };
      expect(dm.findLinkedEntries(entry)).to.deep.eql([
        ['user_page', 'HJNcDXAPMZ'],
        ['user_page', 'ByB9PmRDGb'],
        ['user_page', 'SyqqD7CvMW'],
        ['user_page', 'BypcD7RwGW'],
        ['card', 'VkeJB2m6Gx'],
      ]);
      done();
    });
    it('works if "value" in entry', (done) => {
      const entry = {
        value: {
          _id: 'ryHl9w70vzb',
          _created: '2017-06-09T07:50:57.986Z',
          _creator: '9ec732ab-5b37-41d1-8489-feac07a28b59',
          _modified: '2017-06-09T14:33:53.703Z',
          id: 'ryHl9w70vzb',
          created: '2017-06-09T07:50:57.986Z',
          modified: '2017-06-09T14:33:53.703Z',
          private: false,
          pages: [
            'HJNcDXAPMZ',
            'ByB9PmRDGb',
            'SyqqD7CvMW',
            'BypcD7RwGW',
          ],
          template_card: 'VkeJB2m6Gx',
          preview: null,
          format_template: 'EyJey-Fle',
          status: null,
          owner: '185df4e4-e369-44dd-8dbe-6bd53451caf1',
          product: null,
          _links: {
            collection: {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_card',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_card',
            },
            self: {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_card',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_card?_id=ryHl9w70vzb',
            },
            '76de6263:user_card/creator': {
              href: 'https://datamanager.entrecode.de/account?dataManagerID=d2be7360-3baf-47b4-977a-8b4208b5ddf5&accountID=9ec732ab-5b37-41d1-8489-feac07a28b59',
              title: '9ec732ab-5b37-41d1-8489-feac07a28b59',
              profile: 'https://entrecode.de/schema/dm-account',
            },
            '76de6263:user_card/_creator': {
              href: 'https://datamanager.entrecode.de/account?dataManagerID=d2be7360-3baf-47b4-977a-8b4208b5ddf5&accountID=9ec732ab-5b37-41d1-8489-feac07a28b59',
              title: '9ec732ab-5b37-41d1-8489-feac07a28b59',
              profile: 'https://entrecode.de/schema/dm-account',
            },
            'ec:model': {
              profile: 'https://entrecode.de/schema/model',
              href: 'https://datamanager.entrecode.de/model?modelID=5dac6670-0f66-4479-ba69-6f2375c0e743',
            },
            '76de6263:user_card/owner': {
              profile: 'https://entrecode.de/schema/dm-account',
              href: 'https://datamanager.entrecode.de/accounts?dataManagerID=d2be7360-3baf-47b4-977a-8b4208b5ddf5&accountID=185df4e4-e369-44dd-8dbe-6bd53451caf1',
              title: null,
            },
            '76de6263:user_card/pages': [
              {
                profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
                href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=HJNcDXAPMZ',
                name: 'user_page',
                title: 'HJNcDXAPMZ',
              },
              {
                profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
                href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=ByB9PmRDGb',
                name: 'user_page',
                title: 'ByB9PmRDGb',
              },
              {
                profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
                href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=SyqqD7CvMW',
                name: 'user_page',
                title: 'SyqqD7CvMW',
              },
              {
                profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
                href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=BypcD7RwGW',
                name: 'user_page',
                title: 'BypcD7RwGW',
              },
            ],
            '76de6263:user_card/template_card': {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/card',
              href: 'https://datamanager.entrecode.de/api/76de6263/card?id=VkeJB2m6Gx',
              name: 'card',
              title: 'DIN lang folded',
            },
          },
          _modelTitleField: '_id',
          _modelTitle: 'user_card',
          _entryTitle: 'ryHl9w70vzb',
        },
      };
      expect(dm.findLinkedEntries(entry)).to.deep.eql([
        ['user_page', 'HJNcDXAPMZ'],
        ['user_page', 'ByB9PmRDGb'],
        ['user_page', 'SyqqD7CvMW'],
        ['user_page', 'BypcD7RwGW'],
        ['card', 'VkeJB2m6Gx'],
      ]);
      done();
    });
  });
});
