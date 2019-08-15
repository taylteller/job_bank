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

describe('bulkSave', () => {

  describe('when it receives an object with an array of correctly alternating objects', () => {
    it('should push the data to the supplied index', () => {
      return elasticsearch.bulkSave(
        [
          { index: { _index: 'any' }},
          {stuff: 'things'},
          { index: { _index: 'any' }},
          {stuff: 'things'}
        ]).then(resp => expect(resp).to.deep.equal(
          {
            body: {
              took: 88,
              errors: false,
              items: [ [Object], [Object], [Object], [Object] ]
            },
            statusCode: 200
          }
        )
      );
    })
  });

  describe('when it receives something other than an array for the body field of the object', () => {
    it('should return false', () => {
      return elasticsearch.bulkSave({ index: { _index: 'any' }}).then(resp => expect(resp).to.equal(false)
      );
    });
  });

  describe('when it receives an array with odd number of objects', () => {
    it('should return false', () => {
      return elasticsearch.bulkSave(
        [
          { index: { _index: 'any' }},
          {stuff: 'things'},
          { index: { _index: 'any' }}
        ]).then(resp => expect(resp).to.equal(false));
    });
  });

  describe('when odd numbered array items don\'t look like {index: {_index:\'test\'}, ...}', () => {
    it('should return false', () => {
      return elasticsearch.bulkSave(
        [
          { index: { _index: 'any' }},
          { index: { _index: 'any' }},
          {stuff: 'things'},
          {stuff: 'things'},
        ]).then(resp => expect(resp).to.equal(false));
    });
  });

});

describe('refresh', () => {
  describe('when performing a refresh on indices', () => {
    it('should return a response object', () => {
      return elasticsearch.refresh().then( resp => {
        return expect(resp).to.deep.equal({
          body: { _shards: { total: 2, successful: 2, failed: 0 } },
          statusCode: 200
        });
      })
    });
  });
});

describe('searchQuery', () => {

  before( async () => {
    return await elasticsearch.resetIndex('job-bank-en');
  });

  describe('when a query is performed ', () => {
    it('should return an array of matches', () => {
      return elasticsearch.searchQuery('roofer', 'job-bank-en', 20, 0, 'desc').then( resp => {
        return expect(Array.isArray(resp.body.hits.hits)).to.be.true;
      });
    });
  });
});
