const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

// const index = require('../index.js');
const resetIndex = require('../../script/elasticsearch.js');

describe.skip('Main call', () => {
  it('should call resetIndex', (done) => {
    const mySpy = sinon.spy(resetIndex);
    mySpy();
    expect(mySpy.called).to.be.true;
    done();
  })
});

describe('ResetIndex', function () {
  // it('should return a statusCode', async function () {
  //   this.timeout(15000);
  //   const response = await resetIndex();
  //   expect(response.statusCode).to.be.a('number');
  // });
  //
  // it('statusCode should be 200', function () {
  //   this.timeout(15000);
  //   return resetIndex().then(function (resp) {
  //     expect(resp.statusCode).to.equal(200);
  //   });
  // });

  it('should return statusCode as a number', function () {
    this.timeout(60000);
    return resetIndex().then(function (resp) {
      expect(resp.statusCode).to.be.a('number');
    });
  })
});


