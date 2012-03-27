describe('deepMerge', function() {
  it('should add missing keys', function() {
    var obj = {};
    Ember.Resource.deepMerge(obj, {a: 'foo'});

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('foo');
  });

  it('should override keys', function() {
    var obj = {a: 'foo'};
    Ember.Resource.deepMerge(obj, {a: 'bar'});

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('bar');
  });

  it('should not override keys if values are same', function() {
    var obj = {a: 'foo'};
    spyOn(Ember, 'set');
    Ember.Resource.deepMerge(obj, {a: 'foo'});
    expect(Ember.set).not.toHaveBeenCalledWith(obj, 'a', 'foo');
  });

  it('should not override keys if values are empty arrays', function() {
    var obj = {a: []};
    spyOn(Ember, 'set');
    Ember.Resource.deepMerge(obj, {a: []});
    expect(Ember.set).not.toHaveBeenCalledWith(obj, 'a', []);
  });

  it('should override keys if values are not empty arrays', function() {
    var obj = {a: [2]};
    Ember.Resource.deepMerge(obj, {a: [3]});
    expect(obj.a).toBeDefined();
    expect(obj.a.length).toBe(1);
    expect(obj.a[0]).toBe(3);
  });


  it('should leave other keys', function() {
    var obj = {a: 'foo'};
    Ember.Resource.deepMerge(obj, {b: 'bar'});

    expect(obj.a).toBeDefined();
    expect(obj.a).toBe('foo');
  });

  it('merge recursively', function() {
    var obj = {a: {b: 'foo'}};
    Ember.Resource.deepMerge(obj, {a: {b: 'bar'}});

    expect(obj.a.b).toBeDefined();
    expect(obj.a.b).toBe('bar');
  });
});
