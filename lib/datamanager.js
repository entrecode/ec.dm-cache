
let dm;

function setDataManager(dataManagerURL, accessToken) {
  dm = new DataManager({
    url: dataManagerURL,
    accessToken,
  });
}
function setDataManagerInstance(dataManagerInstance) {
  dm = dataManagerInstance;
}

function getEntry(modelTitle, entryID, {fields, levels} ) {
  return dm
  .model(modelTitle)
  .entry(entryID, levels, fields);
}

function findLinkedEntries(entry) {
  // todo
}

function getEntries(modelTitle, options) {
  return dm
  .model(modelTitle)
  .entries(options);
}

module.exports = {
  setDataManager,
  setDataManagerInstance,
  getEntry,
  getEntries,
  findLinkedEntries,
};
