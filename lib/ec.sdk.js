class SDKWrapper {
  constructor(sdkInstance) {
    this.sdk = sdkInstance;
  }

  getEntry(modelTitle, entryID, { fields, levels } = {}) {
    const options = {};
    if (fields) {
      options._fields = fields;
    }
    if (levels) {
      options._levels = levels;
    }
    return this.sdk
    .entry(modelTitle, entryID, options)
  }

  findLinkedEntries(entry) {
    return Object.keys(entry.allLinks())
    .filter(link => /[A-Fa-f0-9]{8}:[a-zA-Z0-9_\\-]{1,256}\/(?!_?creator)[a-zA-Z0-9_\\-]{1,256}/.test(link))
    .map(link => entry.getLinks(link))
    .reduce((array, links) => array.concat(links))
    .filter(linkObject => 'name' in linkObject)
    .map(linkObject => [linkObject.name, linkObject.href.split('=')[1]]);
  }

  getEntries(modelTitle, options) {
    return this.sdk
    .entryList(modelTitle, options)
  }
}

module.exports = SDKWrapper;
