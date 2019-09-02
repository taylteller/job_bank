const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const sinon = require('sinon');

const axios = require('axios');
const jobBank = require('../../script/jobBank.js');

describe('_endpointCall', () => {
  describe('when endpoint is successfully reached', () => {

    before(() => {
      sinon.stub(axios, 'get').resolves({ status: 200, statusText: 'ok', data: '' });
    });

    after(() => {
      axios.get.restore();
    });

    it('should return a 200 status code', () => {
      return jobBank._endpointCall('www.test.noturl').then(result => {
        return expect(result.status).to.equal(200);
      });
    });
  });

  describe('when endpoint first fails but succeeds on a subsequent try', () => {

    before(() => {
      sinon.stub(axios, 'get')
        .onFirstCall().rejects()
        .onSecondCall().resolves({ status: 200, statusText: 'ok', data: '' });
    });

    after(() => {
      axios.get.restore();
    });

    it('should return a 200 status code', () => {
      return jobBank._endpointCall('www.test.noturl').then(result => {
        return expect(result.status).to.equal(200);
      }, error => {console.log(error)});
    });
  });

  describe('when endpoint is never reached', () => {

    before(() => {
      sinon.stub(axios, 'get')
        .rejects({err: 'no dice'});
    });

    after(() => {
      axios.get.restore();
    });

    it('should throw an error', () => {
      return jobBank._endpointCall('stillnotareal.url').then(result => {
        return expect(result).to.equal('this should not be hit; you want to hit the error')
      }, err => {
        return expect(err).to.deep.equal({err: 'no dice'});
      })
    });
  });
});

describe('_toJson', () => {
  it('doesn\'t need to be tested, as it is only a wrapper around a library', () => {
  });
});

describe('getInitialIDs', () => {

  let endpointResponse = {data: '<SolrResponse>\n<Header>\n<status>0</status>\n<QTime>0</QTime>\n' +
      '<numFound>1</numFound>\n</Header>\n<Documents>\n' +
      '<Document>\n<jobs_id>30514572</jobs_id>\n' +
      '<file_update_date>2019-06-14T08:38:00Z</file_update_date>\n</Document>\n' +
      '<Document>\n<jobs_id>30514467</jobs_id>\n' +
      '<file_update_date>2019-06-14T08:37:00Z</file_update_date>\n</Document>\n' +
      '<Document>\n<jobs_id>30514479</jobs_id>\n' +
      '<file_update_date>2019-06-14T08:37:00Z</file_update_date>\n</Document>\n' +
      '</Documents>\n</SolrResponse>\n'};

  describe('if endpoint is successfully reached and xml is successfully parsed', () => {

    before(() => {
      sinon.stub(jobBank, '_endpointCall').resolves(endpointResponse);
    });

    after(() => {
      jobBank._endpointCall.restore();
    });

    it('should return an array of objects', () => {
      return jobBank.getInitialIDs().then( result => {
        return expect(result).to.deep.equal([
          {
            jobs_id: [ '30514572' ],
            file_update_date: [ '2019-06-14T08:38:00Z' ]
          },
          {
            jobs_id: [ '30514467' ],
            file_update_date: [ '2019-06-14T08:37:00Z' ]
          },
          {
            jobs_id: [ '30514479' ],
            file_update_date: [ '2019-06-14T08:37:00Z' ]
          }
        ]);
      });
    });
  });

  describe('if endpoint fails', () => {

    before(() => {
      sinon.stub(jobBank, '_endpointCall').rejects(new Error('testError'));
    });

    after(() => {
      jobBank._endpointCall.restore();
    });

    it('should throw an error', async () => {
      const func = () => jobBank.getInitialIDs();
      return expect(func()).to.be.rejectedWith(Error, 'testError');
    });
  });

  describe('if endpoint is successfully reached but xml fails to parse', () => {

    before(() => {
      sinon.stub(jobBank, '_endpointCall').resolves({ohNo: 'we are missing the expected data key! gasp!'});
      sinon.stub(jobBank, '_toJson').rejects(new Error('testError'));
    });

    after(() => {
      jobBank._endpointCall.restore();
      jobBank._toJson.restore();
    });

    it('should throw an error', () => {
      const func = () => jobBank.getInitialIDs();
      return expect(func()).to.be.rejectedWith(Error, 'testError');
    });
  });
});

describe('dataset comparison functions getNewOrUpdatedJobs and getEsRecordsToDelete', () => {

  describe('when jobs_id is duplicate with same file_update_date in both datasets', () => {
    const endpointDataset = [{
      jobs_id: [ '30734004' ],
      file_update_date: [ '2019-09-01T20:45:00Z' ]
    }];

    const esHits = [{
      _index: 'job-bank-en',
      _type: '_doc',
      _id: 'vTyF72wBrRz27yv2XMyw',
      _score: 1,
      _source: { file_update_date: '2019-09-01T20:45:00Z', jobs_id: '30734004' }
    }];

    it('should be returned by neither get function', () => {
      return expect(jobBank.getNewOrUpdatedJobs(endpointDataset, esHits)).to.deep.equal([]) &&
        expect(jobBank.getEsRecordsToDelete(endpointDataset, esHits)).to.deep.equal([]);
    });
  });

  describe('when jobs_id is duplicate and file_update_date is more recent in endpoint data', () => {
    const endpointDataset = [{
      jobs_id: [ '30733886' ],
      file_update_date: [ '2019-09-01T20:37:01Z' ]
    }];

    const esHits = [{
      _index: 'job-bank-en',
      _type: '_doc',
      _id: 'vzyF72wBrRz27yv2XMyw',
      _score: 1,
      _source: { file_update_date: '2019-09-01T20:37:00Z', jobs_id: '30733886' }
    }];

    it('should be returned by both get functions', () => {
      return expect(jobBank.getNewOrUpdatedJobs(endpointDataset, esHits)).to.deep.equal([{
          jobs_id: [ '30733886' ],
          file_update_date: [ '2019-09-01T20:37:01Z' ]
        }]) &&
        expect(jobBank.getEsRecordsToDelete(endpointDataset, esHits)).to.deep.equal([{
          _index: 'job-bank-en',
          _type: '_doc',
          _id: 'vzyF72wBrRz27yv2XMyw',
          _score: 1,
          _source: { file_update_date: '2019-09-01T20:37:00Z', jobs_id: '30733886' }
        }]);
    });
  });

  describe('when jobs_id exists only in ES records', () => {
    const endpointDataset = [];

    const esHits = [{
      _index: 'job-bank-en',
      _type: '_doc',
      _id: 'vzyF72wBrRz27yv2XMyw',
      _score: 1,
      _source: { file_update_date: '2019-09-01T20:37:00Z', jobs_id: '30733886' }
    }];

    it('should be returned by getEsRecordsToDelete', () => {
      return expect(jobBank.getNewOrUpdatedJobs(endpointDataset, esHits)).to.deep.equal([]) &&
        expect(jobBank.getEsRecordsToDelete(endpointDataset, esHits)).to.deep.equal([{
          _index: 'job-bank-en',
          _type: '_doc',
          _id: 'vzyF72wBrRz27yv2XMyw',
          _score: 1,
          _source: { file_update_date: '2019-09-01T20:37:00Z', jobs_id: '30733886' }
        }]);
    });
  });

  describe('when jobs_id is new in endpoint data', () => {
    const endpointDataset = [{
      jobs_id: [ '30733886' ],
      file_update_date: [ '2019-09-01T20:37:01Z' ]
    }];

    const esHits = [];

    it('should be returned by getNewOrUpdatedJobs', () => {
      return expect(jobBank.getNewOrUpdatedJobs(endpointDataset, esHits)).to.deep.equal([{
          jobs_id: [ '30733886' ],
          file_update_date: [ '2019-09-01T20:37:01Z' ]
        }]) &&
        expect(jobBank.getEsRecordsToDelete(endpointDataset, esHits)).to.deep.equal([]);
    });
  });
});

describe('createJobsArray', () => {

  let initialDatasetJSON = [
    {
      jobs_id: ['30954482'],
      file_update_date: ['2019-08-01T09:59:00Z']
    },
    {
      jobs_id: ['30954475'],
      file_update_date: ['2019-08-01T09:58:00Z']
    }
  ];

  let endpointResponse = '<SolrResponse>\n<Header>\n<status>0</status>\n<QTime>0</QTime>\n' +
    '<numFound>1</numFound>\n</Header>\n<Documents>\n<Document>\n' +
    '<jobs_id>30954481</jobs_id>\n<noc_2011>6622</noc_2011>\n' +
    '<skill_level>D</skill_level>\n<remote_cd>1275007</remote_cd>\n<title>produce ' +
    'clerk, supermarket</title>\n<noc>6622</noc>\n' +
    '<province_cd>\n<string>ON</string>\n</province_cd>\n<salary>\n<string>$14.00 ' +
    'hourly</string>\n</salary>\n<employer_name>\n<string>Farm Boy</string>\n' +
    '</employer_name>\n</Document>\n</Documents>\n</SolrResponse>\n';

  let _toJsonResponse = {
    jobs_id: ['30954478'],
    noc_2011: ['6611'],
    skill_level: ['D'],
    remote_cd: ['1275008'],
    title: ['cashier, supermarket'],
    noc: ['6611'],
    naics_id: ['26'],
    hours: ['1 to 19 hours per week'],
    employer_name_case: ['Farm Boy'],
    employer_name_string: ['Farm Boy'],
    num_positions: ['1'],
    job_senior_flag: ['false']
  };


  describe('when all jobs successful', () => {

    before(() => {
      sinon.stub(jobBank, '_endpointCall').resolves(endpointResponse);
      sinon.stub(jobBank, '_toJson').resolves(_toJsonResponse);
    });

    after(() => {
      jobBank._endpointCall.restore();
      jobBank._toJson.restore();
    });

    it('should create an english dataset', () => {
      const func = () => jobBank.createJobsArray(initialDatasetJSON, 'en');
      return expect(func()).to.eventually.deep.equal({
        jobs: [
          {
            jobs_id: '30954478',
            noc_2011: '6611',
            skill_level: 'D',
            remote_cd: '1275008',
            title: 'cashier, supermarket',
            noc: '6611',
            naics_id: '26',
            hours: '1 to 19 hours per week',
            employer_name_case: 'Farm Boy',
            employer_name_string: 'Farm Boy',
            num_positions: '1',
            job_senior_flag: 'false'
          },
          {
            jobs_id: '30954478',
            noc_2011: '6611',
            skill_level: 'D',
            remote_cd: '1275008',
            title: 'cashier, supermarket',
            noc: '6611',
            naics_id: '26',
            hours: '1 to 19 hours per week',
            employer_name_case: 'Farm Boy',
            employer_name_string: 'Farm Boy',
            num_positions: '1',
            job_senior_flag: 'false'
          }
        ],
        errors: []
      });
    })
  });

  describe('when not all jobs successful', () => {

    before(() => {
      sinon.stub(jobBank, '_endpointCall')
        .onFirstCall().resolves(endpointResponse)
        .onSecondCall().rejects();
      sinon.stub(jobBank, '_toJson').resolves(_toJsonResponse);
    });

    after(() => {
      jobBank._endpointCall.restore();
      jobBank._toJson.restore();
    });

    it('should return an object with a successful jobs array and an errors array', () => {
      const func = () => jobBank.createJobsArray(initialDatasetJSON, 'en');
      return expect(func()).to.eventually.deep.equal({
        jobs: [
          {
            jobs_id: '30954478',
            noc_2011: '6611',
            skill_level: 'D',
            remote_cd: '1275008',
            title: 'cashier, supermarket',
            noc: '6611',
            naics_id: '26',
            hours: '1 to 19 hours per week',
            employer_name_case: 'Farm Boy',
            employer_name_string: 'Farm Boy',
            num_positions: '1',
            job_senior_flag: 'false'
          }
        ],
        errors: [ '30954475' ]
      });
    });
  });
});

describe('createBulkPushArray', () => {

  let arrayOfJobs = [
    {
      jobs_id: '30955317',
      noc_2011: '8432',
      skill_level: 'C',
      remote_cd: '1273956',
      title: 'greenhouse worker',
      noc: '8432',
      province_cd: 'ON',
      salary: '$14.00 hourly',
      employer_name: 'Pomas Farms Inc.'
    },
    {
      jobs_id: '30955317',
      noc_2011: '8432',
      skill_level: 'C',
      remote_cd: '1273956',
      title: 'greenhouse worker',
      noc: '8432',
      province_cd: 'ON',
      salary: '$14.00 hourly',
      employer_name: 'Pomas Farms Inc.'
    }
  ];

  let arrayofDeletes = [
    {
      _index: 'job-bank-en',
      _type: '_doc',
      _id: 'RHjKlWwB7UReD2qRuXHQ',
      _score: 1,
      _source: { file_update_date: '2019-08-15T10:00:00Z', jobs_id: '31039047' }
    }
  ]

  describe('when it receives an array of jobs', () => {
    it('should return an array of objects alternating between an es header object and a job object', () => {
      const func = () => jobBank.createBulkPushArray('job-bank-en', arrayOfJobs, []);
      return expect(func()).to.deep.equal([
        { index: { _index: 'job-bank-en' } },
        {
          jobs_id: '30955317',
          noc_2011: '8432',
          skill_level: 'C',
          remote_cd: '1273956',
          title: 'greenhouse worker',
          noc: '8432',
          province_cd: 'ON',
          salary: '$14.00 hourly',
          employer_name: 'Pomas Farms Inc.'
        },
        { index: { _index: 'job-bank-en' } },
        {
          jobs_id: '30955317',
          noc_2011: '8432',
          skill_level: 'C',
          remote_cd: '1273956',
          title: 'greenhouse worker',
          noc: '8432',
          province_cd: 'ON',
          salary: '$14.00 hourly',
          employer_name: 'Pomas Farms Inc.'
        }
      ])
    });
  });

  describe('when it receives an array of jobs and an array of jobs to delete', () => {
    const func = () => jobBank.createBulkPushArray('job-bank-en', arrayOfJobs, arrayofDeletes);
    return expect(func()).to.deep.equal([
      { index: { _index: 'job-bank-en' } },
      {
        jobs_id: '30955317',
        noc_2011: '8432',
        skill_level: 'C',
        remote_cd: '1273956',
        title: 'greenhouse worker',
        noc: '8432',
        province_cd: 'ON',
        salary: '$14.00 hourly',
        employer_name: 'Pomas Farms Inc.'
      },
      { index: { _index: 'job-bank-en' } },
      {
        jobs_id: '30955317',
        noc_2011: '8432',
        skill_level: 'C',
        remote_cd: '1273956',
        title: 'greenhouse worker',
        noc: '8432',
        province_cd: 'ON',
        salary: '$14.00 hourly',
        employer_name: 'Pomas Farms Inc.'
      },
      { delete: { _index: 'job-bank-en', _id: 'RHjKlWwB7UReD2qRuXHQ' }}
    ])
  });
});
