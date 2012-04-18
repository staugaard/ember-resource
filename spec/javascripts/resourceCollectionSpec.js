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

  describe("when prepopulated", function() {

    beforeEach(function()  {
      this.collection = Em.ResourceCollection.create({
        type: Object,
        content: [ { name: 'hello' } ]
      });
    });

    it('knows it is prePopulated', function() {
      expect(this.collection.get('prePopulated')).toBeTruthy();
    });

    it('returns a resolved deferred for #fetch', function() {
      var result = this.collection.fetch();
      expect(result).not.toBeUndefined();
      expect(result.isResolved()).toBeTruthy();
    });

  });

});
