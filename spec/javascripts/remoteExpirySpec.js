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
      this.resource = Resource.create();
      this.spy = spyOn(Ember.Resource.PushTransport, 'subscribe');
      Ember.sendEvent(this.resource, 'didFetch');
      Ember.run.sync();
    });

    it('should use the PushTransport', function() {
      expect(Ember.Resource.PushTransport.subscribe).toHaveBeenCalledWith("foo", jasmine.any(Function));
    });

    it('should subscribe to Ember.Resource.PushTransport', function() {
      expect(this.spy.callCount).toEqual(1);
    });

    it('should not subscribe more than once', function() {
      Ember.sendEvent(resource, 'didFetch');
      Ember.run.sync();
      expect(this.spy.callCount).toEqual(1);
    });
  });

  describe("updating expiry", function() {
    beforeEach(function() {
      Resource = Ember.Resource.define().extend({
        remoteExpiryKey: "foo"
      });
      this.resource = Resource.create();
      this.date = new Date(1345511310 * 1000);
      spyOn(this.resource, 'expire');
    });

    it('should expire resource when stale', function() {
      this.resource.updateExpiry({
        updatedAt: this.date
      });
      expect(this.resource.expire).toHaveBeenCalled();
    });

    it('should not expire resource when fresh', function() {
      this.resource.set('updatedAt', new Date((1345511310 + 200) * 1000));
      this.resource.updateExpiry({
        updatedAt: this.date
      });
      expect(this.resource.expire).not.toHaveBeenCalled();
    });

    it('should not expire resource when message is malformed', function() {
      this.resource.updateExpiry({});
      expect(this.resource.expire).not.toHaveBeenCalled();
    });
  });

});
