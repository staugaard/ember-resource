describe('identity map', function() {
  var Address = Em.Resource.define({
    identityMapLimit: 10
  });

  it('should default to a limit of DEFAULT_IDENTITY_MAP_LIMIT', function() {
    var Foo = Em.Resource.define();
    Foo.create({id: 1});
    expect(Foo.identityMap.limit()).toBe(Ember.Resource.IdentityMap.DEFAULT_IDENTITY_MAP_LIMIT);
  });

  it('should return the same object when requested multiple times', function() {
    var address1 = Address.create({id: 1});
    var address2 = Address.create({id: 1});
    expect(address1).toBe(address2);
  });

  it('should limit the number of objects retained', function() {
    var address;
    for(var i=1; i<=20; i++) {
      address = Address.create({id: i});
    }

    expect(Address.identityMap.size()).toBe(10);
  });

  describe("for resource collections", function() {
    var Addresses = Em.ResourceCollection.extend();

    Addresses.reopenClass({
      identityMapLimit: 10
    });

    it('should default to a limit of 5x DEFAULT_IDENTITY_MAP_LIMIT', function() {
      var Foo = Em.ResourceCollection.extend();
      Foo.create({type: Address, url: '/foo'});
      expect(Foo.identityMap.limit()).toBe(Ember.Resource.IdentityMap.DEFAULT_IDENTITY_MAP_LIMIT * 5);
    });

    it('should return the same object when requested multiple times', function() {
      var addresses1 = Addresses.create({type: Address, url: '/address/'});
      var addresses2 = Addresses.create({type: Address, url: '/address/'});

      expect(addresses1).toBe(addresses2);
    });

    it('should limit the number of objects retained', function() {
      var address;
      for(var i=1; i<=20; i++) {
        address = Addresses.create({type: Address, url: '/address/' + i});
      }

      expect(Address.identityMap.size()).toBe(10);
    });


  });
});
