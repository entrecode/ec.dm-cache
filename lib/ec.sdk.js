const halfred = require('halfred');

class SDKWrapper {
  constructor(sdkInstance) {
    this.sdkInstance = sdkInstance;
    this.id = sdkInstance.shortID;
  }

  get sdk() {
    return this.sdkInstance;
  }

  // eslint-disable-next-line class-methods-use-this
  findLinkedEntries(entry, levels = 1) {
    if (Array.isArray(entry)) {
      return entry.map((e) => this.findLinkedEntries(e, levels));
    }
    if (typeof entry !== 'object') {
      return [];
    }

    const halEntry = typeof entry.allLinks === 'function' ? entry : halfred.parse(entry);
    const fields = [];

    let out = Object.keys(halEntry.allLinks())
      .filter((link) => /[A-Fa-f0-9]{8}:[a-zA-Z0-9_\\-]{1,256}\/(?!_?creator)[a-zA-Z0-9_\\-]{1,256}/.test(link))
      .map((link) => {
        fields.push(/[A-Fa-f0-9]{8}:[a-zA-Z0-9_\\-]{1,256}\/((?!_?creator)[a-zA-Z0-9_\\-]{1,256})/.exec(link)[1]);
        return typeof halEntry.linkArray === 'function' ? halEntry.linkArray(link) : halEntry.getLinks(link);
      })
      .reduce((array, links) => array.concat(links), [])
      .filter((linkObject) => 'name' in linkObject)
      .map((linkObject) => [linkObject.name, linkObject.href.split('=')[1]]);

    if (levels >= 1) {
      out = out.concat(
        fields
          .map((field) => {
            return this.findLinkedEntries(halEntry[field], levels - 1);
          })
          .reduce((array, links) => array.concat(...links), []),
      );
    }
    return out;
  }

  getEntries(modelTitle, options) {
    return this.sdk.entryList(modelTitle, options);
  }

  getEntry(modelTitle, entryID, { fields, levels } = {}) {
    const options = {};
    if (fields) {
      options._fields = fields;
    }
    if (levels) {
      options._levels = levels;
    }
    return this.sdk.entry(modelTitle, entryID, options);
  }

  getDMConfig() {
    return this.sdk.resolve().then((sdk) => sdk.config);
  }
}

module.exports = SDKWrapper;
