const axios = require('axios');
const parseString = require('xml2js').parseString;
const simplify = require('./simplifyData.js');
const baseUrl = 'https://www.jobbank.gc.ca/xmlfeed/';
const english = 'en/';
const french = 'fr/';
const mainEndpoint = 'on';

const jobBank = {

  _endpointCall: function(url, count=0) {
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
        return this._endpointCall(url, count);
      }
      throw err;
    });
  },

  _toJson: function (xml) {
    return new Promise((resolve, reject) => {
      parseString(xml.data, (err, result) => {
        if(err) {
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
  },

  getInitialIDs: function() {
    // return jobBank._endpointCall(baseUrl + english + mainEndpoint);
    return jobBank._endpointCall(baseUrl + english + mainEndpoint).then(resp => {
      return jobBank._toJson(resp);
    });
  },

  createJobsArray: async (initialDatasetJSON, lang) => {
    lang = lang.toLowerCase() === 'fr' || lang.toLowerCase() === 'french' ? french : english;

    const jobs = await Promise.all(initialDatasetJSON.map(async x => {
      let jobUrl = baseUrl + lang + x.jobs_id[0] + '.xml';
      return await jobBank._endpointCall(jobUrl).then(resp => {
        return jobBank._toJson(resp).then(resp =>{
          return simplify(resp);
        });
      }).catch(error => {
        console.log('Cannot create job ID ' + x.jobs_id[0]);
        error.jobId = x.jobs_id[0];
        return error;
      });
    }));

    let errors = [];
    const validJobs = jobs.filter((job) => {
      if (job instanceof Error) {
        errors.push(job.jobId);
        return false
      }
      return true;
    });

    return {
      jobs: validJobs,
      errors,
    }
  },

  createBulkPushArray: (arrayOfJobs, index) => {
    return arrayOfJobs.reduce((accumulator, currentValue) => {
      accumulator.push({index: { _index: index}});
      accumulator.push(currentValue);
      return accumulator;
    }, []);
  }

};

module.exports = jobBank;
