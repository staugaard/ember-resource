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

    it('should support path overriding', function() {
      var Person = SC.Resource.define({
        schema: {
          name: String,
          address: {type: Address, nested: true, path: 'addresses.home'}
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

      instance.set('address', Address.create({street: '2 Your Street'}));
      expect(data.addresses.home.street).toBe('2 Your Street');
      expect(data.addresses.home.zip).toBeUndefined();
    });
  });

  describe('has many', function() {
    var Person;

    describe('with url', function() {

      beforeEach(function() {
        Person = SC.Resource.define({
          schema: {
            id:   Number,
            name: String,
            home_addresses: {
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

      it('should support url strings', function() {
        var person = Person.create({id: 1, name: 'Mick Staugaard'});
        var homeAddresses = person.get('home_addresses');
        
        expect(homeAddresses).toBeDefined();
        expect(homeAddresses instanceof SC.ResourceCollection).toBe(true);
        expect(homeAddresses.type).toBe(Address);
        expect(homeAddresses.url).toBe('/people/1/addresses');
      })

      it('should support url functions', function() {
        var person = Person.create({id: 1, name: 'Mick Staugaard'});
        var workAddresses = person.get('work_addresses');
        
        expect(workAddresses).toBeDefined();
        expect(workAddresses instanceof SC.ResourceCollection).toBe(true);
        expect(workAddresses.type).toBe(Address);
        expect(workAddresses.url).toBe('/people/1/addresses');
      })
    });

    describe('nested', function() {
      beforeEach(function() {
        Person = SC.Resource.define({
          schema: {
            name: String,
            home_addresses: {
              type: SC.ResourceCollection,
              itemType: Address,
              nested: true
            },
            work_addresses: {
              type: SC.ResourceCollection,
              itemType: Address,
              nested: true,
              path: 'office_addresses'
            }
          }
        });
      });

      it('should use the nested data', function() {
        var data = {
          name: 'Joe Doe',
          home_addresses: [
            {
              street: '1 My Street',
              zip: 12345
            },
            {
              street: '2 Your Street',
              zip: 23456
            }
          ]
        };

        var person = Person.create(data);
        var homeAddresses = person.get('home_addresses');

        expect(homeAddresses).toBeDefined();
        expect(homeAddresses instanceof SC.ResourceCollection).toBe(true);
        expect(homeAddresses.type).toBe(Address);
        expect(homeAddresses.get('length')).toBe(2);

        var address;
        for (var i=0; i < data.home_addresses.length; i++) {
          address = homeAddresses.objectAt(i);
          expect(address).toBeDefined();
          expect(address instanceof Address).toBe(true);
          expect(address.get('street')).toBe(data.home_addresses[i].street);
          expect(address.get('zip')).toBe(data.home_addresses[i].zip);
        };

        address = homeAddresses.objectAt(0);

        address.set('street', '3 Other Street');
        expect(address.get('street')).toBe('3 Other Street');
        expect(data.home_addresses[0].street).toBe('3 Other Street');
      });
    });

    describe('in array', function() {
      beforeEach(function() {
        Person = SC.Resource.define({
          schema: {
            name: String,
            home_addresses: {
              type: SC.ResourceCollection,
              itemType: Address,
              path: 'home_address_ids'
            }
          }
        });
      });

    });

  });
});
