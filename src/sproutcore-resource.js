(function(undefined) {
  var expandSchema, expandSchemaItem, createSchemaProperties,
      mergeSchemas;

  function isString(obj) {
    return !!(obj === '' || (obj && obj !== String && obj.charCodeAt && obj.substr));
  }

  function isObject(obj) {
    return obj === Object(obj);
  }

  SC.Resource = SC.Object.extend({});

  SC.Resource.deepSet = function(obj, path, value) {
    if (SC.typeOf(path) === 'string') {
      SC.Resource.deepSet(obj, path.split('.'), value);
      return;
    }

    var key = path.shift();

    if (path.length === 0) {
      SC.set(obj, key, value);
    } else {
      var newObj = SC.get(obj, key);

      if (newObj === null || newObj === undefined) {
        newObj = {};
        SC.set(obj, key, newObj);
      }

      SC.Resource.deepSet(newObj, path, value);
    }
  };

  SC.Resource.deepMerge = function(objA, objB) {
    var oldValue, newValue;

    for (var key in objB) {
      if (objB.hasOwnProperty(key)) {
        oldValue = SC.get(objA, key);
        newValue = SC.get(objB, key);

        if (SC.typeOf(newValue) === 'object' && SC.typeOf(oldValue) === 'object') {
          SC.Resource.deepMerge(oldValue, newValue);
        } else {
          SC.set(objA, key, newValue);
        }
      }
    }
  };

  SC.Resource.AbstractSchemaItem = SC.Object.extend({
    name: SC.required(String),
    fetchable: SC.required(Boolean),
    getValue: SC.required(Function),
    setValue: SC.required(Function),

    dependencies: function() {
      return ['data.' + this.get('path'), 'isExpired'];
    }.property('path'),

    data: function(instance) {
      return SC.get(instance, 'data');
    },

    type: function() {
      var type = this.get('theType');
      if (isString(type)) {
        type = SC.getPath(type);
        if (type) {
          this.set('theType', type);
        } else {
          type = this.get('theType');
        }
      }
      return type;
    }.property('theType'),

    propertyFunction: function(name, value) {
      var schemaItem = this.constructor.schema[name];
      if (arguments.length === 2) {
        schemaItem.setValue.call(schemaItem, this, value);
        value = schemaItem.getValue.call(schemaItem, this);
      } else {
        value = schemaItem.getValue.call(schemaItem, this);
        if ((value === undefined || SC.get(this, 'isExpired')) && schemaItem.get('fetchable')) {
          this.scheduleFetch();
        }
      }
      return value;
    },

    property: function() {
      return this.propertyFunction.property.apply(this.propertyFunction, this.get('dependencies')).cacheable();
    },

    toJSON: function(instance) {
      return undefined;
    }
  });
  SC.Resource.AbstractSchemaItem.reopenClass({
    create: function(name, schema) {
      var instance = this._super.apply(this);
      instance.set('name', name);
      return instance;
    }
  });


  SC.Resource.SchemaItem = SC.Resource.AbstractSchemaItem.extend({});

  SC.Resource.SchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];

      if (definition instanceof SC.Resource.AbstractSchemaItem) { return definition; }

      var type;
      if (definition === Number || definition === String || definition === Boolean || definition === Date || definition === Object) {
        definition = {type: definition};
        schema[name] = definition;
      }

      if(isObject(definition)) {
        type = definition.type;
      }

      if (type) {
        if (type.isSCResource || SC.typeOf(type) === 'string') { // a has-one association
          return SC.Resource.HasOneSchemaItem.create(name, schema);
        } else if(type.isSCResourceCollection) { // a has-many association
          return SC.Resource.HasManySchemaItem.create(name, schema);
        } else { // a regular attribute
          return SC.Resource.AttributeSchemaItem.create(name, schema);
        }
      }
    }
  });

  SC.Resource.AttributeSchemaItem = SC.Resource.AbstractSchemaItem.extend({
    fetchable: true,
    theType: Object,
    path: SC.required(String),

    getValue: function(instance) {
      var value;
      var data = this.data(instance);
      if (data) {
        value = SC.getPath(data, this.get('path'));
      }

      if (this.typeCast) {
        value = this.typeCast(value);
      }

      return value;
    },

    setValue: function(instance, value) {
      var data = this.data(instance);
      if (!data) return;

      if (this.typeCast) {
        value = this.typeCast(value);
      }
      if (value !== null && value !== undefined && SC.typeOf(value.toJSON) == 'function') {
        value = value.toJSON();
      }
      SC.Resource.deepSet(data, this.get('path'), value);
    },

    toJSON: function(instance) {
      return SC.get(instance, this.name);
    }
  });

  SC.Resource.AttributeSchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];
      var instance;

      if (this === SC.Resource.AttributeSchemaItem) {
        switch (definition.type) {
          case Number:
            return SC.Resource.NumberAttributeSchemaItem.create(name, schema);
          case String:
            return SC.Resource.StringAttributeSchemaItem.create(name, schema);
          case Boolean:
            return SC.Resource.BooleanAttributeSchemaItem.create(name, schema);
          case Date:
            return SC.Resource.DateAttributeSchemaItem.create(name, schema);
          default:
            instance = this._super.apply(this, arguments);
            instance.set('fetchable', name !== 'id');
            instance.set('path', definition.path || name);
            return instance;
        }
      }
      else {
        instance = this._super.apply(this, arguments);
        instance.set('fetchable', name !== 'id');
        instance.set('path', definition.path || name);
        return instance;
      }
    }
  });

  SC.Resource.NumberAttributeSchemaItem = SC.Resource.AttributeSchemaItem.extend({
    theType: Number,
    typeCast: function(value) {
      if (isNaN(value)) {
        value = undefined;
      }

      if (value === undefined || value === null || SC.typeOf(value) === 'number') {
        return value;
      } else {
        return Number(value);
      }
    }
  });

  SC.Resource.StringAttributeSchemaItem = SC.Resource.AttributeSchemaItem.extend({
    theType: String,
    typeCast: function(value) {
      if (value === undefined || value === null || SC.typeOf(value) === 'string') {
        return value;
      } else {
        return '' + value;
      }
    }
  });

  SC.Resource.BooleanAttributeSchemaItem = SC.Resource.AttributeSchemaItem.extend({
    theType: Boolean,
    typeCast: function(value) {
      if (value === undefined || value === null || SC.typeOf(value) === 'boolean') {
        return value;
      } else {
        return value === 'true';
      }
    }
  });

  SC.Resource.DateAttributeSchemaItem = SC.Resource.AttributeSchemaItem.extend({
    theType: Date,
    typeCast: function(value) {
      if (value === undefined || value === null || SC.typeOf(value) === 'date') {
        return value;
      } else {
        return new Date(value);
      }
    },
    toJSON: function(instance) {
      var value = SC.get(instance, this.name);
      return value ? value.toJSON() : value;
    }
  });

  SC.Resource.HasOneSchemaItem = SC.Resource.AbstractSchemaItem.extend({
    fetchable: true
  });
  SC.Resource.HasOneSchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];
      if (this === SC.Resource.HasOneSchemaItem) {
        if (definition.nested) {
          return SC.Resource.HasOneNestedSchemaItem.create(name, schema);
        } else {
          return SC.Resource.HasOneRemoteSchemaItem.create(name, schema);
        }
      }
      else {
        var instance = this._super.apply(this, arguments);
        instance.set('theType', definition.type);
        if (definition.parse) {
          instance.set('parse', definition.parse);
        }
        return instance;
      }
    }
  });

  SC.Resource.HasOneNestedSchemaItem = SC.Resource.HasOneSchemaItem.extend({
    getValue: function(instance) {
      var data = this.data(instance);
      if (!data) return;
      var type = this.get('type');
      var value = SC.getPath(data, this.get('path'));
      if (value) {
        value = (this.get('parse') || type.parse).call(type, SC.copy(value));
        return type.create({}, value);
      }
      return value;
    },

    setValue: function(instance, value) {
      var data = this.data(instance);
      if (!data) return;

      if (value instanceof this.get('type')) {
        value = SC.get(value, 'data');
      }

      SC.Resource.deepSet(data, this.get('path'), value);
    },

    toJSON: function(instance) {
      var value = SC.get(instance, this.name);
      return value ? value.toJSON() : value;
    }
  });
  SC.Resource.HasOneNestedSchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];
      var instance = this._super.apply(this, arguments);
      instance.set('path', definition.path || name);

      var id_name = name + '_id';
      if (!schema[id_name]) {
        schema[id_name] = {type: Number, association: instance };
        schema[id_name] = SC.Resource.HasOneNestedIdSchemaItem.create(id_name, schema);
      }

      return instance;
    }
  });
  SC.Resource.HasOneNestedIdSchemaItem = SC.Resource.AbstractSchemaItem.extend({
    fetchable: true,
    theType: Number,
    getValue: function(instance) {
      return instance.getPath(this.get('path'));
    },
    setValue: function(instance, value) {
      SC.set(instance, this.getPath('association.name'), {id: value});
    }
  });
  SC.Resource.HasOneNestedIdSchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];
      var instance = this._super.apply(this, arguments);
      instance.set('association', definition.association);
      instance.set('path', definition.association.get('path') + '.id');
      return instance;
    }
  });


  SC.Resource.HasOneRemoteSchemaItem = SC.Resource.HasOneSchemaItem.extend({
    getValue: function(instance) {
      var data = this.data(instance);
      if (!data) return;
      var id = SC.getPath(data, this.get('path'));
      if (id) {
        return this.get('type').create({}, {id: id});
      }
    },

    setValue: function(instance, value) {
      var data = this.data(instance);
      if (!data) return;
      var id = SC.get(value || {}, 'id');
      SC.Resource.deepSet(data, this.get('path'), id);
    }
  });
  SC.Resource.HasOneRemoteSchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];
      var instance = this._super.apply(this, arguments);
      var path = definition.path || name + '_id';
      instance.set('path', path);

      if (!schema[path]) {
        schema[path] = Number;
        schema[path] = SC.Resource.SchemaItem.create(path, schema);
      }

      return instance;
    }
  });


  SC.Resource.HasManySchemaItem = SC.Resource.AbstractSchemaItem.extend({
    itemType: function() {
      var type = this.get('theItemType');
      if (isString(type)) {
        type = SC.getPath(type);
        if (type) {
          this.set('theItemType', type);
        } else {
          type = this.get('theItemType');
        }
      }
      return type;
    }.property('theItemType')
  });
  SC.Resource.HasManySchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];
      if (this === SC.Resource.HasManySchemaItem) {
        if (definition.url) {
          return SC.Resource.HasManyRemoteSchemaItem.create(name, schema);
        } else if (definition.nested) {
          return SC.Resource.HasManyNestedSchemaItem.create(name, schema);
        } else {
          return SC.Resource.HasManyInArraySchemaItem.create(name, schema);
        }
      } else {
        var instance = this._super.apply(this, arguments);
        instance.set('theType', definition.type);
        instance.set('theItemType', definition.itemType);
        if (definition.parse) {
          instance.set('parse', definition.parse);
        }
        return instance;
      }
    }
  });

  SC.Resource.HasManyRemoteSchemaItem = SC.Resource.HasManySchemaItem.extend({
    fetchable: false,
    dependencies: ['id', 'isInitializing'],
    getValue: function(instance) {
      if (SC.get(instance, 'isInitializing')) return;

      var options = {
        type: this.get('itemType')
      };

      if (this.get('parse')) options.parse = this.get('parse');

      var url = this.url(instance);
      if (url) {
        options.url = url;
      } else {
        options.content = [];
      }

      return this.get('type').create(options);
    },

    setValue: function(instance, value) {
      throw('you can not set a remote has many association');
    }
  });
  SC.Resource.HasManyRemoteSchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];

      var instance = this._super.apply(this, arguments);

      if (SC.typeOf(definition.url) === 'function') {
        instance.url = definition.url;
      } else {
        instance.url = function(obj) {
          var id = obj.get('id');
          if (id) {
            return definition.url.fmt(id);
          }
        };
      }

      return instance;
    }
  });

  SC.Resource.HasManyNestedSchemaItem = SC.Resource.HasManySchemaItem.extend({
    fetchable: true,
    getValue: function(instance) {
      var data = this.data(instance);
      if (!data) return;
      data = SC.getPath(data, this.get('path'));
      if (data === undefined || data === null) return data;
      data = SC.copy(data);

      var options = {
        type: this.get('itemType'),
        content: data
      };

      if (this.get('parse')) options.parse = this.get('parse');

      return this.get('type').create(options);
    },

    setValue: function(instance, value) {
    },

    toJSON: function(instance) {
      var value = SC.get(instance, this.name);
      return value ? value.toJSON() : value;
    }
  });
  SC.Resource.HasManyNestedSchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];

      var instance = this._super.apply(this, arguments);
      instance.set('path', definition.path || name);

      return instance;
    }
  });

  SC.Resource.HasManyInArraySchemaItem = SC.Resource.HasManySchemaItem.extend({
    fetchable: true,
    getValue: function(instance) {
      var data = this.data(instance);
      if (!data) return;
      data = SC.getPath(data, this.get('path'));
      if (data === undefined || data === null) return data;


      return this.get('type').create({
        type: this.get('itemType'),
        content: data.map(function(id) { return {id: id}; })
      });
    },

    setValue: function(instance, value) {
    },

    toJSON: function(instance) {
      var value = SC.get(instance, this.name);
      return value ? value.mapProperty('id') : value;
    }
  });
  SC.Resource.HasManyInArraySchemaItem.reopenClass({
    create: function(name, schema) {
      var definition = schema[name];

      var instance = this._super.apply(this, arguments);
      instance.set('path', definition.path || name + '_ids');

      return instance;
    }
  });


  // Gives custom error handlers access to the resource object.
  // 1. `this` will refer to the SC.Resource object.
  // 2. `resource` will be passed as the last argument
  //
  //     function errorHandler() {
  //       this; // the SC.Resource
  //     }
  //
  //     function errorHandler(jqXHR, textStatus, errorThrown, resource) {
  //       resource; // another way to reference the resource object
  //     }
  //
  var errorHandlerWithModel = function(errorHandler, resource) {
    return function() {
      var args = Array.prototype.slice.call(arguments, 0);
      args.push(resource);
      errorHandler.apply(resource, args);
    };
  };

  SC.Resource.ajax = function(options) {
    options.dataType = options.dataType || 'json';
    options.type     = options.type     || 'GET';

    if (!options.error && SC.Resource.errorHandler) {
      if (options.resource) {
        options.error = errorHandlerWithModel(SC.Resource.errorHandler, options.resource);
        delete options.resource;
      } else {
        options.error = SC.Resource.errorHandler;
      }
    }

    return $.ajax(options);
  };

  SC.Resource.Lifecycle = {
    INITIALIZING: 0,
    UNFETCHED:    10,
    EXPIRING:     20,
    EXPIRED:      30,
    FETCHING:     40,
    FETCHED:      50,
    SAVING:       60,
    DESTOYING:    70,
    DESTROYED:    80,

    clock: SC.Object.create({
      now: new Date(),

      tick: function() {
        SC.Resource.Lifecycle.clock.set('now', new Date());
      },

      start: function() {
        this.stop();
        SC.Resource.Lifecycle.clock.set('timer', setInterval(SC.Resource.Lifecycle.clock.tick, 10000));
      },

      stop: function() {
        var timer = SC.Resource.Lifecycle.clock.get('timer');
        if (timer) {
          clearInterval(timer);
        }
      }
    }),

    classMixin: SC.Mixin.create({
      create: function(options, data) {
        options = options || {};
        options.resourceState = SC.Resource.Lifecycle.INITIALIZING;

        var instance = this._super.apply(this, arguments);

        if (SC.get(instance, 'resourceState') === SC.Resource.Lifecycle.INITIALIZING) {
          SC.set(instance, 'resourceState', SC.Resource.Lifecycle.UNFETCHED);
        }

        return instance;
      }
    }),

    prototypeMixin: SC.Mixin.create({
      expireIn: 60 * 5,
      resourceState: 0,

      init: function() {
        this._super.apply(this, arguments);

        var self = this;

        var updateExpiry = function() {
          var expireAt = new Date();
          expireAt.setSeconds(expireAt.getSeconds() + SC.get(self, 'expireIn'));
          SC.set(self, 'expireAt', expireAt);
        };

        SC.addListener(this, 'willFetch', this, function() {
          SC.set(self, 'resourceState', SC.Resource.Lifecycle.FETCHING);
          updateExpiry();
        });

        SC.addListener(this, 'didFetch', this, function() {
          SC.set(self, 'resourceState', SC.Resource.Lifecycle.FETCHED);
          updateExpiry();
        });

        var resourceStateBeforeSave;
        SC.addListener(this, 'willSave', this, function() {
          resourceStateBeforeSave = SC.get(self, 'resourceState');
          SC.set(self, 'resourceState', SC.Resource.Lifecycle.SAVING);
        });

        SC.addListener(this, 'didSave', this, function() {
          SC.set(self, 'resourceState', resourceStateBeforeSave || SC.Resource.Lifecycle.UNFETCHED);
        });
      },

      isFetchable: function() {
        var state = SC.get(this, 'resourceState');
        return state == SC.Resource.Lifecycle.UNFETCHED || state === SC.Resource.Lifecycle.EXPIRED;
      }.property('resourceState').cacheable(),

      isInitializing: function() {
        return (SC.get(this, 'resourceState') || SC.Resource.Lifecycle.INITIALIZING) === SC.Resource.Lifecycle.INITIALIZING;
      }.property('resourceState').cacheable(),

      isFetching: function() {
        return (SC.get(this, 'resourceState')) === SC.Resource.Lifecycle.FETCHING;
      }.property('resourceState').cacheable(),

      isSavable: function() {
        var state = SC.get(this, 'resourceState');
        var unsavableState = [
          SC.Resource.Lifecycle.INITIALIZING,
          SC.Resource.Lifecycle.FETCHING,
          SC.Resource.Lifecycle.SAVING,
          SC.Resource.Lifecycle.DESTOYING
        ];

        return state && !unsavableState.contains(state);
      }.property('resourceState').cacheable(),

      scheduleFetch: function() {
        if (SC.get(this, 'isFetchable')) {
          SC.run.next(this, this.fetch);
        }
      },

      expire: function() {
        SC.run.next(this, function() {
          SC.set(this, 'expireAt', new Date());
          SC.Resource.Lifecycle.clock.tick();
        });
      },

      updateIsExpired: function() {
        var isExpired = SC.get(this, 'resourceState') === SC.Resource.Lifecycle.EXPIRED;
        if (isExpired) return true;

        var expireAt = SC.get(this, 'expireAt');
        if (expireAt) {
          var now = SC.Resource.Lifecycle.clock.get('now');
          isExpired = expireAt.getTime() <= now.getTime();
        }

        if (isExpired !== SC.get(this, 'isExpired')) {
          SC.set(this, 'isExpired', isExpired);
        }
      }.observes('SC.Resource.Lifecycle.clock.now', 'expireAt', 'resourceState'),

      isExpired: function(name, value) {
        if (value) {
          SC.set(this, 'resourceState', SC.Resource.Lifecycle.EXPIRED);
        }
        return value;
      }.property().cacheable()
    })
  };
  SC.Resource.Lifecycle.clock.start();

  SC.Resource.reopen({
    isSCResource: true,

    updateWithApiData: function(json) {
      var data = SC.get(this, 'data');
      SC.beginPropertyChanges(data);
      SC.Resource.deepMerge(data, this.constructor.parse(json));
      SC.endPropertyChanges(data);
    },

    willFetch: function() {},
    didFetch: function() {},
    willSave: function() {},
    didSave: function() {},

    fetch: function() {
      if (!SC.get(this, 'isFetchable')) return null;

      var url = this.resourceURL();

      if (!url) return;

      var self = this;

      if (this.deferedFetch && !SC.get(this, 'isExpired')) return this.deferedFetch;

      self.willFetch.call(self);
      SC.sendEvent(self, 'willFetch');

      this.deferedFetch = SC.Resource.ajax({
        url: url,
        success: function(json) {
          self.updateWithApiData(json);
        }
      });

      this.deferedFetch.always(function() {
        self.didFetch.call(self);
        SC.sendEvent(self, 'didFetch');
      });

      return this.deferedFetch;
    },

    resourceURL: function() {
      return this.constructor.resourceURL(this);
    },

    // Turn this resource into a JSON object to be saved via AJAX. Override
    // this method to produce different syncing behavior.
    toJSON: function() {
      var json = {};
      var schemaItem, path, value;
      for (var name in this.constructor.schema) {
        if (this.constructor.schema.hasOwnProperty(name)) {
          schemaItem = this.constructor.schema[name];
          if (schemaItem instanceof SC.Resource.AbstractSchemaItem) {
            path = schemaItem.get('path');
            value = schemaItem.toJSON(this);
            if (value !== undefined) {
              SC.Resource.deepSet(json, path, value);
            }
          }
        }
      }

      return json;
    },

    isNew: function() {
      return !SC.get(this, 'id');
    }.property('id').cacheable(),

    save: function() {
      if (!SC.get(this, 'isSavable')) return false;

      var ajaxOptions = {
        contentType: 'application/json',
        data: JSON.stringify(this.toJSON()),
        resource: this
      };

      if (SC.get(this, 'isNew')) {
        ajaxOptions.type = 'POST';
        ajaxOptions.url = this.constructor.resourceURL();
      } else {
        ajaxOptions.type = 'PUT';
        ajaxOptions.url = this.resourceURL();
      }

      var self = this;

      self.willSave.call(self);
      SC.sendEvent(self, 'willSave');

      var deferedSave = SC.Resource.ajax(ajaxOptions);

      deferedSave.done(function(data, status, response) {
        var location = response.getResponseHeader('Location');
        if (location) {
          var id = self.constructor.idFromURL(location);
          if (id) {
            SC.set(self, 'id', id);
          }
        }

        if (SC.typeOf(data) === 'object') {
          self.updateWithApiData(data);
        }
      });

      deferedSave.always(function() {
        self.didSave.call(self);
        SC.sendEvent(self, 'didSave');
      });

      return deferedSave;
    },

    destroy: function() {
      var previousState = SC.get(this, 'resourceState'), self = this;
      SC.set(this, 'resourceState', SC.Resource.Lifecycle.DESTROYING);
      return SC.Resource.ajax({
        type: 'DELETE',
        url:  this.resourceURL()
      }).done(function() {
        SC.set(self, 'resourceState', SC.Resource.Lifecycle.DESTROYED);
      }).fail(function() {
        SC.set(self, 'resourceState', previousState);
      });
    }
  }, SC.Resource.Lifecycle.prototypeMixin);

  expandSchema = function(schema) {
    for (var name in schema) {
      if (schema.hasOwnProperty(name)) {
        schema[name] = SC.Resource.SchemaItem.create(name, schema);
      }
    }

    return schema;
  };

  mergeSchemas = function(childSchema, parentSchema) {
    var schema = SC.copy(parentSchema || {});

    for (var name in childSchema) {
      if (childSchema.hasOwnProperty(name)) {
        if (schema.hasOwnProperty(name)) {
          throw("Schema item '" + name + "' is already defined");
        }

        schema[name] = childSchema[name];
      }
    }

    return schema;
  };

  createSchemaProperties = function(schema) {
    var properties = {}, schemaItem;

    for (var propertyName in schema) {
      if (schema.hasOwnProperty(propertyName)) {
        properties[propertyName] = schema[propertyName].property();
      }
    }

    return properties;
  };

  SC.Resource.reopenClass({
    isSCResource: true,
    schema: {},

    baseClass: function() {
      if (this === SC.Resource) {
        return null;
      } else {
        return this.baseResourceClass || this;
      }
    },

    subclassFor: function(options, data) {
      return this;
    },

    find: function(id) {
        if (SC.none(this.identityMap)) {
            return null;
        }
        return this.identityMap[id];
    },

    // Create an instance of this resource. If `options` includes an
    // `id`, first check the identity map and return the existing resource
    // with that ID if found.
    create: function(options, data) {
      data    = data    || {};
      options = options || {};

      var klass = this.subclassFor(options, data);

      if (klass === this) {
        var instance;
        this.identityMap = this.identityMap || {};

        var id = data.id || options.id;
        if (id && !options.skipIdentityMap) {
          id = id.toString();
          instance = this.identityMap[id];

          if (!instance) {
            this.identityMap[id] = instance = this._super.call(this, { data: data });
          } else {
            instance.updateWithApiData(data);
          }
        } else {
          instance = this._super.call(this, { data: data });
        }

        delete options.data;
        instance.setProperties(options);

        return instance;
      } else {
        return klass.create(options, data);
      }
    },

    // Parse JSON -- likely returned from an AJAX call -- into the
    // properties for an instance of this resource. Override this method
    // to produce different parsing behavior.
    parse: function(json) {
      return json;
    },

    // Define a resource class.
    //
    // Parameters:
    //
    //  * `schema` -- the properties schema for the resource class
    //  * `url` -- either a function that returns the URL for syncing
    //    resources or a string. If the latter, a string of the form
    //    "/widgets" is turned into a function that returns "/widgets" if
    //    the Widget's ID is not present and "/widgets/{id}" if it is.
    //  * `parse` -- the function used to parse JSON returned from AJAX
    //    calls into the resource properties. By default, simply returns
    //    the JSON.
    define: function(options) {
      options = options || {};
      var schema = expandSchema(options.schema);
      schema = mergeSchemas(schema, this.schema);

      var klass = this.extend(createSchemaProperties(schema));

      var classOptions = {
        schema: schema
      };

      if (this !== SC.Resource) {
        classOptions.baseResourceClass = this.baseClass() || this;
      }

      if (options.url) {
        classOptions.url = options.url;
      }

      if (options.parse) {
        classOptions.parse = options.parse;
      }

      klass.reopenClass(classOptions);

      return klass;
    },

    resourceURL: function(instance) {
      if (SC.typeOf(this.url) == 'function') {
        return this.url(instance);
      } else if (this.url) {
        if (instance) {
          var id = SC.get(instance, 'id');
          if (id && (SC.typeOf(id) !== 'number' || id > 0)) {
            return this.url + '/' + id;
          }
        } else {
          return this.url;
        }
      }
    },

    idFromURL: function(url) {
      var regex;
      if (!this.schema.id) return;

      if (this.schema.id.get('type') === Number) {
        regex = /\/(\d+)(\.\w+)?$/;
      } else {
        regex = /\/([^\/\.]+)(\.\w+)?$/;
      }

      var match = (url || '').match(regex);
      if (match) {
        return match[1];
      }
    }
  }, SC.Resource.Lifecycle.classMixin);

  SC.ResourceCollection = SC.ArrayProxy.extend({
    isSCResourceCollection: true,
    type: SC.required(),
    fetch: function() {
      if (!SC.get(this, 'isFetchable')) return;

      if (!this.prePopulated) {
        var self = this;

        if (this.deferedFetch && !SC.get(this, 'isExpired')) return this.deferedFetch;

        SC.sendEvent(self, 'willFetch');

        this.deferedFetch = this._fetch(function(json) {
          SC.set(self, 'content', self.parse(json));
        });

        this.deferedFetch.always(function() {
          SC.sendEvent(self, 'didFetch');
        });
      }
      return this.deferedFetch;
    },
    _resolveType: function() {
      if (isString(this.type)) {
        var type = SC.getPath(this.type);
        if (type) this.type = type;
      }
    },
    _fetch: function(callback) {
      this._resolveType();
      return SC.Resource.ajax({
        url: this.url || this.type.resourceURL(),
        success: callback
      });
    },
    instantiateItems: function(items) {
      this._resolveType();
      return items.map(function(item) {
        if (item instanceof this.type) {
          return item;
        } else {
          return this.type.create({}, item);
        }
      }, this);
    },
    parse: function(json) {
      this._resolveType();
      if (SC.typeOf(this.type.parse) == 'function') {
        return json.map(this.type.parse);
      }
      else {
        return json;
      }
    },
    length: function() {
      var content = SC.get(this, 'content');
      var length = content ? SC.get(content, 'length') : 0;
      if (length === 0 ||  SC.get(this, 'isExpired'))  this.scheduleFetch();
      return length;
    }.property('content.length', 'resourceState', 'isExpired').cacheable(),
    content: function(name, value) {
      if (arguments.length === 2) { // setter
        return this.instantiateItems(value);
      }
    }.property().cacheable(),

    autoFetchOnExpiry: function() {
      if (SC.get(this, 'isExpired') && SC.get(this, 'hasArrayObservers')) {
        this.fetch();
      }
    }.observes('isExpired', 'hasArrayObservers'),

    toJSON: function() {
      return this.map(function(item) {
        return item.toJSON();
      })
    }
  }, SC.Resource.Lifecycle.prototypeMixin);

  SC.ResourceCollection.reopenClass({
    isSCResourceCollection: true,
    create: function(options) {
      options = options || {};
      var content = options.content;
      delete options.content;

      options.prePopulated = !! content;

      var instance;

      if (!options.prePopulated && options.url) {
        this.identityMap = this.identityMap || {};
        var identity = [options.type, options.url];
        instance = this.identityMap[identity] || this._super.call(this, options);
        this.identityMap[identity] = instance;
      }

      if (!instance) {
        instance = this._super.call(this, options);

        if (content) {
          SC.set(instance, 'content', instance.parse(content));
        }
      }

      return instance;
    }
  }, SC.Resource.Lifecycle.classMixin);
}());
