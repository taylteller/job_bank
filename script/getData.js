const axios = require('axios');
const parseString = require('xml2js').parseString;
const simplify = require('./simplifyData.js');
const baseUrl = 'https://www.jobbank.gc.ca/xmlfeed/';
const english = 'en/';
const french = 'fr/';
const mainEndpoint = 'on';

const type = 'job';

module.exports._endpointCall = async (url, count=0) => {
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
      return await module.exports._endpointCall(url, count);
    }
    // console.error('Unable to make initial endpoint call |', error);
    throw error;
  }
};

module.exports.endpointCall = (url) => {
  return this._endpointCall(url);
};

module.exports._createDataSet = async (tempDataSet, lang, index, type) => {
  let finalDataSet = [];

  //TODO: use map
  for (var i = 0; i < tempDataSet.length; i++) {
    if (tempDataSet[i].hasOwnProperty('jobs_id')) {
      let jobUrl = baseUrl + lang + tempDataSet[i].jobs_id[0] + '.xml';

      let indivRecord;
      let jsonJobInfo = {};

      try {
        indivRecord = await this.endpointCall(jobUrl);

        parseString(indivRecord.data, (err, result) => {
          jsonJobInfo = result.SolrResponse.Documents[0].Document[0];
        });

        jsonJobInfo = await simplify(jsonJobInfo);

        finalDataSet.push({ index: { _index: index, _type: type } });
        finalDataSet.push(jsonJobInfo);

      } catch (err) {
        //TODO: what happens when getting a job fails after 5 tries is a business decision; ask Megan
        console.error('Unable to create listing for job ID ' + tempDataSet[i].jobs_id[0] + ' | ' + err);
      }

    }
  }
  return finalDataSet;
};

module.exports.createDataSet = (tempDataSet, lang, index, type) => {
  return this._createDataSet(tempDataSet, lang, index, type);
};

module.exports.getData = async (englishIndex, frenchIndex) => {

  let allRecords = {};
  let initialData;

  // Fetch job IDs from initial endpoint
  try {
    initialData = await this.endpointCall(baseUrl + english + mainEndpoint);
  } catch (err) {
    console.error(`Unable to reach main endpoint: ${err.message}`);
    //Instead of having a process.exit(1);, you should instead throw err and
    // add a try/catch to the index.js that calls process.exit(1) on error.
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
    allRecords.english = await this.createDataSet(tempDataSet, english, englishIndex, type);
  }
  if (frenchIndex) {
    allRecords.french = await this.createDataSet(tempDataSet, french, frenchIndex, type);
  }

  return allRecords;
};
