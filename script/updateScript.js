const jobBank = require('./jobBank.js');
const elasticsearch = require('./elasticsearch');


module.exports.update = async (language, index, initialDataset) => {
  let esHits;

  try {
    let searchQuery = await elasticsearch.searchQuery(index);
    esHits = searchQuery.body.hits.hits;
  } catch (err) {
    console.log('Could not perform search query', err.message);
  }

  let jobsToFetch = jobBank.getNewOrUpdatedJobs(initialDataset, esHits);
  let esRecordsToDelete = jobBank.getEsRecordsToDelete(initialDataset, esHits);

  let jobsToPush = await jobBank.createJobsArray(jobsToFetch, language).catch(error => {console.log('Cannot reach job endpoint: ',error.message)});
  //TODO: do something with jobsToFetch.errors - log to console for now

  bulkPushArray = jobBank.createBulkPushArray(index, jobsToPush.jobs, esRecordsToDelete);
  //TODO: will also need error handling

  if (bulkPushArray.length > 0) {
    test = await elasticsearch.bulkSave(bulkPushArray);
    console.log('test2', test);

    refresher = await elasticsearch.refresh(index);
    console.log('refresher',refresher)
  }
};
