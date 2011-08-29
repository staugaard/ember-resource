describe('associations', function() {
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
          address: {type: Address, nested: true}
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

      instance.set('address', Address.create({street: '2 Your Street'}));
      expect(data.address.street).toBe('2 Your Street');
      expect(data.address.zip).toBeUndefined();
    });

    it('should support key overriding', function() {
      var Person = SC.Resource.define({
        schema: {
          name: String,
          address: {type: Address, nested: true, key: 'home_address'}
        }
      });

      var data = {
        name: 'Joe Doe',
        home_address: {
          street: '1 My Street',
          zip: 12345
        }
      };

      var instance = Person.create(data);
      var address  = instance.get('address');

      expect(address instanceof Address).toBe(true);
      expect(address.get('data')).toBe(data.home_address);

      instance.set('address', Address.create({street: '2 Your Street'}));
      expect(data.home_address.street).toBe('2 Your Street');
      expect(data.home_address.zip).toBeUndefined();
    });
  });

  describe('has many', function() {
    var Person;

    describe('with url', function() {

      beforeEach(function() {
        Person = SC.Resource.define({
          schema: {
            name: String,
            home_address: {
              type: SC.ResourceCollection,
              itemType: Address,
              url: '/people/%@/addresses'
            },
            work_addresses: {
              type: SC.ResourceCollection,
              itemType: Address,
              url: function(instance) {
                return '/people/' + instance.get('id') + '/addresses';
              }
            }
          }
        });
      });

    });

    describe('nested', function() {
      beforeEach(function() {
        Person = SC.Resource.define({
          schema: {
            name: String,
            home_address: {
              type: SC.ResourceCollection,
              itemType: Address,
              nested: true
            },
            work_addresses: {
              type: SC.ResourceCollection,
              itemType: Address,
              nested: true,
              key: 'office_addresses'
            }
          }
        });
      });

    });

    describe('in array', function() {
      beforeEach(function() {
        Person = SC.Resource.define({
          schema: {
            name: String,
            home_address: {
              type: SC.ResourceCollection,
              itemType: Address,
              key: 'home_address_ids'
            }
          }
        });
      });

    });

  });
});
