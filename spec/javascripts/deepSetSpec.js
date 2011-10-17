describe('deepSet', function() {
  it('should set at the given path', function() {
    var obj = {};
    SC.Resource.deepSet(obj, 'a', 'foo');

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('foo');
  });

  it('should overwrite at the given path', function() {
    var obj = {a: 'foo'};
    SC.Resource.deepSet(obj, 'a', 'bar');

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('bar');
  });

  it('should create empty Object at missing nodes', function() {
    var obj = {};
    SC.Resource.deepSet(obj, 'a.b.c', 'foo');

    expect(obj.a).toBeDefined();
    expect(SC.typeOf(obj.a)).toBe('object');

    expect(obj.a.b).toBeDefined();
    expect(SC.typeOf(obj.a.b)).toBe('object');

    expect(obj.a.b.c).toBeDefined();
    expect(obj.a.b.c).toBe('foo');
  });

});
