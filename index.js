require('dotenv').config();
const jobBank = require('./script/jobBank.js');
const updateScript = require('./script/updateScript');
const resetScript = require('./script/resetScript');

const argv = require('yargs')
  .help()
  .alias({'english': ['e', 'English'], 'french': ['f', 'French'], 'help': ['h']})
  .describe('english', 'perform selected operation on English index')
  .describe('french', 'perform selected operation on French index')
  .describe('reset', 'reset index of selected language(s)')
  .describe('update', 'update index of selected language(s)')
  .argv;

const operation = argv.hasOwnProperty('reset') ? 'reset' : 'update';

const languages = [];

if (argv.hasOwnProperty('e') || (!argv.hasOwnProperty('e')&& !argv.hasOwnProperty('f'))) {
  languages.push('en');
}
if (argv.hasOwnProperty('f') || (!argv.hasOwnProperty('e')&& !argv.hasOwnProperty('f'))) {
  languages.push('fr');
}

const mainScript = async function (language, operation) {

  const index = language === 'fr' ? 'job-bank-fr' : 'job-bank-en';

  /*****************************************************/
  /*                QUERY MAIN ENDPOINT                */
  /*****************************************************/

  let initialDatasetJSON = await jobBank.getInitialIDs().catch(error => {
    console.log('Cannot process data from main endpoint: ',error.message);
    process.exit(1);
  });

  //TODO: temporary limit on n of records; will need to be unlimited
  initialDatasetJSON = initialDatasetJSON.slice(0,3);
  console.log('initialDatasetJSON',initialDatasetJSON);

  /*****************************************************/
  /*                  RESET OR UPDATE                  */
  /*****************************************************/

  // If reset is selected, only perform reset, even if update is also selected
  if (operation === 'reset') {
    resetScript.reset(language, index, initialDatasetJSON);
  }

  // If reset is not selected, default to update
  if (operation !== 'reset') {
    updateScript.update(language, index, initialDatasetJSON);
  }

};

languages.forEach(lang => {
  mainScript(lang, operation);
});
