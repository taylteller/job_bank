const axios = require('axios');
const parseString = require('xml2js').parseString;
const simplify = require('./simplifyData.js');
const baseUrl = 'https://www.jobbank.gc.ca/xmlfeed/';
const english = 'en/';
const french = 'fr/';
const mainEndpoint = 'on';

_endpointCall = (url, count=0) => {
  return axios.get(url, {
    headers: {
      Cookie: "[insert correct cookie]"
    },
    responseType: 'text'
  }).then(resp => {
    return resp;
  }).catch(err => {
    if (count < 5) {
      count++;
      return _endpointCall(url, count);
    }
    throw err;
  });
};

const _toJson = function (xml) {
  // console.log('xml', xml);
  return new Promise((resolve, reject) => {
    parseString(xml.data, (err, result) => {
      if(err) {
        // console.log('err', err)
        reject(err);
      }
      // The initial endpoint call will return an array of objects, in which case we want the whole array
      // An individual job record will return a single object array, in which case we want the object itself
      if (result.SolrResponse.Documents[0].Document.length === 1) {
        resolve(result.SolrResponse.Documents[0].Document[0]);
      }
      resolve(result.SolrResponse.Documents[0].Document);
    })
  })
};

let lang = 'en/';

//TODO: does every nested then need its own error catch?
module.exports.createJobsArray = async (initialDatasetJSON, lang) => {
  lang = lang.toLowerCase() === 'fr' || lang.toLowerCase() === 'french' ? french : english;

 return await Promise.all(initialDatasetJSON.map(async x => {
    let jobUrl = baseUrl + lang + x.jobs_id[0] + '.xml';
    return await _endpointCall(jobUrl).then(resp => {
      return _toJson(resp).then(resp =>{
        return simplify(resp);
      }, err => {
        throw err;
      });
    });
  }));
};

//TODO: does every nested then need its own error catch?
module.exports.getInitialIDs = async () => {
  return await _endpointCall(baseUrl + english + mainEndpoint).then(resp => {
    return _toJson(resp);
  }, err => {
    throw err;
  });
};

module.exports.createBulkPushArray = (arrayOfJobs, index) => {
  return arrayOfJobs.reduce((accumulator, currentvalue) => {
    accumulator.push({index: { _index: index}});
    accumulator.push(currentvalue);
    return accumulator;
  }, []);
};

module.exports._endpointCall = _endpointCall;
module.exports._toJson = _toJson;
