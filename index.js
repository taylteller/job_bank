require('dotenv').config();
const elasticsearch = require('./script/elasticsearch');
const jobBank = require('./script/jobBank.js');

const argv = require('yargs')
  .help()
  .alias({'english': ['e', 'English'], 'french': ['f', 'French'], 'help': ['h']})
  .describe('english', 'perform selected operation on English index')
  .describe('french', 'perform selected operation on French index')
  .describe('reset', 'reset index of selected language(s)')
  .describe('update', 'update index of selected language(s)')
  .argv;

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

  /*****************************************************/
  /*                 HOUSEKEEPING                      */
  /*****************************************************/
  //TODO: use or erase
  const baseUrl = 'https://www.jobbank.gc.ca/xmlfeed/';
  const english = 'en/';
  const french = 'fr/';
  const mainEndpoint = 'on';

  let jobsToFetch = [];
  let esRecordsToDelete = [];

  /*****************************************************/
  /*              QUERY MAIN ENDPOINT                  */
  /*****************************************************/

  let initialDatasetJSON = await jobBank.getInitialIDs().catch(error => {
    console.log('Cannot process data from main endpoint: ',error.message);
    process.exit(1);
  });
  let fullDatasetJSON;

  //TODO: temporary limit on n of records; will need to be unlimited
  initialDatasetJSON = initialDatasetJSON.slice(0,3);
  console.log('initialDatasetJSON',initialDatasetJSON);

  /*****************************************************/
  /*                   IF RESET                        */
  /*****************************************************/

  // If reset is selected, only perform reset, even if update is also selected
  if (argv.hasOwnProperty('reset')) {
console.log('performing reset');

    // Reset indices
    indices.en = englishIndex ? elasticsearch.resetIndex(englishIndex) : true;
    indices.fr = frenchIndex ? elasticsearch.resetIndex(frenchIndex) : true;

    await indices.en;
    await indices.fr;

    if (indices.en === false || indices.fr === false) {
      process.exit(1)
    }

    jobsToFetch = initialDatasetJSON;
  }

  /*****************************************************/
  /*                   IF UPDATE                       */
  /*****************************************************/

  // If update is selected and reset is not, or if no option is provided, perform an update
  if (!argv.hasOwnProperty('reset')) {
console.log('performing update');
    let esHits;

    try {
      let searchQuery = await elasticsearch.searchQuery(englishIndex);
      esHits = searchQuery.body.hits.hits;
      console.log('body', searchQuery.body.hits.hits);
    } catch (err) {
      console.log('fail!', err.message);
    }

    initialDatasetJSON.filter(function (job_record) {

      let arrayEmptyWhenRecordNotAlreadyInES = esHits.filter(function (es_record) {
        // If records match, ONLY push the job record to the fetch array if its date is more recent
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

      // If there was no match, add the job record to the fetch array
      if (arrayEmptyWhenRecordNotAlreadyInES.length < 1) {
        jobsToFetch.push(job_record);
      }
    });

    // Check es records against job records to identify old ones that need to be deleted
    esHits.filter(function (es_record) {
      let arrayEmptyWhenRecordNoLongerInJobList = initialDatasetJSON.filter(function (job_record) {
        //if records match, ONLY push the job record to the fetch array if its date is more recent
        if (es_record._source.jobs_id === job_record.jobs_id[0]) {
          return true;
        }
      });

      // If there was no match (record is out of date), add the job record to the delete array
      if (arrayEmptyWhenRecordNoLongerInJobList.length < 1) {
        esRecordsToDelete.push(es_record);
      }
    });

    console.log('esRecordsToDelete', esRecordsToDelete);
    console.log('jobstofetch', jobsToFetch);
  }

  /*****************************************************/
  /*     CREATE DATASET AND PUSH TO ELASTICSEARCH       */
  /*****************************************************/

  jobsToFetch = await jobBank.createJobsArray(jobsToFetch, 'en').catch(error => {console.log('Cannot reach job endpoint: ',error.message)});
console.log('jobstoFetch',jobsToFetch)
  //TODO: needs to be called separately with fr
  //TODO: do something with jobsToFetch.errors - log to console for now

  bulkPushArray = jobBank.createBulkPushArray(englishIndex, jobsToFetch.jobs, esRecordsToDelete);
  //TODO: will need to be called twice, once w a french set and once w an english set
  //TODO: will also need error handling

console.log('bulkPushArray',bulkPushArray);

  if (bulkPushArray.length > 0) {
    test = await elasticsearch.bulkSave(bulkPushArray);
    console.log('test2', test);

    refresher = await elasticsearch.refresh(englishIndex);
    console.log('refresher',refresher)
  }

}());


