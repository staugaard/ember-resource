describe('schema definition', function() {
  describe('of attributes', function() {
    var Model, serialize;

    beforeEach(function() {
      serialize = function(value) { return value === 1; };

      Model = SC.Resource.define({
        schema: {
          id:       {type: Number, path: 'somewhere.deep.id'},
          size:     {type: Number},
          age:      Number,
          name:     String,
          birthday: Date,
          single:   Boolean,
          is_male:   {type: Boolean, serialize: serialize},
          is_female: {type: Boolean, deserialize: serialize}
        }
      });
    });

    it('should use the specified path if given', function() {
      expect(Model.schema.id.path).toBe('somewhere.deep.id');
    });

    it('should use the attribute name as path if not specified', function() {
      expect(Model.schema.size.path).toBe('size');
    });

    it('should support Number', function() {
      expect(Model.schema.age.type).toBe(Number);
      expect(Model.schema.age.path).toBe('age');
      expect(Model.schema.age.serialize).toBeDefined();
      expect(Model.schema.age.deserialize).toBeDefined();
    })

    it('should support String', function() {
      expect(Model.schema.name.type).toBe(String);
      expect(Model.schema.name.path).toBe('name');
      expect(Model.schema.name.serialize).toBeDefined();
      expect(Model.schema.name.deserialize).toBeDefined();
    })

    it('should support Date', function() {
      expect(Model.schema.birthday.type).toBe(Date);
      expect(Model.schema.birthday.path).toBe('birthday');
      expect(Model.schema.birthday.serialize).toBeDefined();
      expect(Model.schema.birthday.deserialize).toBeDefined();
    })

    it('should support Boolean', function() {
      expect(Model.schema.single.type).toBe(Boolean);
      expect(Model.schema.single.path).toBe('single');
      expect(Model.schema.single.serialize).toBeDefined();
      expect(Model.schema.single.deserialize).toBeDefined();
    })

    it('should allow a custom serialize', function() {
      expect(Model.schema.is_male.serialize).toBe(serialize);
      expect(Model.schema.is_male.deserialize).toBeDefined();
    })

    it('should allow a custom deserialize', function() {
      expect(Model.schema.is_female.serialize).toBeDefined();
      expect(Model.schema.is_female.deserialize).toBe(serialize);
    })
  });

  describe('of has-one associations', function() {
    var Person, Address;

    beforeEach(function() {
      Address = SC.Resource.define({
        schema: {
          street: String,
          zip:    Number
        }
      });

      Model = SC.Resource.define({
        schema: {
          home_address:  {type: Address},
          work_address:  {type: Address, path: 'work_addr_id'},
          work_addr_id:  String,
          other_address: {type: Address, nested: true}
        }
      });
    });

    it('should use the specified path when given', function() {
      expect(Model.schema.work_address.path).toBe('work_addr_id');
    });

    it('should guess a path from the name when not given', function() {
      expect(Model.schema.home_address.path).toBe('home_address_id');
    });

    it('should define a Number attribute at the path if not present', function() {
      expect(Model.schema.home_address_id).toBeDefined();
      expect(Model.schema.home_address_id.type).toBe(Number);
    });

    it('should not override the attribute at the path if present', function() {
      expect(Model.schema.work_addr_id).toBeDefined();
      expect(Model.schema.work_addr_id.type).toBe(String);
    });

    it('should not create an *_id attribute for nested associations', function() {
      expect(Model.schema.other_address_id).toBeUndefined();
    });
  })

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
    var dateString = date.toJSON();
    
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
    var dateString = date.toJSON();

    instance.set('createdAt', date);
    expect(data.createdAt).toEqual(dateString, "convert a Date instance to a string");
    
    instance.set('updatedAt', dateString);
    expect(data.updatedAt).toEqual(dateString, 'convert a string ("' + dateString + '") to a string');
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
