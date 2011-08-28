(function(window) {
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

  var createSchema = function(definitionSet) {
    var schema = {};
    var definition, path;
    for (name in definitionSet) {
      if (!definitionSet.hasOwnProperty(name)) continue;
      definition = definitionSet[name];
      switch (definition) {
        case Number:
          schema[name] = SC.Resource.property.integer;
          break;
        case String:
          schema[name] = SC.Resource.property.string;
          break;
        case Boolean:
          schema[name] = SC.Resource.property.boolean;
          break;
        case Date:
          schema[name] = SC.Resource.property.date;
          break;
        default:
          switch (definition.association) {
            case 'hasOneNested':
              path = definition.path || name;
              schema[name] = function(name, value) {
                //TODO implement setter
                if (value === void(0)) {
                  var klass = definition.className;
                  if (!klass.isSCResource) {
                    klass = SC.getPath(definition.className);
                  }

                  return klass.create(this.getPath('data.' + path));
                }
              }.property('data.' + path).cacheable()
              break;
            default:
              throw "unknown schema definition";
          }
      }
    }
    return schema;
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

    // Define a property of a resource.
    property: function(transforms) {
      var from = transforms && transforms.from,
      to = transforms && transforms.to;

      return function(name, value) {
        var data = SC.get(this, 'data'),
        val;

        if (!data || !data.hasOwnProperty(name)) {
          this.fetch();
          return;
        }

        if (value !== undefined) {
          val = to ? to(value) : value;
          SC.set(data, name, val);
        } else {
          value = SC.get(data, name);
          if (from) {
            value = from(value);
          }
        }

        return value;
      }.property('data');
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
      var klass = this.extend(createSchema(options.schema));

      var classOptions = {
        url: options.url
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

  SC.Resource.property.string = SC.Resource.property({
    from: function(raw) {
      return raw.toString();
    },
    to: function(string) {
      return string.toString();
    }
  });

  SC.Resource.property.hash = SC.Resource.property();

  SC.Resource.property.integer = SC.Resource.property({
    from: function(raw) {
      return Number(raw);
    },
    to: function(number) {
      return Number(number);
    }
  });

  SC.Resource.property.date = SC.Resource.property({
    from: function(raw) {
      return new Date(raw);
    },
    to: function(date) {
      return new Date(date);
    }
  });

  SC.Resource.property.boolean = SC.Resource.property({
    from: function(raw) {
      return raw === true || raw === 'true';
    },
    to: function(bool) {
      return bool === true || bool === 'true';
    }
  });

  SC.Resource.resource = function(options) {
    options = options || {};
    return function(name, value) {
      var klass = SC.getPath(options.className);
      var obj = klass.create({
        id: this.get(options.property)
      });

      if (value !== undefined) {
        SC.set(this, options.property, value.get('id'));
        return;
      } else {
        return obj;
      }
    }.property(options.property).cacheable();
  };

  SC.Resource.resources = function(options) {
    options = options || {};
    return function(name, value) {
      var collectionOptions = {
        type: SC.getPath(options.className),
        url: options.url
      };

      if ($.isFunction(options.url)) {
        collectionOptions.url = options.url(this);
      } else if ('string' === typeof options.url) {
        collectionOptions.url = options.url.fmt(this.get('id'));
      }

      if (options.parse) {
        collectionOptions.parse = options.parse;
      }

      var collection = SC.ResourceCollection.create(collectionOptions);

      return collection;
    }.property('id').cacheable();
  };

  SC.Resource.nestedResource = function(options) {
    return {
      association: 'hasOneNested',
      className:   options.className,
      path:        options.path
    };
  };

  SC.ResourceCollection = SC.ArrayProxy.extend({
    type: SC.Required,
    fetch: function() {
      if (!this.prePopulated && this.get('resourceState') === SC.Resource.Lifecycle.UNFETCHED) {
        this.set('resourceState', SC.Resource.Lifecycle.FETCHING);
        var content = [],
        self = this;

        this.deferedFetch = this._fetch(function(json) {
          _.each(self.parse(json), function(itemAttributes) {
            content.push(self.type.create(itemAttributes));
          });
          self.set('content', content);
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
    parse: function(json) {
      return _.map(json, this.type.parse);
    },
    content: function(name, value) {
      if (value === void(0)) {
        this.fetch();
        return this.realContent;
      } else {
        this.realContent = value;
        return value;
      }
    }.property()
  });

  SC.ResourceCollection.reopenClass(SC.Resource.Lifecycle);

  SC.ResourceCollection.reopenClass({
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
}(this));
