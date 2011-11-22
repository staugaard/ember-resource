describe('A Resource instance', function() {
  var Model, model, server;

  beforeEach(function() {
    Model = SC.Resource.define({
      schema: {
        id:       Number,
        name:     String,
        subject:  String
      },
      url: '/people'
    });

  });

  describe('with no ID', function() {

    beforeEach(function() {
      model = Model.create({});
    });

    it('does not fetch when setting an attribute', function() {
      spyOn(model, 'fetch');
      model.set('name', 'Patricia');
      expect(model.fetch).not.toHaveBeenCalled();
    });

    it('allows setting a property to undefined', function() {
      model.set('name', 'Carlos');
      expect(model.get('name')).toEqual('Carlos');
      model.set('name', undefined);
      expect(model.get('name')).toBeUndefined();
    });

  });

  describe('with a negative ID', function() {
    beforeEach(function() {
      model = Model.create({id: -1});
    });

    it('should not have a URL', function() {
      expect(model.resourceURL()).toBeUndefined();
    });
  });

  it('allows setting of properties not in the schema during creation', function() {
    model = Model.create({ undefinedProperty: 'foo' });
    expect(model.get('undefinedProperty')).toEqual('foo');
  });

  it('allows setting of properties not in the schema during creation, considering paths', function() {

    Model = SC.Resource.define({
      schema: {
        id:       Number,
        name:     String,
        foo:      {type: String, path: 'data.foo'}
      },
      url: '/people'
    });

    model = Model.create({ id: 1, undefinedProperty: 'foo', entry_id: 1, foo: 'bar' });
    // expect(model.get('undefinedProperty')).toEqual('foo');
    // expect(model.get('id')).toEqual(1);

  });


  describe('updating objects already in identity map', function() {
    beforeEach(function() {
      model = Model.create({id: 1, name: 'blah'});
    });

    it('should update objects in the identity map with new data', function() {
      expect(model.get('subject')).toBeUndefined();
      model = Model.create({id: 1, name: 'boo', subject: 'bar'});
      expect(model.get('name')).toBe('boo');
      expect(model.get('subject')).toBe('bar');
    });
  });

  describe('finding objects via find', function() {
      beforeEach(function() {
          model = Model.create({id: 1});
      });

      it('should return model for the given primary key if it exists', function() {
          expect(Model.find(1)).toBe(model);
      });

      it('should return null if no model with the given primary key exists', function() {
          expect(Model.find(2)).toBeNull();
      });
  });

});
