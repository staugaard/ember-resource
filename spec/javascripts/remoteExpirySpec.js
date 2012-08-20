/*globals Ember, jasmine */
describe('remote expiry', function() {
  var Resource, resource;
  describe('on a resource with a remote expiry key', function() {
    beforeEach(function() {
      Resource = Ember.Resource.define().extend({
        remoteExpiryKey: "foo"
      });
      resource = Resource.create();
      spyOn(resource, 'subscribeForExpiry');
    });

    it('should subscribe for expiry on fetch', function() {
      Ember.sendEvent(resource, 'didFetch');
      Ember.run.sync();
      expect(resource.subscribeForExpiry).toHaveBeenCalled();
    });
  });


  describe('on a resource with no remote expiry key', function() {
    beforeEach(function() {
      Resource = Ember.Resource.define().extend();
      resource = Resource.create();
      spyOn(resource, 'subscribeForExpiry');
    });

    it('should not subscribe for expiry on fetch', function() {
      Ember.sendEvent(resource, 'didFetch');
      Ember.run.sync();
      expect(resource.subscribeForExpiry).not.toHaveBeenCalled();
    });
  });

  describe("subscribing for expiry", function() {
    beforeEach(function() {
      Resource = Ember.Resource.define().extend({
        remoteExpiryKey: "foo"
      });
      resource = Resource.create();
      spyOn(Ember.Resource.PushTransport, 'subscribe');
      Ember.sendEvent(resource, 'didFetch');
      Ember.run.sync();
    });

    it('should use the PushTransport', function() {
      expect(Ember.Resource.PushTransport.subscribe).toHaveBeenCalledWith("foo", jasmine.any(Function));
    });

  });

});
