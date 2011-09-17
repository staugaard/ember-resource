(function(undefined) {
  var expandSchema, expandSchemaItem, propertyFunction,
      createPropertyFunction, hasManyFunction, createSchemaProperties,
      mergeSchemas, createNestedHasOneIdProperty;

  function isString(obj) {
    return !!(obj === '' || (obj && obj !== String && obj.charCodeAt && obj.substr));
  }

  function isObject(obj) {
    return obj === Object(obj);
  }

  var isFunction = $.isFunction;

  SC.Resource = SC.Object.extend({});

  SC.Resource.SchemaItem = function(name, schema) {
    var value = schema[name];
    if (value instanceof SC.Resource.SchemaItem) return value;

    if (value === Number || value === String || value === Boolean || value === Date || value === Object) {
      this.theType = value;
    } else if(isObject(value)) {
      this.theType = value.type;
    }

    if (this.theType) {
      if (this.theType.isSCResource || isString(this.theType)) { // a has-one association
        this.parse = value.parse;
        this.nested = !!value.nested;

        if (this.nested) {
          this.expandNestedHasOneSchemaItem(name, schema);
        } else {
          this.expandRemoteHasOneSchemaItem(name, schema);
        }

      } else if(this.theType.isSCResourceCollection) { // a has-many association
        this.nested = !!value.nested;
        this.theItemType = value.itemType;
        this.parse = value.parse;

        if (value.url) {
          this.url = value.url;
          this.expandRemoteHasManySchemaItem(name, schema);
        } else if (this.nested) {
          this.expandNestedHasManySchemaItem(name, schema);
        } else {
          this.expandHasManyInArraySchemaItem(name, schema);
        }
      } else { // a regular attribute
        this.path = value.path || name;
        this.fetchable = name !== 'id';
      }

      var serialize, deserialize;
      switch (this.theType) {
        case Number:
          serialize = deserialize = function(v) { return v === undefined ? undefined : ( v === null ? null : Number(v) ); };
          break;
        case String:
          serialize = deserialize = function(v) { return v === undefined ? undefined : ( v === null ? null : '' + v ); };
          break;
        case Boolean:
          serialize = deserialize = function(v) { return v === true || v === 'true'; };
          break;
        case Date:
          // TODO: We need to investigate how well Date#toJSON is supported in browsers
          serialize = function(v) { return v === undefined ? undefined : ( v === null ? null : (new Date(v)).toJSON() ); };
          deserialize = function(v) { return v === undefined ? undefined : ( v === null ? null : new Date(v) ); };
          break;
        case Object:
          serialize = deserialize = function(v) { return v; };
          break;
      }

      if (serialize) {
        this.serialize   = value.serialize   || serialize;
      }
      if (deserialize) {
        this.deserialize = value.deserialize || deserialize;
      }
    }
  };

  SC.Resource.SchemaItem.create = function(name, schema) {
    return new SC.Resource.SchemaItem(name, schema);
  }

  SC.Resource.SchemaItem.prototype = {
    expandNestedHasOneSchemaItem: function(name, schema) {
      this.fetchable = true;
      var schemaItem = this;
      var value = schema[name];
      this.path = value.path || name;

      if (!schema[this.path]) {
        schema[this.path] = Object;
        schema[this.path] = SC.Resource.SchemaItem.create(this.path, schema);
      }

      this.serialize = value.serialize || function(instance) {
        if (instance === undefined || instance === null) return instance;

        if (instance instanceof schemaItem.type()) {
          return SC.get(instance, 'data');
        } else if (isObject(instance)) {
          return instance;
        }
      };

      this.deserialize = value.deserialize || function(data) {
        if (data === undefined || data === null) return data;

        return schemaItem.type().create(data);
      };
    },

    expandRemoteHasOneSchemaItem: function(name, schema) {
      this.fetchable = false;
      var schemaItem = this;
      var value = schema[name];
      this.path = value.path || name + '_id';

      if (!schema[this.path]) {
        schema[this.path] = Number;
        schema[this.path] = SC.Resource.SchemaItem.create(this.path, schema);
      }

      this.serialize = value.serialize || function(instance) {
        if (instance === undefined || instance === null) return instance;

        return SC.get(instance, 'id');
      };

      this.deserialize = value.deserialize || function(id) {
        if (id === undefined || id === null) return id;

        return schemaItem.type().create({id: id});
      };
    },

    expandRemoteHasManySchemaItem: function(name, schema) {
      this.fetchable = false;
      var schemaItem = this;
      var value = schema[name];

      this.deserialize = value.deserialize || function(options) {
        options.type = schemaItem.itemType();
        return schemaItem.type().create(options);
      };
    },

    expandNestedHasManySchemaItem: function(name, schema) {
      this.fetchable = true;
      var schemaItem = this;
      var value = schema[name];
      this.path = value.path || name;

      this.serialize = value.serialize || function(instance) {
        if (instance === undefined || instance === null) return instance;

        var array;
        if (instance instanceof SC.ResourceCollection) {
          array = SC.get(instance, 'content');
        } else if (instance instanceof Array) {
          array = instance;
        }

        if (array) {
          return array.map(function(item) {
            if (item instanceof schemaItem.itemType()) {
              return SC.get(item, 'data');
            } else if (isObject(item)) {
              return item;
            } else {
              throw 'invalid item in collection';
            }
          });
        }
      };

      this.deserialize = value.deserialize || function(data) {
        if (data === undefined || data === null) return data;

        // A ResourceCollection doesn't parse content on creation, only
        // when the content is fetched, which doesn't happen here.
        data = data.map(schemaItem.parse || schemaItem.itemType().parse);

        return schemaItem.type().create({
          content: data,
          type: schemaItem.itemType()
        });
      };
    },

    expandHasManyInArraySchemaItem: function(name, schema) {
      this.fetchable = true;
      var schemaItem = this;
      var value = schema[name];
      this.path = value.path || name + '_ids';

      this.serialize = value.serialize || function(instances) {
        if (instances === undefined || instances === null) return instances;

        var array;
        if (instances instanceof SC.ResourceCollection) {
          array = SC.get(instances, 'content');
        } else if (instances instanceof Array) {
          array = instances;
        }

        if (array) {
          return array.map(function(item) {
            if (item instanceof schemaItem.itemType()) {
              return SC.get(item, 'id');
            } else if (isObject(item)) {
              return item.id;
            } else {
              throw 'invalid item in collection';
            }
          });
        }
      };

      this.deserialize = value.deserialize || function(data) {
        if (data === undefined || data === null) return data;

        if (data instanceof schemaItem.type()) return data;

        return schemaItem.type().create({
          content: data.map(function(id) { return {id: id}; }),
          type: schemaItem.itemType()
        });
      };
    },

    type: function() {
      if (isString(this.theType)) {
        var type = SC.getPath(this.theType);
        if (type) this.theType = type;
      }
      return this.theType;
    },

    itemType: function() {
      if (isString(this.theItemType)) {
        var type = SC.getPath(this.theItemType);
        if (type) this.theItemType = type;
      }
      return this.theItemType;
    }
  };

  SC.Resource.ajax = function(options) {
    options.dataType = options.dataType || 'json';
    options.type     = options.type     || 'GET';

    if (!options.error && SC.Resource.errorHandler) {
      options.error = SC.Resource.errorHandler;
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
    DESTOYING:    60,
    DESTROYED:    70,

    classMixin: SC.Mixin.create({
      expireIn: 60 * 5,

      create: function(options) {
        options = options || {};
        options.resourceState = SC.Resource.Lifecycle.INITIALIZING;
        var instance = this._super.call(this, options);
        if (SC.get(instance, 'resourceState') === SC.Resource.Lifecycle.INITIALIZING) {
          SC.set(instance, 'resourceState', SC.Resource.Lifecycle.UNFETCHED);
        }
        return instance;
      }
    }),

    prototypeMixin: SC.Mixin.create({
      resourceState: 0,

      init: function() {
        this._super.apply(this, arguments);

        var self = this;

        var updateExpiry = function() {
          var expireAt = new Date();
          expireAt.setSeconds(expireAt.getSeconds() + self.constructor.expireIn);
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
      },

      expire: function() {
        SC.run.next(this, function() {
          SC.set(this, 'expireAt', new Date());
        });
      },

      isExpired: function() {
        var isExpired = this.get('resourceState') === SC.Resource.Lifecycle.EXPIRED;
        if (isExpired) return true;

        var expireAt = SC.get(this, 'expireAt');
        if (expireAt) {
          isExpired = expireAt.getTime() <= (new Date()).getTime();
        }

        if (isExpired) {
          SC.set(this, 'resourceState', SC.Resource.Lifecycle.EXPIRED);
        }

        return isExpired;
      }.property('expireAt')
    })
  };

  SC.Resource.reopen({
    isSCResource: true,

    updateWithApiData: function(json) {
      this.setProperties(this.constructor.parse(json));
    },

    fetch: function() {
      if (!SC.get(this, 'isFetchable')) return null;

      var url = this.resourceURL();

      if (!url) return;

      var self = this;

      if (this.deferedFetch && !SC.get(this, 'isExpired')) return this.deferedFetch;

      SC.sendEvent(self, 'willFetch');

      this.deferedFetch = SC.Resource.ajax({
        url: url,
        success: function(json) {
          self.updateWithApiData(json);
        }
      });

      this.deferedFetch.always(function() {
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
      return SC.copy(SC.get(this, 'data'));
    },

    isNew: function() {
      return !SC.get(this, 'id');
    }.property('id').cacheable(),

    save: function() {
      var ajaxOptions = {
        data: this.toJSON()
      };

      if (SC.get(this, 'isNew')) {
        ajaxOptions.type = 'POST';
        ajaxOptions.url = this.constructor.resourceURL();
      } else {
        ajaxOptions.type = 'PUT';
        ajaxOptions.url = this.resourceURL();
      }

      return SC.Resource.ajax(ajaxOptions);
    },

    destroy: function() {
      var previousState = SC.get(this, 'resourceState');
      SC.set(this, 'resourceState', SC.Resource.Lifecycle.DESTROYING);
      return SC.Resource.ajax({
        type: 'DELETE',
        url:  this.resourceURL()
      }).done($.proxy(SC.set, SC, this, 'resourceState', SC.Resource.Lifecycle.DESTROYED))
        .fail($.proxy(SC.set, SC, this, 'resourceState', previousState));
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

  // the function for a given regular property
  propertyFunction = function(name, value) {
    var schemaItem = this.constructor.schema[name];
    var data = SC.get(this, 'data');

    if (arguments.length === 1) { // getter
      var serializedValue;
      if (data) serializedValue = SC.getPath(data, schemaItem.path);

      if (schemaItem.fetchable && (serializedValue === undefined || SC.get(this, 'isExpired'))) {
        SC.run.next(this, this.fetch);
      }

      value = schemaItem.deserialize(serializedValue);
    } else { // setter
      var serialized = schemaItem.serialize(value);

      SC.setPath(data, schemaItem.path, serialized);

      value = schemaItem.deserialize(serialized);
    }

    return value;
  };

  // Build a cumputed property function for a regular property.
  createPropertyFunction = function(schemaItem) {
    return propertyFunction.property('data.' + schemaItem.path, 'isExpired', 'isFetchable').cacheable();
  };

  // The computed property function for a url based has-many association
  hasManyFunction = function(name, value) {
    if (arguments.length === 1) { // getter
      if (SC.get(this, 'isInitializing')) return null;

      var id = SC.get(this, 'id');
      if (!id) return undefined;

      var schemaItem = this.constructor.schema[name];
      var options = SC.copy(schemaItem);

      if ($.isFunction(options.url)) {
        options.url = options.url(this);
      } else if ('string' === typeof options.url) {
        options.url = options.url.fmt(id);
      }

      return schemaItem.deserialize(options);
    } else { // setter
      throw "You can not set this property";
    }
  }.property('id', 'isInitializing').cacheable();

  createNestedHasOneIdProperty = function(propertyName, schemaItem) {
    return function(name, value) {
      if (arguments.length === 1) {
        value = SC.getPath(this, propertyName + '.id');
      } else {
        SC.set(this, propertyName, schemaItem.type().create({id: value}));
      }
      return value;
    }.property(propertyName);
  };

  createSchemaProperties = function(schema) {
    var properties = {}, schemaItem;

    for (var propertyName in schema) {
      if (schema.hasOwnProperty(propertyName)) {
        schemaItem = schema[propertyName];

        if (schemaItem.type().isSCResourceCollection) { // has many
          if (schemaItem.url) {
            properties[propertyName] = hasManyFunction;
          } else {
            properties[propertyName] = createPropertyFunction(schemaItem);
          }
        } else { // simple attribute or has-one
          properties[propertyName] = createPropertyFunction(schemaItem);

          if (schemaItem.nested) { // nested has-one
            // in adition to the simple accessor, we also setup a property to get/set the id
            properties[propertyName + '_id'] = createNestedHasOneIdProperty(propertyName, schemaItem);
          }

        }
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

    subclassFor: function(attributes) {
      return this;
    },

    extractNonSchemaProperties: function(attrs) {
      var ret = {};
      for(var key in attrs) {
        if(!attrs.hasOwnProperty(key)) {
          continue;
        }

        if(!this.schema.hasOwnProperty(key)) {
          ret[key] = attrs[key];
        }
      }

      return ret;
    },

    // Create an instance of this resource. If `options` includes an
    // `id`, first check the identity map and return the existing resource
    // with that ID if found.
    create: function(options) {
      var klass = this.subclassFor(options);

      if (klass === this) {
        var instance;
        this.identityMap = this.identityMap || {};
        if (options && options.id && !options.skipIdentityMap) {
          var id = options.id.toString();
          instance = this.identityMap[id];
          if (!instance) {
            this.identityMap[id] = instance = this._super.call(this);
            SC.set(instance, 'data', options);
            instance.setProperties(this.extractNonSchemaProperties(options));
          }
        } else {
          delete options.skipIdentityMap;
          instance = this._super.call(this);
          SC.set(instance, 'data', options);
          instance.setProperties(this.extractNonSchemaProperties(options));
        }
        return instance;
      } else {
        return klass.create(options);
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
      if ($.isFunction(this.url)) {
        return this.url(instance);
      } else {
        if (instance) {
          var id = SC.get(instance, 'id');
          if (id) {
            return this.url + '/' + id;
          }
        } else {
          return this.url;
        }
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
          SC.set(self, 'content', self.instantiateItems(self.parse(json)));
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
          return this.type.create(item);
        }
      }, this);
    },
    parse: function(json) {
      this._resolveType();
      if (isFunction(this.type.parse)) {
        return json.map(this.type.parse);
      }
      else {
        return json;
      }
    },
    content: function(name, value) {
      if (arguments.length === 1) { // getter
        SC.run.next(this, this.fetch);
      } else { // setter
        return this.instantiateItems(value);
      }
    }.property().cacheable()
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
          SC.set(instance, 'content', content);
        }
      }

      return instance;
    }
  }, SC.Resource.Lifecycle.classMixin);
}());
