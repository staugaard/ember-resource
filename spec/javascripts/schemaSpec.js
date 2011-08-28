describe('schema definition', function() {
  it('should create Number properties', function() {
    var Model = SC.Resource.define({
      schema: {
        id:   Number,
        size: Number
      }
    });
    var data = {id: 1, size: '5'};
    var instance = Model.create(data);

    expect(instance.get('id')).toBe(1);
    expect(instance.get('size')).toBe(5);

    instance.set('id', '2');
    expect(data.id).toBe(2);

    instance.set('size', 3);
    expect(data.size).toBe(3);
  });

  it('should create String properties', function() {
    var Model = SC.Resource.define({
      schema: {
        id:   String,
        size: String
      }
    });
    var data = {id: 1, size: 'large'};
    var instance = Model.create(data);

    expect(instance.get('id')).toBe('1');
    expect(instance.get('size')).toBe('large');

    instance.set('id', 2);
    expect(data.id).toBe('2');

    instance.set('size', 'small');
    expect(data.size).toBe('small');
  });

  it('should create Date properties', function() {
    var date = new Date();
    var dateString = JSON.stringify(date).slice(1, -1);
    
    var Model = SC.Resource.define({
      schema: {
        createdAt: Date,
        updatedAt: Date
      }
    });
    var data = {createdAt: dateString, updatedAt: date};
    var instance = Model.create(data);

    expect(instance.get('createdAt')).toEqual(date);
    expect(instance.get('updatedAt')).toEqual(date);

    var date = new Date();
    var dateString = JSON.stringify(date).slice(1, -1);

    instance.set('createdAt', date);
    expect(data.createdAt).toEqual(date, "convert a Date instante to a Date instance");
    
    instance.set('updatedAt', dateString);
    expect(data.updatedAt).toEqual(date, 'convert a string ("' + dateString + '") to a Date instance');
  });

  it('should create Boolean properties', function() {
    var Model = SC.Resource.define({
      schema: {
        'public': Boolean,
        active:   Boolean,
        good:     Boolean,
        bad:      Boolean
      }
    });
    var data = {'public': true, active: false, good: 'true', bad: 'false'};
    var instance = Model.create(data);

    expect(instance.get('public')).toBe(true);
    expect(instance.get('active')).toBe(false);
    expect(instance.get('good')).toBe(true);
    expect(instance.get('bad')).toBe(false);

    instance.set('public', 'true');
    expect(data.public).toBe(true, "convert 'true' to true");

    instance.set('public', 'false');
    expect(data.public).toBe(false, "convert 'false' to false");

    instance.set('public', true);
    expect(data.public).toBe(true, "convert true to true");

    instance.set('public', false);
    expect(data.public).toBe(false, "convert false to false");
  });
});
