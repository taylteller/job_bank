require('dotenv').config();
const jobBank = require('./script/jobBank.js');
const updateScript = require('./script/updateScript');
const resetScript = require('./script/resetScript');

const argv = require('yargs')
    .help()
    .alias({'english': ['e', 'English'],
      'french': ['f', 'French'], 'help': ['h']})
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

const mainScript = async function(languages, operation) {
  /** ***************************************************/
  /*                QUERY MAIN ENDPOINT                 */
  /** ***************************************************/

  let initialDatasetJSON;

  try {
    initialDatasetJSON = await jobBank.getInitialIDs();
  } catch (err) {
    console.log('Cannot process data from main endpoint: ', err.message);
    process.exit(1);
  }

  /** ***************************************************/
  /*                  RESET OR UPDATE                   */
  /** ***************************************************/
  languages.forEach(async function(language) {
    const index = language === 'fr' ? 'job-bank-fr' : 'job-bank-en';

    // If reset is selected, only perform reset, even if update is also selected
    if (operation === 'reset') {
      try {
        await resetScript.reset(language, index, initialDatasetJSON);
        console.log('Reset for ' + language + ' index complete.');
      } catch (err) {
        console.log(err);
      }
    }

    if (operation !== 'reset') {
      try {
        await updateScript.update(language, index, initialDatasetJSON);
        console.log('Update for ' + language + ' index complete.');
      } catch (err) {
        console.log(err);
      }
    }
  });
};

mainScript(languages, operation);
