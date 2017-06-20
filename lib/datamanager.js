class DatamanagerWrapper {
  
constructor(dataManagerInstance) {
  this.dataManagerInstance = dataManagerInstance;
}

 getEntry(modelTitle, entryID, {fields, levels} ) {
  return this.dataManagerInstance
  .model(modelTitle)
  .entry(entryID, levels, fields);
}

 findLinkedEntries(entry) {
  if (!('_links' in entry) && 'value' in entry) {
    return this.findLinkedEntries(entry.value);
  }
  return Object.keys(entry._links)
  .filter(key => key.substr(0, 8) === this.dataManagerInstance.id
  && key.substr(-8) !== '/creator' && key.substr(-9) !== '/_creator')
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

 getEntries(modelTitle, options) {
  return this.dataManagerInstance
  .model(modelTitle)
  .entryList(options);
}

}

module.exports = DatamanagerWrapper;
