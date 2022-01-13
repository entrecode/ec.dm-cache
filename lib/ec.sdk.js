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
  findLinkedEntries(entry) {
    const halEntry = typeof entry.allLinks === 'function' ? entry : halfred.parse(entry);
    return Object.keys(halEntry.allLinks())
      .filter((link) => /[A-Fa-f0-9]{8}:[a-zA-Z0-9_\\-]{1,256}\/(?!_?creator)[a-zA-Z0-9_\\-]{1,256}/.test(link))
      .map((link) => halEntry.linkArray(link))
      .reduce((array, links) => array.concat(links), [])
      .filter((linkObject) => 'name' in linkObject)
      .map((linkObject) => [linkObject.name, linkObject.href.split('=')[1]]);
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
