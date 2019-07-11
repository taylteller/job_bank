const chai = require('chai');
const expect = chai.expect;

const simplifyData = require('../../script/simplifyData.js');

describe('simplifyData.js', () => {

  describe('simplifyData', () => {
    describe('when passing in an object with single item arrays as values', () => {
      it('should return an object where the values are the single items not wrapped in an array', () => {
        let result = simplifyData({
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
        let result = simplifyData('item');
        return expect(result).to.equal('item');
      });
    });
    describe('when receiving an object value that is a single-item array of an object with a value of a single-item array', () => {
      it('should return a simple object with no arrays', () => {
        let result = simplifyData({
          province_cd: [ { string: [ 'ON' ] } ],
          salary: [ { string: ['$14.00 hourly'] } ]
        });
        return expect(result).to.deep.equal({
          province_cd: 'ON',
          salary: '$14.00 hourly'
        });
      });
    });
    describe('when receiving an array with objects of arrays, etc', () => {
      it('should return a simple object with no arrays', () => {
        let result = simplifyData([
            {
              app_online: [ '' ],
              app_email: [ 'mdoffice23b@gmail.com' ],
              app_phone: [ {
                app_phone_number: [ '' ],
                app_phone_ext: [ '' ],
                app_phone_start_bus_hours: [ '' ],
                app_phone_end_bus_hours: [ '' ]
              } ],
              app_fax: [ '' ],
              app_person: [ {
                app_person_street: [ '' ],
                app_person_room: [ '' ],
                app_person_city: [ '' ],
                app_person_province: [ '' ],
                app_person_country: [ '' ],
                app_person_pstlcd: [ '' ],
                app_person_start_bus_hours: [ '' ],
                app_person_end_bus_hours: [ '' ]
              } ],
              app_mail: [ {
                app_mail_street: [ '' ],
                app_mail_room: [ '' ],
                app_mail_city: [ '' ],
                app_mail_province: [ '' ],
                app_mail_country: [ '' ],
                app_mail_pstlcd: [ '' ]
              } ]
            }
          ]
        );
        return expect(result).to.deep.equal({
          app_online: '',
          app_email: 'mdoffice23b@gmail.com',
          app_phone: {
            app_phone_number: '',
            app_phone_ext: '',
            app_phone_start_bus_hours: '',
            app_phone_end_bus_hours: ''
          },
          app_fax: '',
          app_person: {
            app_person_street: '',
            app_person_room: '',
            app_person_city: '',
            app_person_province: '',
            app_person_country: '',
            app_person_pstlcd: '',
            app_person_start_bus_hours: '',
            app_person_end_bus_hours: ''
          },
          app_mail: {
            app_mail_street: '',
            app_mail_room: '',
            app_mail_city: '',
            app_mail_province: '',
            app_mail_country: '',
            app_mail_pstlcd: ''
          }
        });
      });
    });
  });

  describe('_simplifyArray', () => {
    describe('when the array is empty', () => {
      it('should return null', () => {
        let result = simplifyData._simplifyArray([]);
        return expect(result).to.equal(null);
      });
    });
    describe('when the array has a single string element', () => {
      it('should return the string back', () => {
        let result = simplifyData._simplifyArray(['test']);
        return expect(result).to.equal('test');
      });
    });
    describe('when the array has many string elements', () => {
      it('should return an array of strings back', () => {
        let result = simplifyData._simplifyArray(['test', 'othertest', 'excessive testing']);
        return expect(result).to.deep.equal(['test', 'othertest', 'excessive testing']);
      });
    });
  });

  describe('_simplifyObject', () => {
    describe('when the object is empty', () => {
      it('should return null', () => {
        let result = simplifyData._simplifyObject({});
        return expect(result).to.equal(null);
      });
    });
    describe('when the object has a single key', () => {
      it('should return that key\'s value', () => {
        let result = simplifyData._simplifyObject({key: 'value'});
        return expect(result).to.deep.equal('value');
      });
    });
    describe('when the object has multiple keys', () => {
      it('should return that object back', () => {
        let result = simplifyData._simplifyObject({key: 'value', otherKey: 'otherValue'});
        return expect(result).to.deep.equal({key: 'value', otherKey: 'otherValue'});
      });
    });
  });
});
