(function(SC, $) {
  var isString = function(obj) {
    return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
  };

  var isObject = function(obj) {
    return obj === Object(obj);
  };

  var isFunction = $.isFunction;

  var getJSON = function(url, callback) {
    var options = {
      url: url,
      dataType: 'json',
      success: callback
    };

    if (SC.Resource.errorHandler) {
      options.error = SC.Resource.errorHandler;
    };

    return $.ajax(options);
  };

  SC.Resource = SC.Object.extend({
    isSCResource: true,

    fetch: function() {
      this.set('resourceState', SC.Resource.Lifecycle.FETCHING);

      var self = this;

      this.deferedFetch = getJSON(this.resourceURL(), function(json) {
        self.set('data', self.constructor.parse(json));
      });

      this.deferedFetch.always(function() {
        self.set('resourceState', SC.Resource.Lifecycle.FETCHED);
      })

      return this.deferedFetch;
    },

    resourceURL: function() {
      return this.constructor.resourceURL(this);
    },

    // Turn this resource into a JSON object to be saved via AJAX. Override
    // this method to produce different syncing behavior.
    toJSON: function() {
      return this.get('data');
    },

    isNew: function() {
      return !this.get('id');
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
      options = options || {}
      options.resourceState = SC.Resource.Lifecycle.INITIALIZING;
      var instance = this._super.call(this, options);
      if (instance.get('resourceState') === SC.Resource.Lifecycle.INITIALIZING) {
        instance.set('resourceState', SC.Resource.Lifecycle.UNFETCHED);
      }
      return instance;
    }
  };

  SC.Resource.reopenClass(SC.Resource.Lifecycle);

  var expandSchemaItem = function(schema, name) {
    var value = schema[name];

    if (value === Number || value === String || value === Boolean || value === Date || value === Object) {
      value = {type: value};
    }

    if (isObject(value) && value.type) {

      if (value.type.isSCResource || isString(value.type)) {
        value.nested = !!value.nested;

        if (value.nested) {
          value.key = value.key || name;

          value.serialize = value.serialize || function(instance) {
            return instance.get('data');
          }
          value.deserialize = value.deserialize || function(data) {
            if (isString(value.type)) {
              value.type = SC.getPath(value.type);
            }
            return value.type.create(data);
          }
        } else {
          value.key = value.key || name + '_id';
          if (!schema[value.key]) {
            schema[value.key] = Number;
            expandSchemaItem(schema, value.key);
          }

          value.serialize = value.serialize || function(instance) {
            return instance.get('id');
          }
          value.deserialize = value.deserialize || function(id) {
            if (isString(value.type)) {
              value.type = SC.getPath(value.type);
            }
            return value.type.create({id: id});
          }
        }

      } else if(value.type.isSCResourceCollection) {
        if (value.url) {
          value.deserialize = value.deserialize || function(options) {
            if (isString(value.itemType)) {
              value.itemType = SC.getPath(value.itemType);
            }
            options.type = value.itemType;
        
            return value.type.create(options);
          }
        } else if (value.nested) {
          value.key = value.key || name;
          value.deserialize = value.deserialize || function(data) {
            if (isString(value.itemType)) {
              value.itemType = SC.getPath(value.itemType);
            }
            return value.type.create({
              content: data,
              type: value.itemType,
              parse: value.parse
            });
          }
        }
      } else {
        value.key = value.key || name;
      }

      var serializer;
      switch (value.type) {
        case Number:
          serializer = function(v) { return Number(v); };
          break
        case String:
          serializer = function(v) { return v.toString(); };
          break
        case Boolean:
          serializer = function(v) { return v === true || v === 'true'; };
          break
        case Date:
          serializer = function(v) { return new Date(v); };
          break
        case Object:
          serializer = function(v) { return v; };
          break
      }

      if (serializer) {
        value.serialize   = value.serialize   || serializer;
        value.deserialize = value.deserialize || serializer;
      }
    }
    schema[name] = value;
  };

  var expandSchema = function(schema) {
    for (var name in schema) {
      if (schema.hasOwnProperty(name)) {
        expandSchemaItem(schema, name);
      }
    }

    return schema;
  };

  var createSchemaProperties = function(schema) {
    var properties = {};

    for (var propertyName in schema) {
      if (schema.hasOwnProperty(propertyName)) {
        if (schema[propertyName].key) {
          properties[propertyName] = function(name, value) {
            var propertyOptions = schema[name];
            var data = this.get('data');

            if (value === void(0)) {
              if (!data || !data.hasOwnProperty(propertyOptions.key)) {
                this.fetch();
                return;
              } else {
                value = propertyOptions.deserialize(SC.getPath(data, propertyOptions.key));
              }
            } else {
              SC.setPath(data, propertyOptions.key, propertyOptions.serialize(value));
            }

            return value;
          }.property('data').cacheable();
        } else if (schema[propertyName].url) {
          properties[propertyName] = function(name, value) {
            var propertyOptions = schema[name];
        
            if (value === void(0)) {
              var options = SC.copy(propertyOptions);
        
              if ($.isFunction(options.url)) {
                options.url = options.url(this);
              } else if ('string' === typeof options.url) {
                options.url = options.url.fmt(this.get('id'));
              }
        
              return propertyOptions.deserialize(options);
            } else {
              // throw "You can not set this property";
            }
          }.property('id').cacheable();
        }
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
          instance.set('data', options);
        }
      } else {
        instance = this._super.call(this);
        instance.set('data', options);
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
          return this.url + '/' + instance.get('id');
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
      if (!this.prePopulated && this.get('resourceState') === SC.Resource.Lifecycle.UNFETCHED) {
        this.set('resourceState', SC.Resource.Lifecycle.FETCHING);
        self = this;

        this.deferedFetch = this._fetch(function(json) {
          self.set('content', self.instantiateItems(self.parse(json)));
        });

        this.deferedFetch.always(function() {
          self.set('resourceState', SC.Resource.Lifecycle.FETCHED);
        })
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
      if (value === void(0)) {
        this.fetch();
        return this.realContent;
      } else {
        this.realContent = this.instantiateItems(value);
        return value;
      }
    }.property()
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
        instance.set('content', content);
      }

      return instance;
    }
  });
}(SC, jQuery));
