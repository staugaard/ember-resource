(function(exports) {

  var Ember = exports.Ember, NullTransport = {
    subscribe: Ember.K,
    unsubscribe: Ember.K
  };

  Ember.Resource.PushTransport = NullTransport;

  var RemoteExpiry = Ember.Mixin.create({
    init: function() {
      var ret = this._super(),
          self = this,
          remoteExpiryScope = this.get('remoteExpiryKey');

      if(!this.get('remoteExpiryKey')) { return; }

      this.set('_subscribedForExpiry', false);

      if(!remoteExpiryScope) {
        return ret;
      }

      Ember.addListener(this, 'didFetch', this, function() {
        self.subscribeForExpiry();
      });

      return ret;
    },

    subscribeForExpiry: function() {
      var remoteExpiryScope = this.get('remoteExpiryKey'),
          updatedAt,
          self = this;

      if(!remoteExpiryScope) {
        return;
      }

      Ember.Resource.PushTransport.subscribe(remoteExpiryScope, function(message) {
        updatedAt = new Date(message.updated_at);
        if(self.stale(updatedAt)) {
          self.set('updatedAt', updatedAt);
          self.expire();
        }
      });

      this.set('_subscribedForExpiry', true);
    },

    stale: function(updatedAt) {
      return !this.get('updatedAt') || (+this.get('updatedAt') < +updatedAt);
    }
  });

  Ember.Resource.RemoteExpiry = RemoteExpiry;
}(this));
