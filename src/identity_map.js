(function() {
  Ember.Resource.IdentityMap = function(limit) {
    this.cache = new LRUCache(limit || Ember.Resource.IdentityMap.DEFAULT_IDENTITY_MAP_LIMIT);
    this.cache.shift = function() {
      var obj = LRUCache.prototype.shift.call(this);
      obj && obj.value && Em.Object.prototype.destroy.call(obj.value);
      return obj;
    };
  };

  Ember.Resource.IdentityMap.prototype = {
    get: function() {
      return LRUCache.prototype.get.apply(this.cache, arguments);
    },

    put: function() {
      return LRUCache.prototype.put.apply(this.cache, arguments);
    },

    clear: function() {
      return LRUCache.prototype.removeAll.apply(this.cache, arguments);
    },

    size: function() {
      return this.cache.size;
    },

    limit: function() {
      return this.cache.limit;
    }

  };

  Ember.Resource.IdentityMap.DEFAULT_IDENTITY_MAP_LIMIT = 30;

}());