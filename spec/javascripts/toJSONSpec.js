describe('toJSON', function() {
  describe('of nested objects', function() {
    var Address = SC.Resource.define({
      schema: {
        city: String
      }
    });

    var Person = SC.Resource.define({
      schema: {
        id:   Number,
        name: String,
        address: {
          type: Address,
          nested: true
        }
      }
    });

    var attributes = {
      name: 'John Smit',
      address: {
        city: 'London'
      }
    };

    it('should return updated values of nested objects', function() {
      var person  = Person.create(attributes),
          newCity = 'Liverpool',
          newName = 'Smit Johnson';

      SC.setPath(person, 'address.city', newCity);
      SC.set(person, 'name', newName);

      var json = person.toJSON();

      expect(json).toEqual({
        name: newName,
        address: { city: newCity }
      });
    });
  });

  describe('of remote has one associations', function() {
    var Address = SC.Resource.define({
      schema: {
        id:   Number,
        city: String
      }
    });

    var Person = SC.Resource.define({
      schema: {
        id:   Number,
        name: String,
        address: { type: Address }
      }
    });

    it('should return the id of the association at the path', function() {
      var address = Address.create({id: 1, city: 'San Francisco'});
      var person  = Person.create({id: 1, name: 'Mick Staugaard', address: address});

      var json = person.toJSON();
      expect(json.address).toBeUndefined();
      expect(json.address_id).toBe(1);
    });

  });

});
