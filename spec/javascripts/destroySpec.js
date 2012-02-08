describe('Destroying a resource instance', function() {
  var Model, model, server;

  beforeEach(function() {
    Model = Ember.Resource.define({
      schema: {
        id:       Number,
        name:     String,
        subject:  String
      },
      url: '/people'
    });

    server = sinon.fakeServer.create();
  });

  afterEach(function() {
    server.restore();
    Ember.Resource.errorHandler = null;
  });

  describe('handling errors on destroy', function() {
    beforeEach(function() {
      server.respondWith('DELETE', '/people', [422, {}, '[["foo", "bar"]]']);
    });

    it('should pass a reference to the resource to the error handling function', function() {
      var spy = jasmine.createSpy();
      Ember.Resource.errorHandler = function(a, b, c, fourthArgument) {
        spy(fourthArgument);
      };

      var resource = Model.create({ name: 'f0o' });
      resource.destroy();
      server.respond();

      expect(spy).toHaveBeenCalledWith(resource);
    });
  });
});
