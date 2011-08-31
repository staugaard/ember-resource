(function(undefined) {
  var expandSchema, expandSchemaItem, propertyFunction,
      createPropertyFunction, hasManyFunction, createSchemaProperties,
      expandRemoteHasOneSchemaItem, expandRemoteHasManySchemaItem,
      expandNestedHasOneSchemaItem, expandNestedHasManySchemaItem;

  function isString(obj) {
    return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
  }

  function isObject(obj) {
    return obj === Object(obj);
  }

  var isFunction = $.isFunction;

  function getJSON(url, callback) {
    var options = {
      url: url,
      dataType: 'json',
      success: callback
    };

    if (SC.Resource.errorHandler) {
      options.error = SC.Resource.errorHandler;
    }

    return $.ajax(options);
  }

  SC.Resource = SC.Object.extend({
    isSCResource: true,

    fetch: function() {
      var url = this.resourceURL();

      if (!url) return;

      SC.set(this, 'resourceState', SC.Resource.Lifecycle.FETCHING);

      var self = this;

      this.deferedFetch = this.deferedFetch || getJSON(url, function(json) {
        self.setProperties(self.constructor.parse(json))
      });

      this.deferedFetch.always(function() {
        SC.set(self, 'resourceState', SC.Resource.Lifecycle.FETCHED);
      });

      return this.deferedFetch;
    },

    resourceURL: function() {
      return this.constructor.resourceURL(this);
    },

    // Turn this resource into a JSON object to be saved via AJAX. Override
    // this method to produce different syncing behavior.
    toJSON: function() {
      return SC.get(this, 'data');
    },

    isNew: function() {
      return !SC.get(this, 'id');
    },

    save: function() {
      var ajaxOptions = {
        data: this.toJSON()
      };

      if (this.isNew()) {
        ajaxOptions.type = 'POST';
        ajaxOptions.url = this.constructor.resourceURL();
      } else {
        ajaxOptions.type = 'PUT';
        ajaxOptions.url = this.resourceURL();
      }

      return $.ajax(ajaxOptions);
    }
  });

  SC.Resource.Lifecycle = {
    INITIALIZING: 0,
    UNFETCHED:    10,
    FETCHING:     20,
    FETCHED:      30,
    create: function(options) {
      options = options || {};
      options.resourceState = SC.Resource.Lifecycle.INITIALIZING;
      var instance = this._super.call(this, options);
      if (SC.get(instance, 'resourceState') === SC.Resource.Lifecycle.INITIALIZING) {
        SC.set(instance, 'resourceState', SC.Resource.Lifecycle.UNFETCHED);
      }
      return instance;
    }
  };

  SC.Resource.reopenClass(SC.Resource.Lifecycle);

  expandNestedHasOneSchemaItem = function(name, schema) {
    var value = schema[name];
    value.path = value.path || name;

    value.serialize = value.serialize || function(instance) {
      if (instance === undefined || instance === null) return instance;

      return SC.get(instance, 'data');
    };
    value.deserialize = value.deserialize || function(data) {
      if (data === undefined || data === null) return data;

      if (isString(value.type)) {
        value.type = SC.getPath(value.type);
      }
      return value.type.create(data);
    };
  };

  expandRemoteHasOneSchemaItem = function(name, schema) {
    var value = schema[name];
    value.path = value.path || name + '_id';
    if (!schema[value.path]) {
      schema[value.path] = Number;
      expandSchemaItem(value.path, schema);
    }

    value.serialize = value.serialize || function(instance) {
      if (instance === undefined || instance === null) return instance;
      return SC.get(instance, 'id');
    };
    value.deserialize = value.deserialize || function(id) {
      if (id === undefined || id === null) return id;

      if (isString(value.type)) {
        value.type = SC.getPath(value.type);
      }
      return value.type.create({id: id});
    };
  };

  expandRemoteHasManySchemaItem = function(name, schema) {
    var value = schema[name];
    value.deserialize = value.deserialize || function(options) {
      if (isString(value.itemType)) {
        value.itemType = SC.getPath(value.itemType);
      }
      options.type = value.itemType;

      return value.type.create(options);
    };
  };

  expandNestedHasManySchemaItem = function(name, schema) {
    var value = schema[name];
    value.path = value.path || name;
    value.deserialize = value.deserialize || function(data) {
      if (isString(value.itemType)) {
        value.itemType = SC.getPath(value.itemType);
      }
      return value.type.create({
        content: data,
        type: value.itemType,
        parse: value.parse
      });
    };
  };

  expandSchemaItem = function(name, schema) {
    var value = schema[name];

    if (value === Number || value === String || value === Boolean || value === Date || value === Object) {
      value = {type: value};
      schema[name] = value;
    }

    if (isObject(value) && value.type) {

      if (value.type.isSCResource || isString(value.type)) { // a has-one association
        value.nested = !!value.nested;

        if (value.nested) {
          expandNestedHasOneSchemaItem(name, schema);
        } else {
          expandRemoteHasOneSchemaItem(name, schema);
        }

      } else if(value.type.isSCResourceCollection) { // a has-many association
        if (value.url) {
          expandRemoteHasManySchemaItem(name, schema);
        } else if (value.nested) {
          expandNestedHasManySchemaItem(name, schema);
        }
      } else { // a regular attribute
        value.path = value.path || name;
      }

      var serializer;
      switch (value.type) {
        case Number:
          serializer = function(v) { return v === undefined ? undefined : ( v === null ? null : Number(v) ); };
          break;
        case String:
          serializer = function(v) { return v === undefined ? undefined : ( v === null ? null : '' + v ); };
          break;
        case Boolean:
          serializer = function(v) { return v === true || v === 'true'; };
          break;
        case Date:
          serializer = function(v) { return v === undefined ? undefined : ( v === null ? null : new Date(v) ); };
          break;
        case Object:
          serializer = function(v) { return v; };
          break;
      }

      if (serializer) {
        value.serialize   = value.serialize   || serializer;
        value.deserialize = value.deserialize || serializer;
      }
    }
  };

  expandSchema = function(schema) {
    for (var name in schema) {
      if (schema.hasOwnProperty(name)) {
        expandSchemaItem(name, schema);
      }
    }

    return schema;
  };

  // the function for a given regular property
  propertyFunction = function(name, value) {
    var propertyOptions = this.constructor.schema[name];
    var data = SC.get(this, 'data');

    if (arguments.length === 1) { // getter
      var serializedValue;
      if (data) serializedValue = SC.getPath(data, propertyOptions.path);

      if (serializedValue === undefined) {
        SC.run.next(this, this.fetch);
      }

      value = propertyOptions.deserialize(serializedValue);
    } else { // setter
      SC.setPath(data, propertyOptions.path, propertyOptions.serialize(value));
      
      value = SC.get(this, name);
    }

    return value;
  };

  // Build a cumputed property function for a regular property.
  createPropertyFunction = function(propertyOptions) {
    return propertyFunction.property('data.' + propertyOptions.path).cacheable();
  };

  // The computed property function for a url based has-many association
  hasManyFunction = function(name, value) {
    if (arguments.length === 1) { // getter
      var id = this.get('id');
      if (!id) return undefined;

      var propertyOptions = this.constructor.schema[name];
      var options = SC.copy(propertyOptions);

      if ($.isFunction(options.url)) {
        options.url = options.url(this);
      } else if ('string' === typeof options.url) {
        options.url = options.url.fmt(id);
      }

      return propertyOptions.deserialize(options);
    } else { // setter
      // throw "You can not set this property";
    }
  }.property('data.id').cacheable();

  createSchemaProperties = function(schema) {
    var properties = {}, propertyOptions;

    for (var propertyName in schema) {
      if (schema.hasOwnProperty(propertyName)) {
        propertyOptions = schema[propertyName];
        properties[propertyName] = propertyOptions.path ? createPropertyFunction(propertyOptions)
                                                        : hasManyFunction;
      }
    }

    return properties;
  };

  SC.Resource.reopenClass({
    isSCResource: true,

    // Create an instance of this resource. If `options` includes an
    // `id`, first check the identity map and return the existing resource
    // with that ID if found.
    create: function(options) {
      var instance;
      if (options && options.id) {
        var id = options.id.toString();
        this.identityMap = this.identityMap || {};
        instance = this.identityMap[id];
        if (!instance) {
          this.identityMap[id] = instance = this._super.call(this);
          SC.set(instance, 'data', options);
        }
      } else {
        instance = this._super.call(this);
        SC.set(instance, 'data', options);
      }
      return instance;
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

      var klass = this.extend(createSchemaProperties(schema));

      var classOptions = {
        url: options.url,
        schema: schema
      };

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
          return this.url + '/' + SC.get(instance, 'id');
        } else {
          return this.url;
        }
      }
    }
  });

  SC.ResourceCollection = SC.ArrayProxy.extend({
    isSCResourceCollection: true,
    type: SC.Required,
    fetch: function() {
      if (!this.prePopulated && SC.get(this, 'resourceState') === SC.Resource.Lifecycle.UNFETCHED) {
        SC.set(this, 'resourceState', SC.Resource.Lifecycle.FETCHING);
        var self = this;

        this.deferedFetch = this._fetch(function(json) {
          SC.set(self, 'content', self.instantiateItems(self.parse(json)));
        });

        this.deferedFetch.always(function() {
          SC.set(self, 'resourceState', SC.Resource.Lifecycle.FETCHED);
        });
      }
      return this.deferedFetch;
    },
    _fetch: function(callback) {
      return getJSON(this.url || this.type.resourceURL(), callback);
    },
    instantiateItems: function(items) {
      return items.map(function(item) {
        if (item instanceof this.type) {
          return item;
        } else {
          return this.type.create(item);
        }
      }, this);
    },
    parse: function(json) {
      return _.map(json, this.type.parse);
    },
    content: function(name, value) {
      if (arguments.length === 1) { // getter
        SC.run.next(this, this.fetch);
      } else { // setter
        return this.instantiateItems(value);
      }
    }.property().cacheable()
  });

  SC.ResourceCollection.reopenClass(SC.Resource.Lifecycle);

  SC.ResourceCollection.reopenClass({
    isSCResourceCollection: true,
    create: function(options) {
      options = options || {};
      var content = options.content;
      delete options.content;

      options.prePopulated = !! content;

      var instance = this._super.call(this, options);

      if (content) {
        SC.set(instance, 'content', content);
      }

      return instance;
    }
  });
}());
