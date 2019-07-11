const axios = require('axios');
const parseString = require('xml2js').parseString;
const simplify = require('./simplifyData.js');
const baseUrl = 'https://www.jobbank.gc.ca/xmlfeed/';
const english = 'en/';
const french = 'fr/';
const mainEndpoint = 'on';

const type = 'job';

const getData = async (englishIndex, frenchIndex) => {

  let allRecords = {};
  let initialData;

  // Fetch job IDs from initial endpoint
  try {
    initialData = await endpointCall(baseUrl + english + mainEndpoint);
  } catch (err) {
    console.error(`Unable to reach main endpoint: ${err.message}`);
    process.exit(1);
  }

  // Convert xml response to parsable json object
  let jsonData = {};
  parseString(initialData.data, (err, result) => {
    jsonData = result.SolrResponse.Documents[0].Document;
  });

  //TODO: limiting n of records for now but will need to be unlimited
  let tempDataSet = jsonData.slice(0, 4);

  // Fetch individual jobs and build allRecords object
  if (englishIndex) {
    allRecords.english = await createDataSet(tempDataSet, english, englishIndex, type);
  }
  if (frenchIndex) {
    allRecords.french = await createDataSet(tempDataSet, french, frenchIndex, type);
  }

  return allRecords;
};

const endpointCall = async (url, count=0) => {
  let dataObj;

  try {
    dataObj = await axios.get(url, {
      headers: {
        Cookie: "[insert correct cookie]"
      },
      responseType: 'text'
    });
    return dataObj;
  } catch(error) {
    if (count < 5) {
      count++;
      return await endpointCall(url, count);
    }
    // console.error('Unable to make initial endpoint call |', error);
    throw error;
  }
};

const createDataSet = async (tempDataSet, lang, index, type) => {
  let finalDataSet = [];

  //TODO: use map
  for (var i = 0; i < tempDataSet.length; i++) {
    if (tempDataSet[i].hasOwnProperty('jobs_id')) {
      let jobUrl = baseUrl + lang + tempDataSet[i].jobs_id[0] + '.xml';

      let indivRecord;
      let jsonJobInfo = {};

      try {
        indivRecord = await endpointCall(jobUrl);

        parseString(indivRecord.data, (err, result) => {
          jsonJobInfo = result.SolrResponse.Documents[0].Document[0];
        });

        jsonJobInfo = await simplify(jsonJobInfo);

        finalDataSet.push({ index: { _index: index, _type: type } });
        finalDataSet.push(jsonJobInfo);

      } catch (err) {
        console.error('Unable to create listing for job ID ' + tempDataSet[i].jobs_id[0] + ' | ' + err);
      }

    }
  }
  return finalDataSet;
};

module.exports = getData;
module.exports._endpointCall = endpointCall;
module.exports._createDataSet = createDataSet;
