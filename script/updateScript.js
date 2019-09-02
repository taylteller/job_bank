const jobBank = require('./jobBank.js');
const elasticsearch = require('./elasticsearch');


module.exports.update = async (language, index, initialDataset) => {
  let esHits;

  try {
    const searchQuery = await elasticsearch.searchQuery(index);
    esHits = searchQuery.body.hits.hits;
  } catch (err) {
    console.log('Could not retrieve Elasticsearch records');
    throw err;
  }

  const jobsToFetch = jobBank.getNewOrUpdatedJobs(initialDataset, esHits);
  const esRecordsToDelete =
    jobBank.getEsRecordsToDelete(initialDataset, esHits);

  let jobsToPush = [];

  try {
    jobsToPush = await jobBank.createJobsArray(jobsToFetch, language);
    // This is a placeholder; something else could be done with the errors array
    if (jobsToPush.errors.length > 0) {
      console.log('Failed to reach jobs with these IDs: ', jobsToPush.errors);
    }
  } catch (err) {
    console.log('Cannot reach job endpoint: ', err.message);
  }

  let bulkPushArray = [];

  try {
    bulkPushArray =
      jobBank.createBulkPushArray(index, jobsToPush.jobs, esRecordsToDelete);
  } catch (err) {
    console.log('Error occurred while creating bulkPushArray: ', err.message);
  }

  if (bulkPushArray.length > 0) {
    try {
      await elasticsearch.bulkSave(bulkPushArray);
    } catch (err) {
      console.log('Could not bulk save records into Elasticsearch');
      throw err;
    }

    try {
      await elasticsearch.refresh(index);
    } catch (err) {
      console.log('Could not refresh index ' + index);
      throw err;
    }
  }
};
