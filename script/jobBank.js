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
        Cookie: '[insert correct cookie]',
      },
      responseType: 'text',
    }).then((resp) => {
      return resp;
    }).catch((err) => {
      if (count < 5) {
        count++;
        return this._endpointCall(url, count);
      }
      throw err;
    });
  },

  _toJson: function(xml) {
    return new Promise((resolve, reject) => {
      parseString(xml.data, (err, result) => {
        if (err) {
          reject(err);
        }
        // Initial endpoint call returns array of objects --> get whole array
        // Individual job records return single object array --> get the object
        if (result.SolrResponse.Documents[0].Document.length === 1) {
          resolve(result.SolrResponse.Documents[0].Document[0]);
        }
        resolve(result.SolrResponse.Documents[0].Document);
      });
    });
  },

  getInitialIDs: function() {
    // return jobBank._endpointCall(baseUrl + english + mainEndpoint);
    return jobBank._endpointCall(baseUrl + english + mainEndpoint).then((resp) => {
      return jobBank._toJson(resp);
    });
  },

  getNewOrUpdatedJobs: function(endpointDataset, esHits) {
    const jobsToFetch = [];

    endpointDataset.filter(function(jobRecord) {
      const arrayEmptyWhenRecordNotAlreadyInES = esHits.filter(function(esRecord) {
        // If records match, ONLY push the job record to the fetch array if its date is more recent
        if (esRecord._source.jobs_id === jobRecord.jobs_id[0]) {
          const esDate = new Date(esRecord._source.file_update_date);
          const jobDate = new Date(jobRecord.file_update_date[0]);
          if (jobDate.getTime() > esDate.getTime()) {
            jobsToFetch.push(jobRecord);
          }
          return true;
        }
      });

      // If there was no match, add the job record to the fetch array
      if (arrayEmptyWhenRecordNotAlreadyInES.length < 1) {
        jobsToFetch.push(jobRecord);
      }
    });

    return jobsToFetch;
  },

  getEsRecordsToDelete: function(endpointDataset, esHits) {
    const esRecordsToDelete = [];

    esHits.filter(function(esRecord) {
      const arrayEmptyWhenRecordNoLongerInJobList = endpointDataset.filter(function(jobRecord) {
        // if records match, ONLY push the esHit to the delete array if its date is older
        if (esRecord._source.jobs_id === jobRecord.jobs_id[0]) {
          const esDate = new Date(esRecord._source.file_update_date);
          const jobDate = new Date(jobRecord.file_update_date[0]);
          if (jobDate.getTime() > esDate.getTime()) {
            esRecordsToDelete.push(esRecord);
          }
          return true;
        }
      });

      // If there was no match (record is out of date), add the job record to the delete array
      if (arrayEmptyWhenRecordNoLongerInJobList.length < 1) {
        esRecordsToDelete.push(esRecord);
      }
    });

    return esRecordsToDelete;
  },

  createJobsArray: async (initialDatasetJSON, lang) => {
    lang = lang.toLowerCase() === 'fr' || lang.toLowerCase() === 'french' ? french : english;

    const jobs = await Promise.all(initialDatasetJSON.map((x) => {
      const jobUrl = baseUrl + lang + x.jobs_id[0] + '.xml';
      return jobBank._endpointCall(jobUrl).then((resp) => {
        return jobBank._toJson(resp).then((resp) =>{
          return simplify(resp);
        });
      }).catch((error) => {
        console.log('Cannot create job ID ' + x.jobs_id[0]);
        error.jobId = x.jobs_id[0];
        return error;
      });
    }));

    const errors = [];
    const validJobs = jobs.filter((job) => {
      if (job instanceof Error) {
        errors.push(job.jobId);
        return false;
      }
      return true;
    });

    return {
      jobs: validJobs,
      errors,
    };
  },

  createBulkPushArray: (index, arrayOfJobs, arrayOfDeletes) => {
    const jobsToAdd = arrayOfJobs.reduce((accumulator, currentValue) => {
      accumulator.push({index: {_index: index}});
      accumulator.push(currentValue);
      return accumulator;
    }, []);

    const jobsToDelete = arrayOfDeletes.reduce((accumulator, currentValue) => {
      accumulator.push({delete: {_index: index, _id: currentValue._id}});
      return accumulator;
    }, []);

    return jobsToAdd.concat(jobsToDelete);
  },

};

module.exports = jobBank;
