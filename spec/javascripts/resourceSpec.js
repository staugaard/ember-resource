describe('A Resource instance', function() {
  var Model, model, server;

  beforeEach(function() {
    Model = Ember.Resource.define({
      schema: {
        id:       Number,
        name:     String,
        subject:  String
      },
      url: '/people'
    });
  });

  describe("defining a resource", function() {

    describe("with a sideloads attribute", function() {

      var user, json, Subject;

      beforeEach(function() {
        // Global namespace required to respect Ember's
        // global-path-name-to-object conversion functionality
        window.Sideload = {};

        Sideload.Smoothie      = Em.Resource.define({
          schema: { fruit: Boolean },
          sideloads: { vegan: 'Sideload.SmoothieVegan'}
        });
        Sideload.SmoothieVegan = Em.Resource.define({ schema: { flavor: String, numberAsString: String }});
        Sideload.Burger        = Em.Resource.define({ schema: { cheese: Boolean, pounds: Number }});
        Subject                = Em.Resource.define({
          url: "/foods",
          schema: { status: String },
          sideloads: { burger: Sideload.Burger, smoothie: 'Sideload.Smoothie' },
          parse: function(json) { return json.foods; }
        });

        json = {
          foods: { status: 'hungry' },
          burger: { cheese: true, pounds: 0.5 },
          smoothie: { fruit: true, vegan: { flavor: 'tofu', numberAsString: '123' }}
        };
        spyOn(Em.Resource, 'ajax').andReturn($.when(json));

        food = Subject.create({id: 1});
        food.fetch();
      });

      afterEach(function() {
        window.Sideload = undefined;
      });

      it("should send the sideloads in AJAX fetches", function() {
        expect(Em.Resource.ajax).toHaveBeenCalledWith({
          url: "/foods/1",
          resource: food,
          operation: 'read',
          data: {include: "burger,smoothie"}
        });
      });

      it("should accept a sideload class or path (string)", function() {
        expect(food.burger.isEmberResource).toBeTruthy()
        expect(food.smoothie.isEmberResource).toBeTruthy();
      });

      it("should still load data in sideload parent", function() {
        expect(food.get('status')).toEqual('hungry');
      });

      it("should add sideload data", function() {
        expect(food.burger.get('cheese')).toBeTruthy();
        expect(food.burger.get('pounds')).toEqual(0.5);
        expect(food.smoothie.get('fruit')).toBeTruthy();
      });

      it("should recurse through nested sideloads", function() {
        expect(food.smoothie.vegan.get('flavor')).toEqual('tofu');
        expect(food.smoothie.vegan.get('numberAsString')).toEqual('123');
      });
    });
  });

  describe('with no ID', function() {

    beforeEach(function() {
      model = Model.create({});
    });

    it('does not fetch when setting an attribute', function() {
      spyOn(model, 'fetch');
      model.set('name', 'Patricia');
      expect(model.fetch).not.toHaveBeenCalled();
    });

    it('allows setting a property to undefined', function() {
      model.set('name', 'Carlos');
      expect(model.get('name')).toEqual('Carlos');
      model.set('name', undefined);
      expect(model.get('name')).toBeUndefined();
    });

  });

  describe('with a negative ID', function() {
    beforeEach(function() {
      model = Model.create({id: -1});
    });

    it('should not have a URL', function() {
      expect(model.resourceURL()).toBeUndefined();
    })
  });

  it('allows setting of properties not in the schema during creation', function() {
    model = Model.create({
      undefinedProperty: 'foo'
    });

    expect(model.get('undefinedProperty')).toEqual('foo');
  });

  it('allows setting functions during creation', function() {
    model = Model.create({
      undefinedProperty: function() { return 'foo'; }
    });

    expect(Ember.typeOf(model.undefinedProperty)).toEqual('function');
    expect(model.undefinedProperty()).toEqual('foo');
  });

  it('allows setting observers during creation', function() {
    var observerDidFire = false;
    model = Model.create({
      myObserver: function() { observerDidFire = true; }.observes('foo')
    });
    observerDidFire = false;
    model.set('foo', 'new value');

    expect(observerDidFire).toBe(true);
  });

  it('allows setting computed properties during creation', function() {
    model = Model.create({
      undefinedProperty: function() { return this.get('foo') + '!'; }.property('foo')
    });
    model.set('foo', 'foo');

    expect(model.get('undefinedProperty')).toEqual('foo!');
  });


  it('allows setting of properties not in the schema during creation, considering paths', function() {

    Model = Ember.Resource.define({
      schema: {
        id:       Number,
        name:     String,
        foo:      {type: String, path: 'data.foo'}
      },
      url: '/people'
    });

    model = Model.create({ id: 1, undefinedProperty: 'foo', entry_id: 1, foo: 'bar' });
    // expect(model.get('undefinedProperty')).toEqual('foo');
    // expect(model.get('id')).toEqual(1);

  });


  describe('updating objects already in identity map', function() {
    beforeEach(function() {
      model = Model.create({id: 1, name: 'blah'});
    });

    it('should update objects in the identity map with new data', function() {
      expect(model.get('subject')).toBeUndefined();
      model = Model.create({id: 1, name: 'boo', subject: 'bar'});
      expect(model.get('name')).toBe('boo');
      expect(model.get('subject')).toBe('bar');
    });
  });

  describe('when setting a property value', function() {
    beforeEach(function() {
      model = Model.create({name: 'Aardvark'});
    });

    it('should execute callbacks with the property name and new value', function() {
      spyOn(model, 'resourcePropertyWillChange');
      spyOn(model, 'resourcePropertyDidChange');
      model.set('name', 'Zebra');
      expect(model.resourcePropertyWillChange).toHaveBeenCalledWith('name', 'Zebra');
      expect(model.resourcePropertyDidChange).toHaveBeenCalledWith('name', 'Zebra');
    });
  });
});
