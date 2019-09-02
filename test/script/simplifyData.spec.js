const chai = require('chai');
const expect = chai.expect;

const simplifyData = require('../../script/simplifyData.js');

describe('simplifyData.js', () => {
  describe('simplifyData', () => {
    describe('when passing in an object with single item arrays as values', () => {
      it('should return an object where the values are the single items not wrapped in an array', () => {
        const result = simplifyData({
          jobs_id: ['30756750'],
          noc_2011: ['8432'],
        });
        return expect(result).to.deep.equal({
          jobs_id: '30756750',
          noc_2011: '8432',
        });
      });
    });
    describe('when passing in a string', () => {
      it('should return a string', () => {
        const result = simplifyData('item');
        return expect(result).to.equal('item');
      });
    });
    describe('when receiving multiple layers of single-item arrays and objects nested inside one another', () => {
      it('should return a simple object with no arrays', () => {
        const result = simplifyData({
          province_cd: [{string: ['ON']}],
          salary: [{string: ['$14.00 hourly']}],
        });
        return expect(result).to.deep.equal({
          province_cd: 'ON',
          salary: '$14.00 hourly',
        });
      });
    });
    describe('when receiving an array with objects of arrays, etc', () => {
      it('should return a simple object with no arrays', () => {
        const result = simplifyData([
          {
            app_online: [''],
            app_email: ['mdoffice23b@gmail.com'],
            app_phone: [{
              app_phone_number: 'whoa a string',
              app_phone_ext: ['whoa, an array item'],
              app_phone_start_bus_hours: ['0', '1', '2'],
            }],
          },
        ]
        );
        return expect(result).to.deep.equal({
          app_online: '',
          app_email: 'mdoffice23b@gmail.com',
          app_phone: {
            app_phone_number: 'whoa a string',
            app_phone_ext: 'whoa, an array item',
            app_phone_start_bus_hours: ['0', '1', '2'],
          },
        });
      });
    });
  });

  describe('_simplifyArray', () => {
    describe('when the array is empty', () => {
      it('should return null', () => {
        const result = simplifyData._simplifyArray([]);
        return expect(result).to.equal(null);
      });
    });
    describe('when the array has a single string element', () => {
      it('should return the string back', () => {
        const result = simplifyData._simplifyArray(['test']);
        return expect(result).to.equal('test');
      });
    });
    describe('when the array has many string elements', () => {
      it('should return an array of strings back', () => {
        const result = simplifyData._simplifyArray(['test', 'othertest', 'excessive testing']);
        return expect(result).to.deep.equal(['test', 'othertest', 'excessive testing']);
      });
    });
  });

  describe('_simplifyObject', () => {
    describe('when the object is empty', () => {
      it('should return null', () => {
        const result = simplifyData._simplifyObject({});
        return expect(result).to.equal(null);
      });
    });
    describe('when the object has a single key', () => {
      it('should return that key\'s value', () => {
        const result = simplifyData._simplifyObject({key: 'value'});
        return expect(result).to.deep.equal('value');
      });
    });
    describe('when the object has multiple keys', () => {
      it('should return that object back', () => {
        const result = simplifyData._simplifyObject({key: 'value', otherKey: 'otherValue'});
        return expect(result).to.deep.equal({key: 'value', otherKey: 'otherValue'});
      });
    });
  });
});
