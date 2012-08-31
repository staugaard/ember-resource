/*globals Ember, jasmine */
describe('remote expiry', function() {
  var Resource;
  describe('on a resource with a remote expiry key', function() {
    beforeEach(function() {
      Resource = Ember.Resource.define().extend({
        remoteExpiryKey: "foo"
      });
      this.resource = Resource.create();
      spyOn(this.resource, 'subscribeForExpiry');
    });

    it('should subscribe for expiry on fetch', function() {
      Ember.sendEvent(this.resource, 'didFetch');
      Ember.run.sync();
      expect(this.resource.subscribeForExpiry).toHaveBeenCalled();
    });
  });

  describe('on a resource with no remote expiry key', function() {
    beforeEach(function() {
      Resource = Ember.Resource.define().extend();
      this.resource = Resource.create();
      spyOn(this.resource, 'subscribeForExpiry');
    });

    it('should not subscribe for expiry on fetch', function() {
      Ember.sendEvent(this.resource, 'didFetch');
      Ember.run.sync();
      expect(this.resource.subscribeForExpiry).not.toHaveBeenCalled();
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
      Ember.sendEvent(this.resource, 'didFetch');
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
      this.date = 1345511310;
      spyOn(this.resource, 'expire');
      spyOn(this.resource, 'fetch');
    });

    it('should expire resource when stale', function() {
      this.resource.updateExpiry({
        updatedAt: this.date
      });
      expect(this.resource.expire).toHaveBeenCalled();
    });

    it('should not expire resource when fresh', function() {
      this.resource.set('expiryUpdatedAt', 1345511310 + 200);
      this.resource.updateExpiry({
        updatedAt: this.date
      });
      expect(this.resource.expire).not.toHaveBeenCalled();
    });

    it('should not expire resource when message is malformed', function() {
      this.resource.updateExpiry({});
      expect(this.resource.expire).not.toHaveBeenCalled();
    });

    describe("with remote expiry auto fetch", function() {
      beforeEach(function() {
        this.resource.set('remoteExpiryAutoFetch', true);
      });

      it('should refetch resource when stale', function() {
        var resource = this.resource;

        this.resource.updateExpiry({
          updatedAt: this.date
        });

        waitsFor(function() {
          return resource.get('isExpired');
        }, 'resource never expired', 1000);

        runs(function() {
          expect(this.resource.fetch).toHaveBeenCalled();
          expect(this.resource.expire).not.toHaveBeenCalled();
        });
      });

      it('should not refetch resource when fresh', function() {
        this.resource.set('expiryUpdatedAt', 1345511310 + 200);
        this.resource.updateExpiry({
          updatedAt: this.date
        });
        expect(this.resource.expire).not.toHaveBeenCalled();
        expect(this.resource.fetch).not.toHaveBeenCalled();
      });

      it('should not refetch resource when message is malformed', function() {
        this.resource.updateExpiry({});
        expect(this.resource.expire).not.toHaveBeenCalled();
        expect(this.resource.fetch).not.toHaveBeenCalled();
      });
    });
  });
});
