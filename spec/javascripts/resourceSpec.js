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
    })
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

  describe('SC.Resource.ajax', function() {
    beforeEach(function() {
      server = sinon.fakeServer.create();
    });

    afterEach(function() {
      server.restore();
      SC.Resource.errorHandler = null;
    });

    describe('saving', function() {
      var resource;

      beforeEach(function() {
        server.respondWith('POST', '/people', [201, {}, '']);
        resource = Model.create({ name: 'foo' });
        expect(resource.get('resourceState')).not.toBe(SC.Resource.Lifecycle.SAVING);
      });

      it('should change to the saving state while saving', function() {
        expect(resource.save()).toBeTruthy();
        expect(resource.get('resourceState')).toBe(SC.Resource.Lifecycle.SAVING);
      });

      it('should change to previous state after save completes', function() {
        var previousState = resource.get('resourceState');
        expect(resource.save()).toBeTruthy();
        expect(resource.get('resourceState')).not.toBe(previousState);
        server.respond();
        expect(resource.get('resourceState')).toBe(previousState);
      });

      it('should not allow concurrent saves', function() {
        expect(resource.save()).toBeTruthy();
        expect(resource.save()).toBe(false);
        server.respond();
        expect(resource.save()).toBeTruthy();
      });
    });

    describe('handling errors on save', function() {
      beforeEach(function() {
        server.respondWith('POST', '/people', [422, {}, '[["foo", "bar"]]']);
      });

      it('should pass a reference to the resource to the error handling function', function() {
        var spy = jasmine.createSpy();
        SC.Resource.errorHandler = function(a, b, c, fourthArgument) {
          spy(fourthArgument);
        }

        var resource = Model.create({ name: 'foo' });
        resource.save();
        server.respond();

        expect(spy).toHaveBeenCalledWith(resource);
      });
    });
  });

});
