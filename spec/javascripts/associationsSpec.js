describe('association definition', function() {
  var Address = SC.Resource.define({
    schema: {
      street: String,
      zip:    Number
    }
  });

  describe('has one embedded', function() {
    it('should use embedded data', function() {
      var Person = SC.Resource.define({
        schema: {
          name: String,
          address: SC.Resource.nestedResource({className: Address})
        }
      });

      var data = {
        name: 'Joe Doe',
        address: {
          street: '1 My Street',
          zip: 12345
        }
      };

      var instance = Person.create(data);
      var address  = instance.get('address');

      expect(address instanceof Address).toBe(true);
      expect(address.get('data')).toBe(data.address);
    });

    it('should support path overriding', function() {
      var Person = SC.Resource.define({
        schema: {
          name: String,
          address: SC.Resource.nestedResource({className: Address, path: 'addresses.home'})
        }
      });

      var data = {
        name: 'Joe Doe',
        addresses: {
          home: {
            street: '1 My Street',
            zip: 12345
          }
        }
      };

      var instance = Person.create(data);
      var address  = instance.get('address');

      expect(address instanceof Address).toBe(true);
      expect(address.get('data')).toBe(data.addresses.home);
    });
  })
});
