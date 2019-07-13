const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const axios = require('axios');
const getData = require('../../script/getData.js');
const simplify = require('../../script/simplifyData.js');


describe('getData', () => {

  describe('when the initial endpoint call is successful', () => {

    let endpointResponse = {data: '<SolrResponse>\n<Header>\n<status>0</status>\n<QTime>0</QTime>\n' +
        '<numFound>1</numFound>\n</Header>\n<Documents>\n' +
        '<Document>\n<jobs_id>30514572</jobs_id>\n' +
        '<file_update_date>2019-06-14T08:38:00Z</file_update_date>\n</Document>\n' +
        '<Document>\n<jobs_id>30514467</jobs_id>\n' +
        '<file_update_date>2019-06-14T08:37:00Z</file_update_date>\n</Document>\n' +
        '<Document>\n<jobs_id>30514479</jobs_id>\n' +
        '<file_update_date>2019-06-14T08:37:00Z</file_update_date>\n</Document>\n' +
        '</Documents>\n</SolrResponse>\n'};

    let dataSet = [
      { index: { _index: 'job-bank-en', _type: 'job' } },
      {
        jobs_id: '30763591',
        noc_2011: '6311',
        skill_level: 'B',
        remote_cd: '1234529',
        title: 'food service supervisor',
        noc: '6311',
        work_period_cd: 'F',
        employer_type_id: '0'
      },
      { index: { _index: 'job-bank-en', _type: 'job' } },
      {
        jobs_id: '30763591',
        noc_2011: '6311',
        skill_level: 'B',
        remote_cd: '1234529',
        title: 'food service supervisor',
        noc: '6311',
        work_period_cd: 'F',
        employer_type_id: '0'
      }
    ];

    beforeEach(() => {
      sinon.stub(getData, 'endpointCall').resolves(endpointResponse);
      sinon.stub(getData, 'createDataSet').resolves(dataSet);
      //not sure whether I should also stub out simplify (which is used by createDataSet)
    });

    afterEach(() => {
      getData.endpointCall.restore();
      getData.createDataSet.restore();
      //if I do stub out simplify then I should restore it afterwards
    });

    describe('when an english index is required', () => {
      it('should create an object with an english dataset', () => {
        return getData.getData(true, false).then(result => {
          return expect(result.english).to.deep.equal(dataSet) && expect(result.french).to.equal(undefined);
        });
      });
    });
    describe('when a french index is required', () => {
      it('should create an object with a french dataset', () => {
        return getData.getData(false, true).then(result => {
          return expect(result.french).to.deep.equal(dataSet) && expect(result.english).to.equal(undefined);
        });
      });
    });
    describe('when both english and french indices are required', () => {
      it('should create an object with an english dataset and a french dataset', () => {
        return getData.getData(true, true).then(result => {
          return expect(result.english).to.deep.equal(dataSet) && expect(result.french).to.equal(dataSet);
        });
      });
    });
  });

  describe('describe when the initial endpoint call fails', () => {

    before(() => {
      sinon.stub(getData, 'endpointCall').rejects();
      //not sure whether I should also stub out simplify (which is used by createDataSet)
    });

    after(() => {
      getData.endpointCall.restore();
      //if I do stub out simplify then I should restore it afterwards
    });

    it('should throw an error and exit the process', () => {
      // return getData.getData(true, false).then(result => {
      //   return expect(result).to.equal('this should not be hit; you want to hit the error')
      // }, err => {
      //   console.log('error');
      // });
      expect(getData.getData(true, true)).to.exit.with.code(1);
    });
  });
});

describe('endpointCall', () => {
  describe('when endpoint is successfully reached', () => {

    before(() => {
      sinon.stub(axios, 'get').resolves({ status: 200, statusText: 'ok', data: '' });
    });

    after(() => {
      axios.get.restore();
    });

    it('should return a 200 status code', () => {
      return getData.endpointCall('www.test.noturl').then(result => {
        return expect(result.status).to.equal(200);
      });
      // let result = endpointStub('www.url.url');
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
      return getData.endpointCall('www.test.noturl').then(result => {
        return expect(result.status).to.equal(200);
      });
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
      //not too sure how to handle the undesirable event that I accidentally successfully reach the endpoint
      //but I want to make sure that if I do, an error is thrown
      return getData._endpointCall('stillnotareal.url').then(result => {
        return expect(result).to.equal('this should not be hit; you want to hit the error')
      }, err => {
        return expect(err).to.deep.equal({err: 'no dice'});
      })
    });
  });
});

describe('_createDataSet', () => {

  let tempDataSet = [{
      jobs_id: [ '30763591' ],
      file_update_date: [ '2019-07-10T16:00:00Z' ]
    },
    {
      jobs_id: [ '30763591' ],
      file_update_date: [ '2019-07-10T15:59:00Z' ]
    }];

  let endpointResponse = {data: '<SolrResponse>\n<Header>\n<status>0</status>\n<QTime>0</QTime>\n' +
      '<numFound>1</numFound>\n</Header>\n<Documents>\n<Document>\n' +
      '<jobs_id>30763591</jobs_id>\n<noc_2011>6311</noc_2011>\n' +
      '<skill_level>B</skill_level>\n<remote_cd>1234529</remote_cd>\n<title>food ' +
      'service supervisor</title>\n<noc>6311</noc>\n' +
      '<work_period_cd>F</work_period_cd>\n<employer_type_id>0</employer_type_id>\n' +
      '</Document>\n</Documents>\n</SolrResponse>\n'};

  describe('when it receives an array of job ID objects and the endpoint successfully returns an xml object', () => {

    before(() => {
      sinon.stub(getData, 'endpointCall').resolves(endpointResponse);
      //not sure whether I should also stub out simplify (which is used by createDataSet)
    });

    after(() => {
      getData.endpointCall.restore();
      //if I do stub out simplify then I should restore it afterwards
    });

    it('should convert it to a json object prepended by an elasticsearch index object', () => {
      return getData.createDataSet(tempDataSet, 'en', 'job-bank-en', 'job').then(result => {
        return expect(result).to.deep.equal([
            { index: { _index: 'job-bank-en', _type: 'job' } },
            {
              jobs_id: '30763591',
              noc_2011: '6311',
              skill_level: 'B',
              remote_cd: '1234529',
              title: 'food service supervisor',
              noc: '6311',
              work_period_cd: 'F',
              employer_type_id: '0'
            },
            { index: { _index: 'job-bank-en', _type: 'job' } },
            {
              jobs_id: '30763591',
              noc_2011: '6311',
              skill_level: 'B',
              remote_cd: '1234529',
              title: 'food service supervisor',
              noc: '6311',
              work_period_cd: 'F',
              employer_type_id: '0'
            }
          ]
        )
      })
    });
  });

  //i assume I don't need to test myself for the npm package i'm relying on to convert xml to json
  //at any rate, if it fails, this test will definitely fail
});
