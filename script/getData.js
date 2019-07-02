const axios = require('axios');
const parseString = require('xml2js').parseString;
const simplify = require('./simplifyData.js');

//TODO: don't forget french
const getData = async (client, index, type) => {

  let allRecords = [];

  //TODO: make url an env variable... i think
  const initialData = await axios.get('https://www.jobbank.gc.ca/xmlfeed/en/on', {
    headers: {
      Cookie: "[insert correct cookie]"
    },
    responseType: 'text'
  });
  //here 1/2... if this axios call fails, need to handle that

  let jsonData = {};

  parseString(initialData.data, (err, result) => {
    jsonData = result.SolrResponse.Documents[0].Document;
  });

  //TODO: limiting n of records for now but will need to be unlimited
  let tempDataSet = jsonData.slice(0, 4);
  // console.log(tempDataSet);

  //TODO: use map
  for (var i = 0; i < tempDataSet.length; i++) {
    if (tempDataSet[i].hasOwnProperty('jobs_id')) {
      // console.log(i,tempDataSet[i].jobs_id);
      let jobUrl = 'https://www.jobbank.gc.ca/xmlfeed/en/' + tempDataSet[i].jobs_id[0] + '.xml';

      let indivRecord = await axios.get(jobUrl, {
        headers: {
          Cookie: "[insert correct cookie]"
        },
        responseType: 'text'
      });
      //here 2/2... if the axios call for whatever reason failed, need to handle that; otherwise you're going to push
      //a useless object into the array that will get pushed wholesale to ES

      let jsonJobInfo = {};
      parseString(indivRecord.data, (err, result) => {
        jsonJobInfo = result.SolrResponse.Documents[0].Document[0];
      });

      jsonJobInfo = simplify(jsonJobInfo);

      allRecords.push({ index: { _index: index, _type: type } });
      allRecords.push(jsonJobInfo);
    }
  }
  return allRecords;
};

module.exports = getData;
