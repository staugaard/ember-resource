describe('toJSON', function() {
  var Address = SC.Resource.define({
    schema: {
      city: String,
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
      city: 'London',
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
