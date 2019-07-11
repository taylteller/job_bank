const elasticsearch = require('./script/elasticsearch');
const getData = require('./script/getData.js');
const argv = require('yargs')
  .help()
  .alias({'english': ['e', 'English'], 'french': ['f', 'French'], 'help': ['h']})
  .describe('english', 'reset English index')
  .describe('french', 'reset French index')
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
  // Reset indices
  indices.en = englishIndex ? elasticsearch.resetIndex(englishIndex) : true;
  indices.fr = frenchIndex ? elasticsearch.resetIndex(frenchIndex) : true;

  await indices.en;
  await indices.fr;

  if (indices.en === false || indices.fr === false) {
    process.exit(1)
  }

  // Get data
  let allRecords = await getData(englishIndex, frenchIndex);

  // Bulk save
  let test = await elasticsearch.bulkSave(allRecords, englishIndex, frenchIndex);
// console.log('test2',test);

}());


