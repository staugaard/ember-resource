describe('deepSet', function() {
  it('should set at the given path', function() {
    var obj = {};
    Ember.Resource.deepSet(obj, 'a', 'foo');

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('foo');
  });

  it('should overwrite at the given path', function() {
    var obj = {a: 'foo'};
    Ember.Resource.deepSet(obj, 'a', 'bar');

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('bar');
  });

  it('should create empty Object at missing nodes', function() {
    var obj = {};
    Ember.Resource.deepSet(obj, 'a.b.c', 'foo');

    expect(obj.a).toBeDefined();
    expect(Ember.typeOf(obj.a)).toBe('object');

    expect(obj.a.b).toBeDefined();
    expect(Ember.typeOf(obj.a.b)).toBe('object');

    expect(obj.a.b.c).toBeDefined();
    expect(obj.a.b.c).toBe('foo');
  });

});
