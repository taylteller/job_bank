const axios = require('axios');
const parseString = require('xml2js').parseString;
const simplify = require('./simplifyData.js');
const baseUrl = 'https://www.jobbank.gc.ca/xmlfeed/';
const english = 'en/';
const french = 'fr/';
const mainEndpoint = 'on';


const getData = async (client, index, type, language) => {
  //TODO: language handling

  let allRecords = {};

  const initialData = await endpointCall(baseUrl + english + mainEndpoint);
  //TODO: conditional to check for successful endpoint hit, otherwise abort

  let jsonData = {};

  parseString(initialData.data, (err, result) => {
    jsonData = result.SolrResponse.Documents[0].Document;
  });

  //TODO: limiting n of records for now but will need to be unlimited
  let tempDataSet = jsonData.slice(0, 4);

  //TODO: conditional, if language english do this, if french do french, or if both do both
  allRecords.english = await createDataSet(tempDataSet, english, index, type);

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
      console.log('inside catch',count);
      return await endpointCall(url, count);
    } 
    
    console.error('Unable to make initial endpoint call |', error);
    throw error;
  } 
};

const createDataSet = async (tempDataSet, language, index, type) => {

  let finalDataSet = [];

  //TODO: use map
  for (var i = 0; i < tempDataSet.length; i++) {
    if (tempDataSet[i].hasOwnProperty('jobs_id')) {
      let jobUrl = baseUrl + language + tempDataSet[i].jobs_id[0] + '.xml';

      let indivRecord = await endpointCall(jobUrl);

      let jsonJobInfo = {};
      parseString(indivRecord.data, (err, result) => {
        jsonJobInfo = result.SolrResponse.Documents[0].Document[0];
      });

      jsonJobInfo = await simplify(jsonJobInfo);

      finalDataSet.push({ index: { _index: index, _type: type } });
      finalDataSet.push(jsonJobInfo);
    }
  }
  return finalDataSet;
};

module.exports = getData;
