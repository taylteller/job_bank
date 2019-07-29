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

  let initialDatasetJSON = await jobBank.getInitialIDs();
  let fullDatasetJSON;

  //TODO: temporary limit on n of records; will need to be unlimited
  initialDatasetJSON = initialDatasetJSON.slice(0,4);
  // console.log(initialDatasetJSON);

  fullDatasetJSON = await jobBank.createJobsArray(initialDatasetJSON, 'en');
//TODO: needs to be called separately with fr







  // console.log('fullData', fullDatasetJSON);


  let bulkPushArray = jobBank.createBulkPushArray(fullDatasetJSON, englishIndex);
  // console.log('bulkPushArray',bulkPushArray);
  // Bulk save
  //TODO: will need to be called twice, once w a french set and once w an english set
  let test = await elasticsearch.bulkSave(bulkPushArray, englishIndex);
console.log('test2',test);

}());


