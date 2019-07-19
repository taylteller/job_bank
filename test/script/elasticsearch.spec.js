require('dotenv').config();

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const elasticsearch = require('../../script/elasticsearch.js');


const { Client } = require('@elastic/elasticsearch');
const mockES = require('../mock/elasticsearch.mock');

const client = !!+process.env.ES_MOCK ? new mockES.Client() :
  new Client({ node: process.env.ES_PORT || 'http://localhost:9200' });

describe('resetIndex', () => {

  const index = 'job-bank-en';

  describe('when the index doesn\'t exist yet', () => {
    it('should create it', () => {
      return elasticsearch.resetIndex(index).then( () => {
        return client.indices.exists({index:index}).then(response => {
          return expect(response.body).to.be.true;
        });
      });
    });
  });

  describe('when the index already exists', () => {
    it('should delete and recreate it', () => {
      return elasticsearch.resetIndex(index).then( () => {
        return client.indices.exists({index:index}).then(response => {
          return expect(response.body).to.be.true;
        });
      });
    });
  });

  describe('when resetIndex is called without an index parameter', () => {
    it('should throw an error', () => {
      return expect(elasticsearch.resetIndex()).to.throw;
    });
  });
});

describe.skip('bulkSave', () => {

  //TODO: will need to complete this test after refactoring bulkSave

  describe('when it receives an object with an array of correctly alternating objects', () => {
    it('should push the data to the supplied index', () => {
      return elasticsearch.bulkSave({ english:
        [
          { index: { _index: 'any' }},
          {stuff: 'things'},
          { index: { _index: 'any' }},
          {stuff: 'things'}
        ]}, true, false).then(resp => expect(resp).to.deep.equal(
          {
            body: {
              took: 88,
              errors: false,
              items: [ [Object], [Object], [Object], [Object] ]
            },
            statusCode: 200
          })
      );
    })
  });


  //if call bulksave with incorrect allrecords, should throw an error
  // --> lots of test cases...
  // otherwise, should return a success object


});
