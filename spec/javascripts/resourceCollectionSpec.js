/*globals Em*/

describe('ResourceCollection', function() {

  it("reads from it's url property if present", function() {
    var Model = Em.Resource.define({
      url: '/url/from/resource'
    });

    var collection = Em.ResourceCollection.create({
      type: Model,

      url: function() {
        return '/url/from/collection';
      }.property().cacheable()
    });

    expect(collection.resolveUrl()).toEqual('/url/from/collection');
  });

});
