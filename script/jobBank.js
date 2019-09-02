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

  getNewOrUpdatedJobs: function(endpointDataset, esHits) {
    let jobsToFetch = [];

    endpointDataset.filter(function (job_record) {

      let arrayEmptyWhenRecordNotAlreadyInES = esHits.filter(function (es_record) {
        // If records match, ONLY push the job record to the fetch array if its date is more recent
        if (es_record._source.jobs_id === job_record.jobs_id[0]) {
          let esDate = new Date(es_record._source.file_update_date);
          let jobDate = new Date(job_record.file_update_date[0]);
          if (jobDate.getTime() > esDate.getTime()) {
            jobsToFetch.push(job_record);
          }
          return true;
        }
      });

      // If there was no match, add the job record to the fetch array
      if (arrayEmptyWhenRecordNotAlreadyInES.length < 1) {
        jobsToFetch.push(job_record);
      }
    });

    return jobsToFetch;
  },

  getEsRecordsToDelete: function (endpointDataset, esHits) {
    let esRecordsToDelete = [];

    esHits.filter(function (es_record) {
      //TODO: refactor to reduce duplicate code with getNewOrUpdatedJobs
      let arrayEmptyWhenRecordNoLongerInJobList = endpointDataset.filter(function (job_record) {
        //if records match, ONLY push the job record to the fetch array if its date is more recent
        if (es_record._source.jobs_id === job_record.jobs_id[0]) {
          let esDate = new Date(es_record._source.file_update_date);
          let jobDate = new Date(job_record.file_update_date[0]);
          if (jobDate.getTime() > esDate.getTime()) {
            esRecordsToDelete.push(es_record);
          }
          return true;
        }
      });

      // If there was no match (record is out of date), add the job record to the delete array
      if (arrayEmptyWhenRecordNoLongerInJobList.length < 1) {
        esRecordsToDelete.push(es_record);
      }
    });

    return esRecordsToDelete;
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

  createBulkPushArray: (index, arrayOfJobs, arrayOfDeletes) => {
    let jobsToAdd = arrayOfJobs.reduce((accumulator, currentValue) => {
      accumulator.push({index: { _index: index}});
      accumulator.push(currentValue);
      return accumulator;
    }, []);

    let jobsToDelete = arrayOfDeletes.reduce((accumulator, currentValue) => {
      accumulator.push({delete: {_index: index, _id: currentValue._id}});
      return accumulator;
    }, []);

    return jobsToAdd.concat(jobsToDelete);
  }

};

module.exports = jobBank;
