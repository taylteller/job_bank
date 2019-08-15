require('dotenv').config();
const elasticsearch = require('./script/elasticsearch');
const jobBank = require('./script/jobBank.js');

const argv = require('yargs')
  .help()
  .alias({'english': ['e', 'English'], 'french': ['f', 'French'], 'help': ['h']})
  .describe('english', 'reset English index')
  .describe('french', 'reset French index')
  .argv;

const parseString = require('xml2js').parseString;

let indices = {};
let baseIndex = 'job-bank-';
let englishIndex = baseIndex + 'en';
let frenchIndex = baseIndex + 'fr';

if (!argv.hasOwnProperty('e') && argv.hasOwnProperty('f')) {
  englishIndex = false;
} if (!argv.hasOwnProperty('f') && argv.hasOwnProperty('e')) {
  frenchIndex = false;
}

(async function () {
  // Reset indices
  indices.en = englishIndex ? elasticsearch.resetIndex(englishIndex) : true;
  indices.fr = frenchIndex ? elasticsearch.resetIndex(frenchIndex) : true;

  await indices.en;
  await indices.fr;

  if (indices.en === false || indices.fr === false) {
    process.exit(1)
  }

   // Get data
  // let allRecords = await getData.getData(englishIndex, frenchIndex);

  const baseUrl = 'https://www.jobbank.gc.ca/xmlfeed/';
  const english = 'en/';
  const french = 'fr/';
  const mainEndpoint = 'on';

  let initialDatasetJSON = await jobBank.getInitialIDs().catch(error => {
    console.log('Cannot process data from main endpoint: ',error.message);
    process.exit(1);
  });
  let fullDatasetJSON;

  //TODO: temporary limit on n of records; will need to be unlimited
  initialDatasetJSON = initialDatasetJSON.slice(0,3);
  console.log('initialDatasetJSON',initialDatasetJSON);
  fullDatasetJSON = await jobBank.createJobsArray(initialDatasetJSON, 'en').catch(error => {console.log('Cannot reach job endpoint: ',error.message)});
//TODO: needs to be called separately with fr
  //TODO: do something with fullDataJSON.errors - log to console for now


  let bulkPushArray = jobBank.createBulkPushArray(englishIndex, fullDatasetJSON.jobs, []);
  // console.log('bulkPushArray',bulkPushArray);
  // Bulk save
  //TODO: will need to be called twice, once w a french set and once w an english set
  //TODO: will also need error handling



  let test = await elasticsearch.bulkSave(bulkPushArray);
// console.log('test2',test);

  let refresher = await elasticsearch.refresh(englishIndex);
  // console.log('refresher',refresher)

  let hits;

  try {
    let searchQuery = await elasticsearch.searchQuery(englishIndex);
    hits = searchQuery.body.hits.hits;
    // console.log('search',searchQuery);
    console.log('body',searchQuery.body.hits.hits);
  } catch (err) {
    console.log('fail!', err.message);
  }

  let esRecordsToDelete = [];
  let jobsToFetch = [];

  initialDatasetJSON.filter(function(job_record) {

    let arrayEmptyWhenRecordNotAlreadyInES = hits.filter(function(es_record) {
      //if records match, ONLY push the job record to the fetch array if its date is more recent
      if (es_record._source.jobs_id === job_record.jobs_id[0]) {
        let esDate = new Date(es_record._source.file_update_date);
        let jobDate = new Date(job_record.file_update_date[0]);
        if (jobDate.getTime() > esDate.getTime()) {
          jobsToFetch.push(job_record);
          esRecordsToDelete.push(job_record);
        }
        return true;
      }
    });

    //if there was no match at all, add the job record to the fetch array
    if (arrayEmptyWhenRecordNotAlreadyInES.length < 1) {
      jobsToFetch.push(job_record);
    }
  });

  //now check es records against job records to identify old ones that need to be deleted
  hits.filter(function(es_record) {
    let arrayEmptyWhenRecordNoLongerInJobList = initialDatasetJSON.filter(function(job_record) {
      //if records match, ONLY push the job record to the fetch array if its date is more recent
      if (es_record._source.jobs_id === job_record.jobs_id[0]) {
        return true;
      }
    });

    //if there was no match at all, add the job record to the fetch array
    if (arrayEmptyWhenRecordNoLongerInJobList.length < 1) {
      esRecordsToDelete.push(es_record);
    }
  });

console.log('esRecordsToDelete',esRecordsToDelete);
console.log('jobstofetch',jobsToFetch);



  jobsToFetch = await jobBank.createJobsArray(jobsToFetch, 'en').catch(error => {console.log('Cannot reach job endpoint: ',error.message)});
console.log('jobstoFetch',jobsToFetch)

bulkPushArray = jobBank.createBulkPushArray(englishIndex, jobsToFetch.jobs, esRecordsToDelete);

console.log('bulkPushArray',bulkPushArray);

  test = await elasticsearch.bulkSave(bulkPushArray);
console.log('test2',test);

  refresher = await elasticsearch.refresh(englishIndex);
  console.log('refresher',refresher)


}());


