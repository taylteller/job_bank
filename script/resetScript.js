const jobBank = require('./jobBank.js');
const elasticsearch = require('./elasticsearch');

module.exports.reset = async (language, index, initialDataset) => {
  await elasticsearch.resetIndex(index);

  let jobsToPush = await jobBank.createJobsArray(initialDataset, language).catch(error => {console.log('Cannot reach job endpoint: ',error.message)});
  //TODO: do something with jobsToFetch.errors - log to console for now

  bulkPushArray = jobBank.createBulkPushArray(index, jobsToPush.jobs, []);
  //TODO: will also need error handling

  if (bulkPushArray.length > 0) {
    test = await elasticsearch.bulkSave(bulkPushArray);
    console.log('test2', test);

    refresher = await elasticsearch.refresh(index);
    console.log('refresher',refresher)
  }
};
