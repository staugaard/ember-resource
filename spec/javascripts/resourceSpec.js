describe('A Resource instance', function() {
  var Model, model;

  beforeEach(function() {
    Model = SC.Resource.define({
      schema: {
        id:       Number,
        name:     String
      }
    }).extend({
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

  it('allows setting of properties not in the schema during creation', function() {
    model = Model.create({ undefinedProperty: 'foo' });
    expect(model.get('undefinedProperty')).toEqual('foo');
  });

});
