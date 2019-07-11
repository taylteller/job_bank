const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const axios = require('axios');
const getData = require('../../script/getData.js');
const simplify = require('../../script/simplifyData.js');




describe('getData', () => {

});

describe('_endpointCall', () => {
  describe('when endpoint is successfully reached', () => {

    before(() => {
      sinon.stub(axios, 'get').resolves({ status: 200, statusText: 'ok', data: '' });
    });

    after(() => {
      axios.get.restore();
    });

    it('should return a 200 status code', () => {
      return getData._endpointCall('www.test.noturl').then(result => {
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
      return getData._endpointCall('www.test.noturl').then(result => {
        return expect(result.status).to.equal(200);
      });
    });
  });
  describe('when endpoint is never reached', () => {

    before(() => {
      sinon.stub(axios, 'get').rejects({err: 'no dice'});
    });

    after(() => {
      axios.get.restore();
    });
    it('should throw an error', () => {
      //not too sure how to handle the undesirable event that I accidentally successfully reach the endpoint
      //but I want to make sure that if I do, an error is thrown
      return getData._endpointCall('stillnotareal.url').then(result => {
        return expect(result).to.equal('this should never even have been hit; you want to hit the error')
      }, err => {
        return expect(err).to.deep.equal({err: 'no dice'});
      })
    });
  });
});

describe('_createDataSet', () => {

  let tempDataSet = [{
      jobs_id: [ '30763450' ],
      file_update_date: [ '2019-07-10T16:00:00Z' ]
    },
    {
      jobs_id: [ '30763238' ],
      file_update_date: [ '2019-07-10T15:59:00Z' ]
    }];

  let endpointResponse = {data: '<SolrResponse>\n<Header>\n<status>0</status>\n<QTime>0</QTime>\n' +
      '<numFound>1</numFound>\n</Header>\n<Documents>\n<Document>\n' +
      '<jobs_id>30763591</jobs_id>\n<noc_2011>6311</noc_2011>\n' +
      '<skill_level>B</skill_level>\n<remote_cd>1234529</remote_cd>\n<title>food ' +
      'service supervisor</title>\n<noc>6311</noc>\n' +
      '<work_period_cd>F</work_period_cd>\n<employer_type_id>0</employer_type_id>\n' +
      '</Document>\n</Documents>\n</SolrResponse>\n'};

  beforeEach(() => {
    sinon.stub(getData, '_endpointCall').resolves(endpointResponse);
    // sinon.stub(simplify).resolves();
  });

  afterEach(() => {
    getData._endpointCall.restore();
    // simplify.restore();
  });

  describe('', () => {
    it('', () => {
      return getData._createDataSet(tempDataSet, 'en', 'job-bank-en', 'job').then(result => {
        console.log('scurred',result);
      })
    });
  })

});
