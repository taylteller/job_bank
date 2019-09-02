const jobBank = require('./jobBank.js');
const elasticsearch = require('./elasticsearch');

module.exports.reset = async (language, index, initialDataset) => {
  await elasticsearch.resetIndex(index);

  let jobsToPush = [];

  try {
    jobsToPush = await jobBank.createJobsArray(initialDataset, language);
    // This is a placeholder; something else could be done with the errors array
    if (jobsToPush.errors.length > 0) {
      console.log('Failed to reach jobs with these IDs: ', jobsToPush.errors);
    }
  } catch (err) {
    console.log('Cannot reach job endpoint: ', err.message);
  }

  let bulkPushArray = [];

  try {
    bulkPushArray = jobBank.createBulkPushArray(index, jobsToPush.jobs, []);
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
