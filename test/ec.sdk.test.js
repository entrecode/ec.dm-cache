const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');

const SDKWrapper = require('../lib/ec.sdk');

const expect = chai.expect;
chai.use(sinonChai);

const sdkMock = {
  shortID: '76de6263',
  entry: sinon.spy((model, entryID, options) => Promise.resolve()),
  entryList: sinon.spy((model, options) => Promise.resolve()),
};

describe('ec.sdk.js', () => {
  let sdk;
  before(() => {
    sdk = new SDKWrapper(sdkMock);
  });
  beforeEach(() => {
    sdkMock.entry.resetHistory();
    sdkMock.entryList.resetHistory();
  });
  it('getEntry', () =>
    sdk.getEntry('title', 'id', { fields: ['prop'], levels: 2 }).then(() => {
      expect(sdkMock.entry).to.have.been.calledWith('title', 'id', {
        _levels: 2,
        _fields: ['prop'],
      });
    }));
  it('getEntry, without options', () =>
    sdk.getEntry('title', 'id').then(() => {
      expect(sdkMock.entry).to.have.been.calledWith('title', 'id');
    }));
  it('getEntries', () =>
    sdk.getEntries('title', { _fields: ['prop1'] }).then(() => {
      expect(sdkMock.entryList).to.have.been.calledWith('title', { _fields: ['prop1'] });
    }));

  describe('findLinkedEntries', () => {
    it('works', (done) => {
      const entry = {
        _links: {
          collection: [
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_card',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_card',
              templated: false,
            },
          ],
          self: [
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_card',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_card?_id=ryHl9w70vzb',
              templated: false,
            },
          ],
          '76de6263:user_card/creator': [
            {
              href: 'https://datamanager.entrecode.de/account?dataManagerID=d2be7360-3baf-47b4-977a-8b4208b5ddf5&accountID=9ec732ab-5b37-41d1-8489-feac07a28b59',
              title: '9ec732ab-5b37-41d1-8489-feac07a28b59',
              profile: 'https://entrecode.de/schema/dm-account',
              templated: false,
            },
          ],
          '76de6263:user_card/_creator': [
            {
              href: 'https://datamanager.entrecode.de/account?dataManagerID=d2be7360-3baf-47b4-977a-8b4208b5ddf5&accountID=9ec732ab-5b37-41d1-8489-feac07a28b59',
              title: '9ec732ab-5b37-41d1-8489-feac07a28b59',
              profile: 'https://entrecode.de/schema/dm-account',
              templated: false,
            },
          ],
          'ec:model': [
            {
              profile: 'https://entrecode.de/schema/model',
              href: 'https://datamanager.entrecode.de/model?modelID=5dac6670-0f66-4479-ba69-6f2375c0e743',
              templated: false,
            },
          ],
          '76de6263:user_card/owner': [
            {
              profile: 'https://entrecode.de/schema/dm-account',
              href: 'https://datamanager.entrecode.de/accounts?dataManagerID=d2be7360-3baf-47b4-977a-8b4208b5ddf5&accountID=185df4e4-e369-44dd-8dbe-6bd53451caf1',
              title: null,
              templated: false,
            },
          ],
          '76de6263:user_card/pages': [
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=HJNcDXAPMZ',
              name: 'user_page',
              title: 'HJNcDXAPMZ',
              templated: false,
            },
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=ByB9PmRDGb',
              name: 'user_page',
              title: 'ByB9PmRDGb',
              templated: false,
            },
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=SyqqD7CvMW',
              name: 'user_page',
              title: 'SyqqD7CvMW',
              templated: false,
            },
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/user_page',
              href: 'https://datamanager.entrecode.de/api/76de6263/user_page?id=BypcD7RwGW',
              name: 'user_page',
              title: 'BypcD7RwGW',
              templated: false,
            },
          ],
          '76de6263:user_card/template_card': [
            {
              profile: 'https://datamanager.entrecode.de/api/schema/76de6263/card',
              href: 'https://datamanager.entrecode.de/api/76de6263/card?id=VkeJB2m6Gx',
              name: 'card',
              title: 'DIN lang folded',
              templated: false,
            },
          ],
        },
        _curiesMap: {},
        _curies: [],
        _resolvedCuriesMap: {},
        _embedded: {},
        _validation: [],
        _id: 'ryHl9w70vzb',
        _created: '2017-06-09T07:50:57.986Z',
        _creator: '9ec732ab-5b37-41d1-8489-feac07a28b59',
        _modified: '2017-06-09T14:33:53.703Z',
        id: 'ryHl9w70vzb',
        created: '2017-06-09T07:50:57.986Z',
        modified: '2017-06-09T14:33:53.703Z',
        private: false,
        pages: ['HJNcDXAPMZ', 'ByB9PmRDGb', 'SyqqD7CvMW', 'BypcD7RwGW'],
        template_card: 'VkeJB2m6Gx',
        preview: null,
        format_template: 'EyJey-Fle',
        status: null,
        owner: '185df4e4-e369-44dd-8dbe-6bd53451caf1',
        product: null,
        _modelTitleField: '_id',
        _modelTitle: 'user_card',
        _entryTitle: 'ryHl9w70vzb',
      };
      entry.allLinks = function allLinks() {
        return this._links;
      }.bind(entry);
      entry.getLinks = function getLinks(name) {
        return this._links[name];
      }.bind(entry);
      expect(sdk.findLinkedEntries(entry)).to.deep.equal([
        ['user_page', 'HJNcDXAPMZ'],
        ['user_page', 'ByB9PmRDGb'],
        ['user_page', 'SyqqD7CvMW'],
        ['user_page', 'BypcD7RwGW'],
        ['card', 'VkeJB2m6Gx'],
      ]);
      done();
    });
    it('works with levels', (done) => {
      const entry = {
        _id: 'LnbjySf1rw',
        _created: '2023-12-08T11:26:58.774Z',
        _creator: null,
        _modified: '2023-12-08T11:27:12.977Z',
        id: 'LnbjySf1rw',
        created: '2023-12-08T11:26:58.774Z',
        modified: '2023-12-08T11:27:12.977Z',
        private: false,
        title: '6YearsOfBugs',
        clubID: '',
        backendId: null,
        random: false,
        autoplay: false,
        terminal: false,
        background: null,
        slides: [
          {
            _id: 'Ro2gFsfMuv',
            _created: '2023-12-08T11:27:12.635Z',
            _creator: null,
            _modified: '2023-12-08T11:47:03.408Z',
            id: 'Ro2gFsfMuv',
            created: '2023-12-08T11:27:12.635Z',
            modified: '2023-12-08T11:47:03.408Z',
            private: false,
            title: 'ohohoh',
            backendId: null,
            type: 'slide_image',
            weight: 1,
            time: 2500,
            content: {
              _id: 'D6_p7VRxLh',
              _created: '2023-12-08T11:27:12.376Z',
              _creator: null,
              _modified: '2023-12-08T11:47:03.139Z',
              id: 'D6_p7VRxLh',
              created: '2023-12-08T11:27:12.376Z',
              modified: '2023-12-08T11:47:03.139Z',
              private: false,
              image: 'RbPK-NDhS2q_BNUNgKenwA',
              backendId: null,
              image_portrait: null,
              _links: {
                collection: {
                  profile: 'https://datamanager.cachena.entrecode.de/api/schema/fb5dbaab/slide_image',
                  href: 'https://datamanager.cachena.entrecode.de/api/fb5dbaab/slide_image',
                },
                self: {
                  profile: 'https://datamanager.cachena.entrecode.de/api/schema/fb5dbaab/slide_image',
                  href: 'https://datamanager.cachena.entrecode.de/api/fb5dbaab/slide_image?_id=D6_p7VRxLh&_levels=1',
                },
                'ec:model': {
                  profile: 'https://schema.cachena.entrecode.de/schema-data/model',
                  href: 'https://datamanager.cachena.entrecode.de/model?dataManagerID=eb8f8709-25de-45a4-826d-8676b761fe70&modelID=def0ac1b-7889-40e6-a265-f8d58832568a',
                },
                'ec:entry/dm-entryHistory': {
                  href: 'https://dm-history.cachena.entrecode.de/entryhistory?dataManagerID=eb8f8709-25de-45a4-826d-8676b761fe70&modelID=def0ac1b-7889-40e6-a265-f8d58832568a&entryID=D6_p7VRxLh{&_size,_fromEventNumber}',
                  templated: true,
                },
                'ec:entry/history': {
                  href: 'https://dm-history.cachena.entrecode.de/entries?dataManagerID=eb8f8709-25de-45a4-826d-8676b761fe70&modelID=def0ac1b-7889-40e6-a265-f8d58832568a&entryID=D6_p7VRxLh{&size,fromEventNumber,fromDate,toDate}',
                  templated: true,
                },
                'fb5dbaab:slide_image/image': {
                  profile: 'https://schema.cachena.entrecode.de/schema-data/dm-asset',
                  title: 'jeremy-thomas-O6N9RV2rzX8-unsplash',
                  href: 'https://datamanager.cachena.entrecode.de/a/fb5dbaab/hec-info-images/RbPK-NDhS2q_BNUNgKenwA',
                },
              },
              _embedded: {
                'fb5dbaab:slide_image/image/asset': {
                  assetID: 'RbPK-NDhS2q_BNUNgKenwA',
                  title: 'jeremy-thomas-O6N9RV2rzX8-unsplash',
                  caption: '',
                  type: 'image',
                  mimetype: 'image/jpeg',
                  file: {
                    url: 'https://cdn1.cachena.entrecode.de/fb5dbaab/hec-info-images/RbPK-NDhS2q_BNUNgKenwA/jeremy-thomas-O6N9RV2rzX8-unsplash.jpg',
                    size: 3512908,
                    resolution: { width: 5184, height: 3456 },
                  },
                  fileVariants: [
                    {
                      url: 'https://cdn1.cachena.entrecode.de/fb5dbaab/hec-info-images/RbPK-NDhS2q_BNUNgKenwA/jeremy-thomas-O6N9RV2rzX8-unsplash_800.jpg',
                      size: 102022,
                      resolution: { width: 800, height: 533 },
                    },
                    {
                      url: 'https://cdn1.cachena.entrecode.de/fb5dbaab/hec-info-images/RbPK-NDhS2q_BNUNgKenwA/jeremy-thomas-O6N9RV2rzX8-unsplash_1920.jpg',
                      size: 473608,
                      resolution: { width: 1920, height: 1280 },
                    },
                  ],
                  thumbnails: [
                    {
                      url: 'https://cdn1.cachena.entrecode.de/fb5dbaab/hec-info-images/RbPK-NDhS2q_BNUNgKenwA/jeremy-thomas-O6N9RV2rzX8-unsplash_160_thumb.jpg',
                      dimension: 160,
                    },
                  ],
                  _links: {
                    self: {
                      profile: 'https://schema.cachena.entrecode.de/schema-data/dm-asset',
                      href: 'https://datamanager.cachena.entrecode.de/a/fb5dbaab/hec-info-images/RbPK-NDhS2q_BNUNgKenwA',
                    },
                    'ec:dm-asset/file-variant': {
                      href: 'https://datamanager.cachena.entrecode.de/f/fb5dbaab/RbPK-NDhS2q_BNUNgKenwA/{size}{/type}',
                      templated: true,
                    },
                    'ec:dm-asset/thumbnail': {
                      href: 'https://datamanager.cachena.entrecode.de/t/fb5dbaab/RbPK-NDhS2q_BNUNgKenwA/{size}',
                      templated: true,
                    },
                  },
                },
              },
              _modelTitleField: 'backendId',
              _modelTitle: 'slide_image',
              _entryTitle: null,
            },
            showStart: null,
            showEnd: null,
            hideStart: null,
            hideEnd: null,
            _links: {
              collection: {
                profile: 'https://datamanager.cachena.entrecode.de/api/schema/fb5dbaab/slide',
                href: 'https://datamanager.cachena.entrecode.de/api/fb5dbaab/slide',
              },
              self: {
                profile: 'https://datamanager.cachena.entrecode.de/api/schema/fb5dbaab/slide',
                href: 'https://datamanager.cachena.entrecode.de/api/fb5dbaab/slide?_id=Ro2gFsfMuv&_levels=2',
              },
              'ec:model': {
                profile: 'https://schema.cachena.entrecode.de/schema-data/model',
                href: 'https://datamanager.cachena.entrecode.de/model?dataManagerID=eb8f8709-25de-45a4-826d-8676b761fe70&modelID=1ddf670c-97ce-45f5-b134-c5af88bce440',
              },
              'ec:entry/dm-entryHistory': {
                href: 'https://dm-history.cachena.entrecode.de/entryhistory?dataManagerID=eb8f8709-25de-45a4-826d-8676b761fe70&modelID=1ddf670c-97ce-45f5-b134-c5af88bce440&entryID=Ro2gFsfMuv{&_size,_fromEventNumber}',
                templated: true,
              },
              'ec:entry/history': {
                href: 'https://dm-history.cachena.entrecode.de/entries?dataManagerID=eb8f8709-25de-45a4-826d-8676b761fe70&modelID=1ddf670c-97ce-45f5-b134-c5af88bce440&entryID=Ro2gFsfMuv{&size,fromEventNumber,fromDate,toDate}',
                templated: true,
              },
              'fb5dbaab:slide/content': {
                profile: 'https://datamanager.cachena.entrecode.de/api/schema/fb5dbaab/slide_image',
                href: 'https://datamanager.cachena.entrecode.de/api/fb5dbaab/slide_image?id=D6_p7VRxLh',
                name: 'slide_image',
                title: 'D6_p7VRxLh',
              },
            },
            _modelTitleField: 'title',
            _modelTitle: 'slide',
            _entryTitle: 'ohohoh',
          },
        ],
        config: null,
        background_portrait: null,
        _links: {
          collection: {
            profile: 'https://datamanager.cachena.entrecode.de/api/schema/fb5dbaab/slider',
            href: 'https://datamanager.cachena.entrecode.de/api/fb5dbaab/slider',
          },
          self: {
            profile: 'https://datamanager.cachena.entrecode.de/api/schema/fb5dbaab/slider',
            href: 'https://datamanager.cachena.entrecode.de/api/fb5dbaab/slider?_id=LnbjySf1rw&_levels=3',
          },
          'ec:model': {
            profile: 'https://schema.cachena.entrecode.de/schema-data/model',
            href: 'https://datamanager.cachena.entrecode.de/model?dataManagerID=eb8f8709-25de-45a4-826d-8676b761fe70&modelID=ce18cf79-f4d0-4242-a32d-261693b788e5',
          },
          'ec:entry/dm-entryHistory': {
            href: 'https://dm-history.cachena.entrecode.de/entryhistory?dataManagerID=eb8f8709-25de-45a4-826d-8676b761fe70&modelID=ce18cf79-f4d0-4242-a32d-261693b788e5&entryID=LnbjySf1rw{&_size,_fromEventNumber}',
            templated: true,
          },
          'ec:entry/history': {
            href: 'https://dm-history.cachena.entrecode.de/entries?dataManagerID=eb8f8709-25de-45a4-826d-8676b761fe70&modelID=ce18cf79-f4d0-4242-a32d-261693b788e5&entryID=LnbjySf1rw{&size,fromEventNumber,fromDate,toDate}',
            templated: true,
          },
          'fb5dbaab:slider/slides': {
            profile: 'https://datamanager.cachena.entrecode.de/api/schema/fb5dbaab/slide',
            href: 'https://datamanager.cachena.entrecode.de/api/fb5dbaab/slide?id=Ro2gFsfMuv',
            name: 'slide',
            title: 'ohohoh',
          },
        },
        _modelTitleField: 'title',
        _modelTitle: 'slider',
        _entryTitle: '6YearsOfBugs',
      };
      const result = sdk.findLinkedEntries(entry);
      expect(result).to.deep.equal([
        ['slide', 'Ro2gFsfMuv'],
        ['slide_image', 'D6_p7VRxLh'],
      ]);
      done();
    });
  });
});
