let dm;

function setDataManagerInstance(dataManagerInstance) {
  dm = dataManagerInstance;
}

function getEntry(modelTitle, entryID, {fields, levels} ) {
  return dm
  .model(modelTitle)
  .entry(entryID, levels, fields);
}

function findLinkedEntries(entry) {
  return Object.keys(entry._links)
  .filter(key => key.substr(0, 8) === dm.id && key.substr(-8) !== '/creator' && key.substr(-9) !== '/_creator')
  .map(key => entry._links[key])
  .reduce((array, link) => {
    if (Array.isArray(link)) {
      return array.concat(link);
    }
    array.push(link);
    return array;
  }, [])
  .filter(linkObject => 'name' in linkObject)
  .map(linkObject => [linkObject.name, linkObject.href.split('=')[1]]);
}

function getEntries(modelTitle, options) {
  return dm
  .model(modelTitle)
  .entries(options);
}

module.exports = {
  setDataManagerInstance,
  getEntry,
  getEntries,
  findLinkedEntries,
};
