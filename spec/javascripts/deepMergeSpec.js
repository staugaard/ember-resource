describe('deepMerge', function() {
  it('should add missing keys', function() {
    var obj = {};
    SC.Resource.deepMerge(obj, {a: 'foo'});

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('foo');
  });

  it('should override keys', function() {
    var obj = {a: 'foo'};
    SC.Resource.deepMerge(obj, {a: 'bar'});

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('bar');
  });

  it('should leave other keys', function() {
    var obj = {a: 'foo'};
    SC.Resource.deepMerge(obj, {b: 'bar'});

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('foo');
  });

  it('merge recursively', function() {
    var obj = {a: {b: 'foo'}};
    SC.Resource.deepMerge(obj, {a: {b: 'bar'}});

    expect(obj.a.b).toBeDefined();
    expect(obj.a.b).toBe('bar');
  });
});
