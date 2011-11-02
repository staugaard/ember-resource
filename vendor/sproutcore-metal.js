
(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals ENV sc_assert */

if ('undefined' === typeof SC) {
/**
  @namespace
  @name SC
  @version 2.0.beta.3

  All SproutCore methods and functions are defined inside of this namespace.
  You generally should not add new properties to this namespace as it may be
  overwritten by future versions of SproutCore.

  You can also use the shorthand "SC" instead of "SproutCore".

  SproutCore-Runtime is a framework that provides core functions for 
  SproutCore including cross-platform functions, support for property 
  observing and objects. Its focus is on small size and performance. You can 
  use this in place of or along-side other cross-platform libraries such as 
  jQuery.

  The core Runtime framework is based on the jQuery API with a number of
  performance optimizations.
*/
SC = {};

// aliases needed to keep minifiers from removing the global context
if ('undefined' !== typeof window) {
  window.SC = window.SproutCore = SproutCore = SC;
}

}

/**
  @static
  @type String
  @default '2.0.beta.3'
  @constant
*/
SC.VERSION = '2.0.beta.3';

/**
  @static
  @type Hash
  @constant
  
  Standard environmental variables.  You can define these in a global `ENV`
  variable before loading SproutCore to control various configuration 
  settings.
*/
SC.ENV = 'undefined' === typeof ENV ? {} : ENV;

/**
  Empty function.  Useful for some operations.

  @returns {Object}
  @private
*/
SC.K = function() { return this; };

/**
  Define an assertion that will throw an exception if the condition is not 
  met.  SproutCore build tools will remove any calls to sc_assert() when 
  doing a production build.
  
  ## Examples
  
      #js:
      
      // pass a simple Boolean value
      sc_assert('must pass a valid object', !!obj);

      // pass a function.  If the function returns false the assertion fails
      // any other return value (including void) will pass.
      sc_assert('a passed record must have a firstName', function() {
        if (obj instanceof SC.Record) {
          return !SC.empty(obj.firstName);
        }
      });
      
  @static
  @function
  @param {String} desc
    A description of the assertion.  This will become the text of the Error
    thrown if the assertion fails.
    
  @param {Boolean} test
    Must return true for the assertion to pass.  If you pass a function it
    will be executed.  If the function returns false an exception will be
    thrown.
*/
window.sc_assert = function sc_assert(desc, test) {
  if ('function' === typeof test) test = test()!==false;
  if (!test) throw new Error("assertion failed: "+desc);
};

//if ('undefined' === typeof sc_require) sc_require = SC.K;
if ('undefined' === typeof require) require = SC.K;

})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('sproutcore-metal/core');

/**
  @class

  Platform specific methods and feature detectors needed by the framework.
*/
var platform = SC.platform = {} ;

/**
  Identical to Object.create().  Implements if not available natively.
*/
platform.create = Object.create;

if (!platform.create) {
  var O_ctor = function() {},
      O_proto = O_ctor.prototype;

  platform.create = function(obj, descs) {
    O_ctor.prototype = obj;
    obj = new O_ctor();
    O_ctor.prototype = O_proto;

    if (descs !== undefined) {
      for(var key in descs) {
        if (!descs.hasOwnProperty(key)) continue;
        platform.defineProperty(obj, key, descs[key]);
      }
    }

    return obj;
  };

  platform.create.isSimulated = true;
}

var defineProperty = Object.defineProperty, canRedefineProperties, canDefinePropertyOnDOM;

// Catch IE8 where Object.defineProperty exists but only works on DOM elements
if (defineProperty) {
  try {
    defineProperty({}, 'a',{get:function(){}});
  } catch (e) {
    defineProperty = null;
  }
}

if (defineProperty) {
  // Detects a bug in Android <3.2 where you cannot redefine a property using
  // Object.defineProperty once accessors have already been set.
  canRedefineProperties = (function() {
    var obj = {};

    defineProperty(obj, 'a', {
      configurable: true,
      enumerable: true,
      get: function() { },
      set: function() { }
    });

    defineProperty(obj, 'a', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: true
    });

    return obj.a === true;
  })();

  // This is for Safari 5.0, which supports Object.defineProperty, but not
  // on DOM nodes.

  canDefinePropertyOnDOM = (function(){
    try {
      defineProperty(document.body, 'definePropertyOnDOM', {});
      return true;
    } catch(e) { }

    return false;
  })();

  if (!canRedefineProperties) {
    defineProperty = null;
  } else if (!canDefinePropertyOnDOM) {
    defineProperty = function(obj, keyName, desc){
      var isNode;

      if (typeof Node === "object") {
        isNode = obj instanceof Node;
      } else {
        isNode = typeof obj === "object" && typeof obj.nodeType === "number" && typeof obj.nodeName === "string";
      }

      if (isNode) {
        // TODO: Should we have a warning here?
        return (obj[keyName] = desc.value);
      } else {
        return Object.defineProperty(obj, keyName, desc);
      }
    };
  }
}

/**
  Identical to Object.defineProperty().  Implements as much functionality
  as possible if not available natively.

  @param {Object} obj The object to modify
  @param {String} keyName property name to modify
  @param {Object} desc descriptor hash
  @returns {void}
*/
platform.defineProperty = defineProperty;

/**
  Set to true if the platform supports native getters and setters.
*/
platform.hasPropertyAccessors = true;

if (!platform.defineProperty) {
  platform.hasPropertyAccessors = false;

  platform.defineProperty = function(obj, keyName, desc) {
    sc_assert("property descriptor cannot have `get` or `set` on this platform", !desc.get && !desc.set);
    obj[keyName] = desc.value;
  };

  platform.defineProperty.isSimulated = true;
}

})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-metal/core');
require('sproutcore-metal/platform');
    
// ..........................................................
// GUIDS
// 

// Used for guid generation...
var GUID_KEY = '__sc'+ (+ new Date());
var uuid, numberCache, stringCache;

uuid         = 0;
numberCache  = [];
stringCache  = {};

var GUID_DESC = {
  configurable: true,
  writable: true,
  enumerable: false
};

var o_defineProperty = SC.platform.defineProperty;
var o_create = SC.platform.create;

/**
  @private
  @static
  @type String
  @constant

  A unique key used to assign guids and other private metadata to objects.
  If you inspect an object in your browser debugger you will often see these.
  They can be safely ignored.

  On browsers that support it, these properties are added with enumeration 
  disabled so they won't show up when you iterate over your properties.
*/
SC.GUID_KEY = GUID_KEY;

/**
  @private

  Generates a new guid, optionally saving the guid to the object that you
  pass in.  You will rarely need to use this method.  Instead you should
  call SC.guidFor(obj), which return an existing guid if available.

  @param {Object} obj
    Optional object the guid will be used for.  If passed in, the guid will
    be saved on the object and reused whenever you pass the same object 
    again.

    If no object is passed, just generate a new guid.

  @param {String} prefix
    Optional prefix to place in front of the guid.  Useful when you want to
    separate the guid into separate namespaces.

  @returns {String} the guid
*/
SC.generateGuid = function(obj, prefix) {
  if (!prefix) prefix = 'sc';
  var ret = (prefix + (uuid++));
  if (obj) {
    GUID_DESC.value = ret;
    o_defineProperty(obj, GUID_KEY, GUID_DESC);
    GUID_DESC.value = null;
  }

  return ret ;
};

/**
  @private

  Returns a unique id for the object.  If the object does not yet have
  a guid, one will be assigned to it.  You can call this on any object,
  SC.Object-based or not, but be aware that it will add a _guid property.

  You can also use this method on DOM Element objects.

  @method
  @param obj {Object} any object, string, number, Element, or primitive
  @returns {String} the unique guid for this instance.
*/
SC.guidFor = function(obj) {

  // special cases where we don't want to add a key to object
  if (obj === undefined) return "(undefined)";
  if (obj === null) return "(null)";

  var cache, ret;
  var type = typeof obj;

  // Don't allow prototype changes to String etc. to change the guidFor
  switch(type) {
    case 'number':
      ret = numberCache[obj];
      if (!ret) ret = numberCache[obj] = 'nu'+obj;
      return ret;

    case 'string':
      ret = stringCache[obj];
      if (!ret) ret = stringCache[obj] = 'st'+(uuid++);
      return ret;

    case 'boolean':
      return obj ? '(true)' : '(false)';

    default:
      if (obj[GUID_KEY]) return obj[GUID_KEY];
      if (obj === Object) return '(Object)';
      if (obj === Array)  return '(Array)';
      return SC.generateGuid(obj, 'sc');
  }
};


// ..........................................................
// META
// 

var META_DESC = {
  writable:    true,
  configurable: false,
  enumerable:  false,
  value: null
};

var META_KEY = SC.GUID_KEY+'_meta';

/**
  The key used to store meta information on object for property observing.

  @static
  @property
*/
SC.META_KEY = META_KEY;

// Placeholder for non-writable metas.
var EMPTY_META = {
  descs: {},
  watching: {}
}; 

if (Object.freeze) Object.freeze(EMPTY_META);

/**
  @private
  @function
  
  Retrieves the meta hash for an object.  If 'writable' is true ensures the
  hash is writable for this object as well.
  
  The meta object contains information about computed property descriptors as
  well as any watched properties and other information.  You generally will
  not access this information directly but instead work with higher level 
  methods that manipulate this has indirectly.

  @param {Object} obj
    The object to retrieve meta for
    
  @param {Boolean} writable
    Pass false if you do not intend to modify the meta hash, allowing the 
    method to avoid making an unnecessary copy.
    
  @returns {Hash}
*/
SC.meta = function meta(obj, writable) {
  
  sc_assert("You must pass an object to SC.meta. This was probably called from SproutCore internals, so you probably called a SproutCore method with undefined that was expecting an object", obj != undefined);

  var ret = obj[META_KEY];
  if (writable===false) return ret || EMPTY_META;

  if (!ret) {
    o_defineProperty(obj, META_KEY, META_DESC);
    ret = obj[META_KEY] = {
      descs: {},
      watching: {},
      values: {},
      lastSetValues: {},
      cache:  {},
      source: obj
    };
    
    // make sure we don't accidentally try to create constructor like desc
    ret.descs.constructor = null;
    
  } else if (ret.source !== obj) {
    ret = obj[META_KEY] = o_create(ret);
    ret.descs    = o_create(ret.descs);
    ret.values   = o_create(ret.values);
    ret.watching = o_create(ret.watching);
    ret.lastSetValues = {};
    ret.cache    = {};
    ret.source   = obj;
  }
  return ret;
};

/**
  @private

  In order to store defaults for a class, a prototype may need to create
  a default meta object, which will be inherited by any objects instantiated
  from the class's constructor.

  However, the properties of that meta object are only shallow-cloned,
  so if a property is a hash (like the event system's `listeners` hash),
  it will by default be shared across all instances of that class.

  This method allows extensions to deeply clone a series of nested hashes or
  other complex objects. For instance, the event system might pass
  ['listeners', 'foo:change', 'sc157'] to `prepareMetaPath`, which will
  walk down the keys provided.

  For each key, if the key does not exist, it is created. If it already
  exists and it was inherited from its constructor, the constructor's
  key is cloned.

  You can also pass false for `writable`, which will simply return
  undefined if `prepareMetaPath` discovers any part of the path that
  shared or undefined.

  @param {Object} obj The object whose meta we are examining
  @param {Array} path An array of keys to walk down
  @param {Boolean} writable whether or not to create a new meta
    (or meta property) if one does not already exist or if it's
    shared with its constructor
*/
SC.metaPath = function(obj, path, writable) {
  var meta = SC.meta(obj, writable), keyName, value;

  for (var i=0, l=path.length; i<l; i++) {
    keyName = path[i];
    value = meta[keyName];

    if (!value) {
      if (!writable) { return undefined; }
      value = meta[keyName] = { __sc_source__: obj };
    } else if (value.__sc_source__ !== obj) {
      if (!writable) { return undefined; }
      value = meta[keyName] = o_create(value);
      value.__sc_source__ = obj;
    }

    meta = value;
  }

  return value;
};

/**
  @private

  Wraps the passed function so that `this._super` will point to the superFunc
  when the function is invoked.  This is the primitive we use to implement
  calls to super.
  
  @param {Function} func
    The function to call
    
  @param {Function} superFunc
    The super function.
    
  @returns {Function} wrapped function.
*/
SC.wrap = function(func, superFunc) {
  
  function K() {}
  
  var newFunc = function() {
    var ret, sup = this._super;
    this._super = superFunc || K;
    ret = func.apply(this, arguments);
    this._super = sup;
    return ret;
  };
  
  newFunc.base = func;
  return newFunc;
};

/**
  @function
  
  Returns YES if the passed object is an array or Array-like.

  SproutCore Array Protocol:

    - the object has an objectAt property
    - the object is a native Array
    - the object is an Object, and has a length property

  Unlike SC.typeOf this method returns true even if the passed object is
  not formally array but appears to be array-like (i.e. implements SC.Array)

  @param {Object} obj The object to test
  @returns {Boolean}
*/
SC.isArray = function(obj) {
  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray && Array.isArray(obj)) { return true; }
  if (SC.Array && SC.Array.detect(obj)) { return true; }
  if ((obj.length !== undefined) && 'object'===typeof obj) { return true; }
  return false;
};

/**
  Forces the passed object to be part of an array.  If the object is already
  an array or array-like, returns the object.  Otherwise adds the object to
  an array.  If obj is null or undefined, returns an empty array.
  
  @param {Object} obj the object
  @returns {Array}
*/
SC.makeArray = function(obj) {
  if (obj==null) return [];
  return SC.isArray(obj) ? obj : [obj];
};



})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('sproutcore-metal/core');
require('sproutcore-metal/platform');
require('sproutcore-metal/utils');

var USE_ACCESSORS = SC.platform.hasPropertyAccessors && SC.ENV.USE_ACCESSORS;
SC.USE_ACCESSORS = !!USE_ACCESSORS;

var meta = SC.meta;

// ..........................................................
// GET AND SET
// 
// If we are on a platform that supports accessors we can get use those.
// Otherwise simulate accessors by looking up the property directly on the
// object.

var get, set;

get = function get(obj, keyName) {
  if (keyName === undefined && 'string' === typeof obj) {
    keyName = obj;
    obj = SC;
  }
  
  if (!obj) return undefined;
  var ret = obj[keyName];
  if (ret===undefined && 'function'===typeof obj.unknownProperty) {
    ret = obj.unknownProperty(keyName);
  }
  return ret;
};

set = function set(obj, keyName, value) {
  if (('object'===typeof obj) && !(keyName in obj)) {
    if ('function' === typeof obj.setUnknownProperty) {
      obj.setUnknownProperty(keyName, value);
    } else if ('function' === typeof obj.unknownProperty) {
      obj.unknownProperty(keyName, value);
    } else obj[keyName] = value;
  } else {
    obj[keyName] = value;
  }
  return value;
};

if (!USE_ACCESSORS) {

  var o_get = get, o_set = set;
  
  get = function(obj, keyName) {
    if (keyName === undefined && 'string' === typeof obj) {
      keyName = obj;
      obj = SC;
    }

    sc_assert("You need to provide an object and key to `get`.", !!obj && keyName);

    if (!obj) return undefined;
    var desc = meta(obj, false).descs[keyName];
    if (desc) return desc.get(obj, keyName);
    else return o_get(obj, keyName);
  };

  set = function(obj, keyName, value) {
    sc_assert("You need to provide an object and key to `set`.", !!obj && keyName !== undefined);
    var desc = meta(obj, false).descs[keyName];
    if (desc) desc.set(obj, keyName, value);
    else o_set(obj, keyName, value);
    return value;
  };

}

/**
  @function
  
  Gets the value of a property on an object.  If the property is computed,
  the function will be invoked.  If the property is not defined but the 
  object implements the unknownProperty() method then that will be invoked.
  
  If you plan to run on IE8 and older browsers then you should use this 
  method anytime you want to retrieve a property on an object that you don't
  know for sure is private.  (My convention only properties beginning with 
  an underscore '_' are considered private.)
  
  On all newer browsers, you only need to use this method to retrieve 
  properties if the property might not be defined on the object and you want
  to respect the unknownProperty() handler.  Otherwise you can ignore this
  method.
  
  Note that if the obj itself is null, this method will simply return 
  undefined.
  
  @param {Object} obj
    The object to retrieve from.
    
  @param {String} keyName
    The property key to retrieve
    
  @returns {Object} the property value or null.
*/
SC.get = get;

/**
  @function 
  
  Sets the value of a property on an object, respecting computed properties
  and notifying observers and other listeners of the change.  If the 
  property is not defined but the object implements the unknownProperty()
  method then that will be invoked as well.
  
  If you plan to run on IE8 and older browsers then you should use this 
  method anytime you want to set a property on an object that you don't
  know for sure is private.  (My convention only properties beginning with 
  an underscore '_' are considered private.)
  
  On all newer browsers, you only need to use this method to set 
  properties if the property might not be defined on the object and you want
  to respect the unknownProperty() handler.  Otherwise you can ignore this
  method.
  
  @param {Object} obj
    The object to modify.
    
  @param {String} keyName
    The property key to set
    
  @param {Object} value
    The value to set
    
  @returns {Object} the passed value.
*/
SC.set = set;

// ..........................................................
// PATHS
// 

function normalizePath(path) {
  sc_assert('must pass non-empty string to normalizePath()', path && path!=='');
    
  if (path==='*') return path; //special case...
  var first = path.charAt(0);
  if(first==='.') return 'this'+path;
  if (first==='*' && path.charAt(1)!=='.') return 'this.'+path.slice(1);
  return path;
}

// assumes normalized input; no *, normalized path, always a target...
function getPath(target, path) {
  var len = path.length, idx, next, key;
  
  idx = path.indexOf('*');
  if (idx>0 && path[idx-1]!=='.') {
    return getPath(getPath(target, path.slice(0, idx)), path.slice(idx+1));
  }

  idx = 0;
  while(target && idx<len) {
    next = path.indexOf('.', idx);
    if (next<0) next = len;
    key = path.slice(idx, next);
    target = key==='*' ? target : get(target, key);

    if (target && target.isDestroyed) { return undefined; }

    idx = next+1;
  }
  return target ;
}

var TUPLE_RET = [];
var IS_GLOBAL = /^([A-Z$]|([0-9][A-Z$])).*[\.\*]/;
var IS_GLOBAL_SET = /^([A-Z$]|([0-9][A-Z$])).*[\.\*]?/;
var HAS_THIS  = /^this[\.\*]/;
var FIRST_KEY = /^([^\.\*]+)/;

function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

// assumes path is already normalized
function normalizeTuple(target, path) {
  var hasThis  = HAS_THIS.test(path),
      isGlobal = !hasThis && IS_GLOBAL.test(path),
      key;

  if (!target || isGlobal) target = window;
  if (hasThis) path = path.slice(5);
  
  var idx = path.indexOf('*');
  if (idx>0 && path.charAt(idx-1)!=='.') {
    
    // should not do lookup on a prototype object because the object isn't
    // really live yet.
    if (target && meta(target,false).proto!==target) {
      target = getPath(target, path.slice(0, idx));
    } else {
      target = null;
    }
    path   = path.slice(idx+1);

  } else if (target === window) {
    key = firstKey(path);
    target = get(target, key);
    path   = path.slice(key.length+1);
  }

  // must return some kind of path to be valid else other things will break.
  if (!path || path.length===0) throw new Error('Invalid Path');
  
  TUPLE_RET[0] = target;
  TUPLE_RET[1] = path;
  return TUPLE_RET;
}

/**
  @private

  Normalizes a path to support older-style property paths beginning with . or

  @function
  @param {String} path path to normalize
  @returns {String} normalized path  
*/
SC.normalizePath = normalizePath;

/**
  @private

  Normalizes a target/path pair to reflect that actual target/path that should
  be observed, etc.  This takes into account passing in global property 
  paths (i.e. a path beginning with a captial letter not defined on the 
  target) and * separators.
  
  @param {Object} target
    The current target.  May be null.
    
  @param {String} path
    A path on the target or a global property path.
    
  @returns {Array} a temporary array with the normalized target/path pair.
*/
SC.normalizeTuple = function(target, path) {
  return normalizeTuple(target, normalizePath(path));
};

SC.normalizeTuple.primitive = normalizeTuple;

SC.getPath = function(root, path) {
  var hasThis, hasStar, isGlobal;
  
  if (!path && 'string'===typeof root) {
    path = root;
    root = null;
  }

  hasStar = path.indexOf('*') > -1;

  // If there is no root and path is a key name, return that
  // property from the global object.
  // E.g. getPath('SC') -> SC
  if (root === null && !hasStar && path.indexOf('.') < 0) { return get(window, path); }

  // detect complicated paths and normalize them
  path = normalizePath(path);
  hasThis  = HAS_THIS.test(path);
  isGlobal = !hasThis && IS_GLOBAL.test(path);
  if (!root || hasThis || isGlobal || hasStar) {
    var tuple = normalizeTuple(root, path);
    root = tuple[0];
    path = tuple[1];
  } 
  
  return getPath(root, path);
};

SC.setPath = function(root, path, value, tolerant) {
  var keyName;
  
  if (arguments.length===2 && 'string' === typeof root) {
    value = path;
    path = root;
    root = null;
  }
  
  path = normalizePath(path);
  if (path.indexOf('*')>0) {
    var tuple = normalizeTuple(root, path);
    root = tuple[0];
    path = tuple[1];
  }

  if (path.indexOf('.') > 0) {
    keyName = path.slice(path.lastIndexOf('.')+1);
    path    = path.slice(0, path.length-(keyName.length+1));
    if (!HAS_THIS.test(path) && IS_GLOBAL_SET.test(path) && path.indexOf('.')<0) {
      root = window[path]; // special case only works during set...
    } else if (path !== 'this') {
      root = SC.getPath(root, path);
    }

  } else {
    if (IS_GLOBAL_SET.test(path)) throw new Error('Invalid Path');
    keyName = path;
  }
  
  if (!keyName || keyName.length===0 || keyName==='*') {
    throw new Error('Invalid Path');
  }

  if (!root) {
    if (tolerant) { return; }
    else { throw new Error('Object in path '+path+' could not be found or was destroyed.'); }
  }

  return SC.set(root, keyName, value);
};

/**
  Error-tolerant form of SC.setPath. Will not blow up if any part of the
  chain is undefined, null, or destroyed.

  This is primarily used when syncing bindings, which may try to update after
  an object has been destroyed.
*/
SC.trySetPath = function(root, path, value) {
  if (arguments.length===2 && 'string' === typeof root) {
    value = path;
    path = root;
    root = null;
  }

  return SC.setPath(root, path, value, true);
};

/**
  Returns true if the provided path is global (e.g., "MyApp.fooController.bar")
  instead of local ("foo.bar.baz").

  @param {String} path
  @returns Boolean
*/
SC.isGlobalPath = function(path) {
  return !HAS_THIS.test(path) && IS_GLOBAL.test(path);
}


})({});


(function(exports) {
// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/map
if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisp */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = new Array(len);
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in t)
        res[i] = fun.call(thisp, t[i], i, t);
    }

    return res;
  };
}

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/foreach
if (!Array.prototype.forEach)
{
  Array.prototype.forEach = function(fun /*, thisp */)
  {
    "use strict";
 
    if (this === void 0 || this === null)
      throw new TypeError();
 
    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in t)
        fun.call(thisp, t[i], i, t);
    }
  };
}

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (obj, fromIndex) {
    if (fromIndex == null) { fromIndex = 0; }
    else if (fromIndex < 0) { fromIndex = Math.max(0, this.length + fromIndex); }
    for (var i = fromIndex, j = this.length; i < j; i++) {
      if (this[i] === obj) { return i; }
    }
    return -1;
  };
}

})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('sproutcore-metal/core');
require('sproutcore-metal/platform');
require('sproutcore-metal/utils');
require('sproutcore-metal/accessors');

var USE_ACCESSORS = SC.USE_ACCESSORS;
var GUID_KEY = SC.GUID_KEY;
var META_KEY = SC.META_KEY;
var meta = SC.meta;
var o_create = SC.platform.create;
var o_defineProperty = SC.platform.defineProperty;
var SIMPLE_PROPERTY, WATCHED_PROPERTY;

// ..........................................................
// DESCRIPTOR
// 

var SIMPLE_DESC = {
  writable: true,
  configurable: true,
  enumerable: true,
  value: null
};

/**
  @private
  @constructor
  
  Objects of this type can implement an interface to responds requests to
  get and set.  The default implementation handles simple properties.
  
  You generally won't need to create or subclass this directly.
*/
var Dc = SC.Descriptor = function() {};

var setup = Dc.setup = function(obj, keyName, value) {
  SIMPLE_DESC.value = value;
  o_defineProperty(obj, keyName, SIMPLE_DESC);
  SIMPLE_DESC.value = null;
};

var Dp = SC.Descriptor.prototype;

/**
  Called whenever we want to set the property value.  Should set the value 
  and return the actual set value (which is usually the same but may be 
  different in the case of computed properties.)
  
  @param {Object} obj
    The object to set the value on.
    
  @param {String} keyName
    The key to set.
    
  @param {Object} value
    The new value
    
  @returns {Object} value actual set value
*/
Dp.set = function(obj, keyName, value) {
  obj[keyName] = value;
  return value;
};

/**
  Called whenever we want to get the property value.  Should retrieve the 
  current value.
  
  @param {Object} obj
    The object to get the value on.
    
  @param {String} keyName
    The key to retrieve
    
  @returns {Object} the current value
*/
Dp.get = function(obj, keyName) {
  return w_get(obj, keyName, obj);
};

/**
  This is called on the descriptor to set it up on the object.  The 
  descriptor is responsible for actually defining the property on the object
  here.
  
  The passed `value` is the transferValue returned from any previous 
  descriptor.
  
  @param {Object} obj
    The object to set the value on.
    
  @param {String} keyName
    The key to set.
    
  @param {Object} value
    The transfer value from any previous descriptor.
  
  @returns {void}
*/
Dp.setup = setup;

/**
  This is called on the descriptor just before another descriptor takes its
  place.  This method should at least return the 'transfer value' of the 
  property - which is the value you want to passed as the input to the new
  descriptor's setup() method.  
  
  It is not generally necessary to actually 'undefine' the property as a new
  property descriptor will redefine it immediately after this method returns.
  
  @param {Object} obj
    The object to set the value on.
    
  @param {String} keyName
    The key to set.
    
  @returns {Object} transfer value
*/
Dp.teardown = function(obj, keyName) {
  return obj[keyName];
};

Dp.val = function(obj, keyName) {
  return obj[keyName];
};

// ..........................................................
// SIMPLE AND WATCHED PROPERTIES
// 

// if accessors are disabled for the app then this will act as a guard when
// testing on browsers that do support accessors.  It will throw an exception
// if you do foo.bar instead of SC.get(foo, 'bar')

if (!USE_ACCESSORS) {
  SC.Descriptor.MUST_USE_GETTER = function() {
    sc_assert('Must use SC.get() to access this property', false);
  };

  SC.Descriptor.MUST_USE_SETTER = function() {
    if (this.isDestroyed) {
      sc_assert('You cannot set observed properties on destroyed objects', false);
    } else {
      sc_assert('Must use SC.set() to access this property', false);
    }
  };
}

var WATCHED_DESC = {
  configurable: true,
  enumerable:   true,
  set: SC.Descriptor.MUST_USE_SETTER
};

function w_get(obj, keyName, values) {
  values = values || meta(obj, false).values;

  if (values) {
    var ret = values[keyName];
    if (ret !== undefined) { return ret; }
    if (obj.unknownProperty) { return obj.unknownProperty(keyName); }
  }

}

function w_set(obj, keyName, value) {
  var m = meta(obj), watching;
  
  watching = m.watching[keyName]>0 && value!==m.values[keyName];  
  if (watching) SC.propertyWillChange(obj, keyName);
  m.values[keyName] = value;
  if (watching) SC.propertyDidChange(obj, keyName);
  return value;
}

var WATCHED_GETTERS = {};
function mkWatchedGetter(keyName) {
  var ret = WATCHED_GETTERS[keyName];
  if (!ret) {
    ret = WATCHED_GETTERS[keyName] = function() { 
      return w_get(this, keyName); 
    };
  }
  return ret;
}

var WATCHED_SETTERS = {};
function mkWatchedSetter(keyName) {
  var ret = WATCHED_SETTERS[keyName];
  if (!ret) {
    ret = WATCHED_SETTERS[keyName] = function(value) {
      return w_set(this, keyName, value);
    };
  }
  return ret;
}

/**
  @private 
  
  Private version of simple property that invokes property change callbacks.
*/
WATCHED_PROPERTY = new SC.Descriptor();

if (SC.platform.hasPropertyAccessors) {
  WATCHED_PROPERTY.get = w_get ;
  WATCHED_PROPERTY.set = w_set ;

  if (USE_ACCESSORS) {
    WATCHED_PROPERTY.setup = function(obj, keyName, value) {
      WATCHED_DESC.get = mkWatchedGetter(keyName);
      WATCHED_DESC.set = mkWatchedSetter(keyName);
      o_defineProperty(obj, keyName, WATCHED_DESC);
      WATCHED_DESC.get = WATCHED_DESC.set = null;
      if (value !== undefined) meta(obj).values[keyName] = value;
    };

  } else {
    WATCHED_PROPERTY.setup = function(obj, keyName, value) {
      WATCHED_DESC.get = mkWatchedGetter(keyName);
      o_defineProperty(obj, keyName, WATCHED_DESC);
      WATCHED_DESC.get = null;
      if (value !== undefined) meta(obj).values[keyName] = value;
    };
  }

  WATCHED_PROPERTY.teardown = function(obj, keyName) {
    var ret = meta(obj).values[keyName];
    delete meta(obj).values[keyName];
    return ret;
  };

// NOTE: if platform does not have property accessors then we just have to 
// set values and hope for the best.  You just won't get any warnings...
} else {
  
  WATCHED_PROPERTY.set = function(obj, keyName, value) {
    var m = meta(obj), watching;

    watching = m.watching[keyName]>0 && value!==obj[keyName];  
    if (watching) SC.propertyWillChange(obj, keyName);
    obj[keyName] = value;
    if (watching) SC.propertyDidChange(obj, keyName);
    return value;
  };
  
}

/**
  The default descriptor for simple properties.  Pass as the third argument
  to SC.defineProperty() along with a value to set a simple value.
  
  @static
  @default SC.Descriptor
*/
SC.SIMPLE_PROPERTY = new SC.Descriptor();
SIMPLE_PROPERTY = SC.SIMPLE_PROPERTY;

SIMPLE_PROPERTY.unwatched = WATCHED_PROPERTY.unwatched = SIMPLE_PROPERTY;
SIMPLE_PROPERTY.watched   = WATCHED_PROPERTY.watched   = WATCHED_PROPERTY;


// ..........................................................
// DEFINING PROPERTIES API
// 

function hasDesc(descs, keyName) {
  if (keyName === 'toString') return 'function' !== typeof descs.toString;
  else return !!descs[keyName];
}

/**
  @private

  NOTE: This is a low-level method used by other parts of the API.  You almost
  never want to call this method directly.  Instead you should use SC.mixin()
  to define new properties.
  
  Defines a property on an object.  This method works much like the ES5 
  Object.defineProperty() method except that it can also accept computed 
  properties and other special descriptors. 

  Normally this method takes only three parameters.  However if you pass an
  instance of SC.Descriptor as the third param then you can pass an optional
  value as the fourth parameter.  This is often more efficient than creating
  new descriptor hashes for each property.
  
  ## Examples

      // ES5 compatible mode
      SC.defineProperty(contact, 'firstName', {
        writable: true,
        configurable: false,
        enumerable: true,
        value: 'Charles'
      });
      
      // define a simple property
      SC.defineProperty(contact, 'lastName', SC.SIMPLE_PROPERTY, 'Jolley');
      
      // define a computed property
      SC.defineProperty(contact, 'fullName', SC.computed(function() {
        return this.firstName+' '+this.lastName;
      }).property('firstName', 'lastName').cacheable());
*/
SC.defineProperty = function(obj, keyName, desc, val) {
  var m = meta(obj, false), descs = m.descs, watching = m.watching[keyName]>0;

  if (val === undefined) {
    val = hasDesc(descs, keyName) ? descs[keyName].teardown(obj, keyName) : obj[keyName];
  } else if (hasDesc(descs, keyName)) {
    descs[keyName].teardown(obj, keyName);
  }

  if (!desc) desc = SIMPLE_PROPERTY;
  
  if (desc instanceof SC.Descriptor) {
    m = meta(obj, true);
    descs = m.descs;
    
    desc = (watching ? desc.watched : desc.unwatched) || desc; 
    descs[keyName] = desc;
    desc.setup(obj, keyName, val, watching);

  // compatibility with ES5
  } else {
    if (descs[keyName]) meta(obj).descs[keyName] = null;
    o_defineProperty(obj, keyName, desc);
  }
  
  return this;
};

/**
  Creates a new object using the passed object as its prototype.  On browsers
  that support it, this uses the built in Object.create method.  Else one is
  simulated for you.
  
  This method is a better choice thant Object.create() because it will make 
  sure that any observers, event listeners, and computed properties are 
  inherited from the parent as well.
  
  @param {Object} obj
    The object you want to have as the prototype.
    
  @returns {Object} the newly created object
*/
SC.create = function(obj, props) {
  var ret = o_create(obj, props);
  if (GUID_KEY in ret) SC.generateGuid(ret, 'sc');
  if (META_KEY in ret) SC.rewatch(ret); // setup watch chains if needed.
  return ret;
};

/**
  @private

  Creates a new object using the passed object as its prototype.  This method
  acts like `SC.create()` in every way except that bindings, observers, and
  computed properties will be activated on the object.  
  
  The purpose of this method is to build an object for use in a prototype
  chain. (i.e. to be set as the `prototype` property on a constructor 
  function).  Prototype objects need to inherit bindings, observers and
  other configuration so they pass it on to their children.  However since
  they are never 'live' objects themselves, they should not fire or make
  other changes when various properties around them change.
  
  You should use this method anytime you want to create a new object for use
  in a prototype chain.

  @param {Object} obj
    The base object.

  @param {Object} hash
    Optional hash of properties to define on the object.

  @returns {Object} new object
*/
SC.createPrototype = function(obj, props) {
  var ret = o_create(obj, props);
  meta(ret, true).proto = ret;
  if (GUID_KEY in ret) SC.generateGuid(ret, 'sc');
  if (META_KEY in ret) SC.rewatch(ret); // setup watch chains if needed.
  return ret;
};
  

/**
  Tears down the meta on an object so that it can be garbage collected.
  Multiple calls will have no effect.
  
  @param {Object} obj  the object to destroy
  @returns {void}
*/
SC.destroy = function(obj) {
  if (obj[META_KEY]) obj[META_KEY] = null; 
};


})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('sproutcore-metal/core');
require('sproutcore-metal/platform');
require('sproutcore-metal/utils');
require('sproutcore-metal/properties');

var meta = SC.meta;
var guidFor = SC.guidFor;
var USE_ACCESSORS = SC.USE_ACCESSORS;
var a_slice = Array.prototype.slice;
var o_create = SC.platform.create;
var o_defineProperty = SC.platform.defineProperty;

// ..........................................................
// DEPENDENT KEYS
// 

// data structure:
//  meta.deps = { 
//   'depKey': { 
//     'keyName': count,
//     __scproto__: SRC_OBJ [to detect clones]
//     },
//   __scproto__: SRC_OBJ
//  }

function uniqDeps(obj, depKey) {
  var m = meta(obj), deps, ret;
  deps = m.deps;
  if (!deps) {
    deps = m.deps = { __scproto__: obj };
  } else if (deps.__scproto__ !== obj) {
    deps = m.deps = o_create(deps);
    deps.__scproto__ = obj;
  }
  
  ret = deps[depKey];
  if (!ret) {
    ret = deps[depKey] = { __scproto__: obj };
  } else if (ret.__scproto__ !== obj) {
    ret = deps[depKey] = o_create(ret);
    ret.__scproto__ = obj;
  }
  
  return ret;
}

function addDependentKey(obj, keyName, depKey) {
  var deps = uniqDeps(obj, depKey);
  deps[keyName] = (deps[keyName] || 0) + 1;
  SC.watch(obj, depKey);
}

function removeDependentKey(obj, keyName, depKey) {
  var deps = uniqDeps(obj, depKey);
  deps[keyName] = (deps[keyName] || 0) - 1;
  SC.unwatch(obj, depKey);
}

function addDependentKeys(desc, obj, keyName) {
  var keys = desc._dependentKeys, 
      len  = keys ? keys.length : 0;
  for(var idx=0;idx<len;idx++) addDependentKey(obj, keyName, keys[idx]);
}

// ..........................................................
// COMPUTED PROPERTY
//

function ComputedProperty(func, opts) {
  this.func = func;
  this._cacheable = opts && opts.cacheable;
  this._dependentKeys = opts && opts.dependentKeys;
}

SC.ComputedProperty = ComputedProperty;
ComputedProperty.prototype = new SC.Descriptor();

var CP_DESC = {
  configurable: true,
  enumerable:   true,
  get: function() { return undefined; }, // for when use_accessors is false.
  set: SC.Descriptor.MUST_USE_SETTER  // for when use_accessors is false
};

function mkCpGetter(keyName, desc) {
  var cacheable = desc._cacheable, 
      func     = desc.func;
      
  if (cacheable) {
    return function() {
      var ret, cache = meta(this).cache;
      if (keyName in cache) return cache[keyName];
      ret = cache[keyName] = func.call(this, keyName);
      return ret ;
    };
  } else {
    return function() {
      return func.call(this, keyName);
    };
  }
}

function mkCpSetter(keyName, desc) {
  var cacheable = desc._cacheable,
      func      = desc.func;
      
  return function(value) {
    var m = meta(this, cacheable),
        watched = (m.source===this) && m.watching[keyName]>0,
        ret, oldSuspended, lastSetValues;

    oldSuspended = desc._suspended;
    desc._suspended = this;

    watched = watched && m.lastSetValues[keyName]!==guidFor(value);
    if (watched) {
      m.lastSetValues[keyName] = guidFor(value);
      SC.propertyWillChange(this, keyName);
    }
    
    if (cacheable) delete m.cache[keyName];
    ret = func.call(this, keyName, value);
    if (cacheable) m.cache[keyName] = ret;
    if (watched) SC.propertyDidChange(this, keyName);
    desc._suspended = oldSuspended;
    return ret;
  };
}

var Cp = ComputedProperty.prototype;

/**
  Call on a computed property to set it into cacheable mode.  When in this
  mode the computed property will automatically cache the return value of 
  your function until one of the dependent keys changes.

  @param {Boolean} aFlag optional set to false to disable cacheing
  @returns {SC.ComputedProperty} receiver
*/
Cp.cacheable = function(aFlag) {
  this._cacheable = aFlag!==false;
  return this;
};

/**
  Sets the dependent keys on this computed property.  Pass any number of 
  arguments containing key paths that this computed property depends on.
  
  @param {String} path... zero or more property paths
  @returns {SC.ComputedProperty} receiver
*/
Cp.property = function() {
  this._dependentKeys = a_slice.call(arguments);
  return this;
};

/** @private - impl descriptor API */
Cp.setup = function(obj, keyName, value) {
  CP_DESC.get = mkCpGetter(keyName, this);
  CP_DESC.set = mkCpSetter(keyName, this);
  o_defineProperty(obj, keyName, CP_DESC);
  CP_DESC.get = CP_DESC.set = null;
  addDependentKeys(this, obj, keyName);
};

/** @private - impl descriptor API */
Cp.teardown = function(obj, keyName) {
  var keys = this._dependentKeys, 
      len  = keys ? keys.length : 0;
  for(var idx=0;idx<len;idx++) removeDependentKey(obj, keyName, keys[idx]);

  if (this._cacheable) delete meta(obj).cache[keyName];
  
  return null; // no value to restore
};

/** @private - impl descriptor API */
Cp.didChange = function(obj, keyName) {
  if (this._cacheable && (this._suspended !== obj)) {
    delete meta(obj).cache[keyName];
  }
};

/** @private - impl descriptor API */
Cp.get = function(obj, keyName) {
  var ret, cache;
  
  if (this._cacheable) {
    cache = meta(obj).cache;
    if (keyName in cache) return cache[keyName];
    ret = cache[keyName] = this.func.call(obj, keyName);
  } else {
    ret = this.func.call(obj, keyName);
  }
  return ret ;
};

/** @private - impl descriptor API */
Cp.set = function(obj, keyName, value) {
  var cacheable = this._cacheable;
  
  var m = meta(obj, cacheable),
      watched = (m.source===obj) && m.watching[keyName]>0,
      ret, oldSuspended, lastSetValues;

  oldSuspended = this._suspended;
  this._suspended = obj;

  watched = watched && m.lastSetValues[keyName]!==guidFor(value);
  if (watched) {
    m.lastSetValues[keyName] = guidFor(value);
    SC.propertyWillChange(obj, keyName);
  }
  
  if (cacheable) delete m.cache[keyName];
  ret = this.func.call(obj, keyName, value);
  if (cacheable) m.cache[keyName] = ret;
  if (watched) SC.propertyDidChange(obj, keyName);
  this._suspended = oldSuspended;
  return ret;
};

Cp.val = function(obj, keyName) {
  return meta(obj, false).values[keyName];
};

if (!SC.platform.hasPropertyAccessors) {
  Cp.setup = function(obj, keyName, value) {
    obj[keyName] = undefined; // so it shows up in key iteration
    addDependentKeys(this, obj, keyName);
  };
  
} else if (!USE_ACCESSORS) {
  Cp.setup = function(obj, keyName) {
    // throw exception if not using SC.get() and SC.set() when supported
    o_defineProperty(obj, keyName, CP_DESC);
    addDependentKeys(this, obj, keyName);
  };
} 

/**
  This helper returns a new property descriptor that wraps the passed 
  computed property function.  You can use this helper to define properties
  with mixins or via SC.defineProperty().
  
  The function you pass will be used to both get and set property values.
  The function should accept two parameters, key and value.  If value is not
  undefined you should set the value first.  In either case return the 
  current value of the property.
  
  @param {Function} func
    The computed property function.
    
  @returns {SC.ComputedProperty} property descriptor instance
*/
SC.computed = function(func) {
  return new ComputedProperty(func);
};

})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('sproutcore-metal/core');
require('sproutcore-metal/platform');
require('sproutcore-metal/utils');

var o_create = SC.platform.create;
var meta = SC.meta;
var guidFor = SC.guidFor;
var array_Slice = Array.prototype.slice;

/**
  The event system uses a series of nested hashes to store listeners on an
  object. When a listener is registered, or when an event arrives, these
  hashes are consulted to determine which target and action pair to invoke.

  The hashes are stored in the object's meta hash, and look like this:

      // Object's meta hash
      {
        listeners: {               // variable name: `listenerSet`
          "foo:changed": {         // variable name: `targetSet`
            [targetGuid]: {        // variable name: `actionSet`
              [methodGuid]: {      // variable name: `action`
                target: [Object object],
                method: [Function function],
                xform: [Function function]
              }
            }
          }
        }
      }

*/

var metaPath = SC.metaPath;

// Gets the set of all actions, keyed on the guid of each action's
// method property.
function actionSetFor(obj, eventName, target, writable) {
  var targetGuid = guidFor(target);
  return metaPath(obj, ['listeners', eventName, targetGuid], writable);
}

// Gets the set of all targets, keyed on the guid of each action's
// target property.
function targetSetFor(obj, eventName) {
  var listenerSet = meta(obj, false).listeners;
  if (!listenerSet) { return false; }

  return listenerSet[eventName] || false;
}

// TODO: This knowledge should really be a part of the
// meta system.
var SKIP_PROPERTIES = { __sc_source__: true };

// For a given target, invokes all of the methods that have
// been registered as a listener.
function invokeEvents(targetSet, params) {
  // Iterate through all elements of the target set
  for(var targetGuid in targetSet) {
    if (SKIP_PROPERTIES[targetGuid]) { continue; }

    var actionSet = targetSet[targetGuid];

    // Iterate through the elements of the action set
    for(var methodGuid in actionSet) {
      if (SKIP_PROPERTIES[methodGuid]) { continue; }

      var action = actionSet[methodGuid]
      if (!action) { continue; }

      // Extract target and method for each action
      var method = action.method;
      var target = action.target;

      // If there is no target, the target is the object
      // on which the event was fired.
      if (!target) { target = params[0]; }
      if ('string' === typeof method) { method = target[method]; }

      // Listeners can provide an `xform` function, which can perform
      // arbitrary transformations, such as changing the order of
      // parameters.
      //
      // This is primarily used by sproutcore-runtime's observer system, which
      // provides a higher level abstraction on top of events, including
      // dynamically looking up current values and passing them into the
      // registered listener.
      var xform = action.xform;

      if (xform) {
        xform(target, method, params);
      } else {
        method.apply(target, params);
      }
    }
  }
}

/**
  The parameters passed to an event listener are not exactly the
  parameters passed to an observer. if you pass an xform function, it will
  be invoked and is able to translate event listener parameters into the form
  that observers are expecting.
*/
function addListener(obj, eventName, target, method, xform) {
  sc_assert("You must pass at least an object and event name to SC.addListener", !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actionSet = actionSetFor(obj, eventName, target, true),
      methodGuid = guidFor(method), ret;

  if (!actionSet[methodGuid]) {
    actionSet[methodGuid] = { target: target, method: method, xform: xform };
  } else {
    actionSet[methodGuid].xform = xform; // used by observers etc to map params
  }

  if ('function' === typeof obj.didAddListener) {
    obj.didAddListener(eventName, target, method);
  }

  return ret; // return true if this is the first listener.
}

function removeListener(obj, eventName, target, method) {
  if (!method && 'function'===typeof target) {
    method = target;
    target = null;
  }

  var actionSet = actionSetFor(obj, eventName, target, true),
      methodGuid = guidFor(method);

  // we can't simply delete this parameter, because if we do, we might
  // re-expose the property from the prototype chain.
  if (actionSet && actionSet[methodGuid]) { actionSet[methodGuid] = null; }

  if (obj && 'function'===typeof obj.didRemoveListener) {
    obj.didRemoveListener(eventName, target, method);
  }
}

// returns a list of currently watched events
function watchedEvents(obj) {
  var listeners = meta(obj, false).listeners, ret = [];

  if (listeners) {
    for(var eventName in listeners) {
      if (!SKIP_PROPERTIES[eventName] && listeners[eventName]) {
        ret.push(eventName);
      }
    }
  }
  return ret;
}

function sendEvent(obj, eventName) {
  sc_assert("You must pass an object and event name to SC.sendEvent", !!obj && !!eventName);

  // first give object a chance to handle it
  if (obj !== SC && 'function' === typeof obj.sendEvent) {
    obj.sendEvent.apply(obj, array_Slice.call(arguments, 1));
  }

  var targetSet = targetSetFor(obj, eventName);
  if (!targetSet) { return false; }

  invokeEvents(targetSet, arguments);
  return true;
}

function hasListeners(obj, eventName) {
  var targetSet = targetSetFor(obj, eventName);
  if (!targetSet) { return false; }

  for(var targetGuid in targetSet) {
    if (SKIP_PROPERTIES[targetGuid] || !targetSet[targetGuid]) { continue; }

    var actionSet = targetSet[targetGuid];

    for(var methodGuid in actionSet) {
      if (SKIP_PROPERTIES[methodGuid] || !actionSet[methodGuid]) { continue; }
      return true; // stop as soon as we find a valid listener
    }
  }

  // no listeners!  might as well clean this up so it is faster later.
  var set = metaPath(obj, ['listeners'], true);
  set[eventName] = null;

  return false;
}

function listenersFor(obj, eventName) {
  var targetSet = targetSetFor(obj, eventName), ret = [];
  if (!targetSet) { return ret; }

  var info;
  for(var targetGuid in targetSet) {
    if (SKIP_PROPERTIES[targetGuid] || !targetSet[targetGuid]) { continue; }

    var actionSet = targetSet[targetGuid];

    for(var methodGuid in actionSet) {
      if (SKIP_PROPERTIES[methodGuid] || !actionSet[methodGuid]) { continue; }
      info = actionSet[methodGuid];
      ret.push([info.target, info.method]);
    }
  }

  return ret;
}

SC.addListener = addListener;
SC.removeListener = removeListener;
SC.sendEvent = sendEvent;
SC.hasListeners = hasListeners;
SC.watchedEvents = watchedEvents;
SC.listenersFor = listenersFor;

})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('sproutcore-metal/core');
require('sproutcore-metal/platform');
require('sproutcore-metal/utils');
require('sproutcore-metal/accessors');

var AFTER_OBSERVERS = ':change';
var BEFORE_OBSERVERS = ':before';
var guidFor = SC.guidFor;
var normalizePath = SC.normalizePath;

var suspended = 0;
var array_Slice = Array.prototype.slice;

var ObserverSet = function(iterateable) {
  this.set = {};
  if (iterateable) { this.array = []; }
}

ObserverSet.prototype.add = function(target, name) {
  var set = this.set, guid = SC.guidFor(target), array;

  if (!set[guid]) { set[guid] = {}; }
  set[guid][name] = true;
  if (array = this.array) {
    array.push([target, name]);
  }
};

ObserverSet.prototype.contains = function(target, name) {
  var set = this.set, guid = SC.guidFor(target), nameSet = set[guid];
  return nameSet && nameSet[name];
};

ObserverSet.prototype.empty = function() {
  this.set = {};
  this.array = [];
};

ObserverSet.prototype.forEach = function(fn) {
  var q = this.array;
  this.empty();
  q.forEach(function(item) {
    fn(item[0], item[1]);
  });
};

var queue = new ObserverSet(true), beforeObserverSet = new ObserverSet();

function notifyObservers(obj, eventName, forceNotification) {
  if (suspended && !forceNotification) {

    // if suspended add to the queue to send event later - but only send 
    // event once.
    if (!queue.contains(obj, eventName)) {
      queue.add(obj, eventName);
    }

  } else {
    SC.sendEvent(obj, eventName);
  }
}

function flushObserverQueue() {
  beforeObserverSet.empty();

  if (!queue || queue.array.length===0) return ;
  queue.forEach(function(target, event){ SC.sendEvent(target, event); });
}

SC.beginPropertyChanges = function() {
  suspended++;
  return this;
};

SC.endPropertyChanges = function() {
  suspended--;
  if (suspended<=0) flushObserverQueue();
};

function changeEvent(keyName) {
  return keyName+AFTER_OBSERVERS;
}

function beforeEvent(keyName) {
  return keyName+BEFORE_OBSERVERS;
}

function changeKey(eventName) {
  return eventName.slice(0, -7);
}

function beforeKey(eventName) {
  return eventName.slice(0, -7);
}

function xformForArgs(args) {
  return function (target, method, params) {
    var obj = params[0], keyName = changeKey(params[1]), val;
    var copy_args = args.slice();
    if (method.length>2) val = SC.getPath(obj, keyName);
    copy_args.unshift(obj, keyName, val);
    method.apply(target, copy_args);
  }
}

var xformChange = xformForArgs([]);

function xformBefore(target, method, params) {
  var obj = params[0], keyName = beforeKey(params[1]), val;
  if (method.length>2) val = SC.getPath(obj, keyName);
  method.call(target, obj, keyName, val);
}

SC.addObserver = function(obj, path, target, method) {
  path = normalizePath(path);

  var xform;
  if (arguments.length > 4) {
    var args = array_Slice.call(arguments, 4);
    xform = xformForArgs(args);
  } else {
    xform = xformChange;
  }
  SC.addListener(obj, changeEvent(path), target, method, xform);
  SC.watch(obj, path);
  return this;
};

/** @private */
SC.observersFor = function(obj, path) {
  return SC.listenersFor(obj, changeEvent(path));
};

SC.removeObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.unwatch(obj, path);
  SC.removeListener(obj, changeEvent(path), target, method);
  return this;
};

SC.addBeforeObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.addListener(obj, beforeEvent(path), target, method, xformBefore);
  SC.watch(obj, path);
  return this;
};

/** @private */
SC.beforeObserversFor = function(obj, path) {
  return SC.listenersFor(obj, beforeEvent(path));
};

SC.removeBeforeObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.unwatch(obj, path);
  SC.removeListener(obj, beforeEvent(path), target, method);
  return this;
};

/** @private */
SC.notifyObservers = function(obj, keyName) {
  notifyObservers(obj, changeEvent(keyName));
};

/** @private */
SC.notifyBeforeObservers = function(obj, keyName) {
  var guid, set, forceNotification = false;

  if (suspended) {
    if (!beforeObserverSet.contains(obj, keyName)) {
      beforeObserverSet.add(obj, keyName);
      forceNotification = true;
    } else {
      return;
    }
  }

  notifyObservers(obj, beforeEvent(keyName), forceNotification);
};


})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('sproutcore-metal/core');
require('sproutcore-metal/platform');
require('sproutcore-metal/utils');
require('sproutcore-metal/accessors');
require('sproutcore-metal/properties');
require('sproutcore-metal/observer');

var guidFor = SC.guidFor;
var meta    = SC.meta;
var get = SC.get, set = SC.set;
var normalizeTuple = SC.normalizeTuple.primitive;
var normalizePath  = SC.normalizePath;
var SIMPLE_PROPERTY = SC.SIMPLE_PROPERTY;
var GUID_KEY = SC.GUID_KEY;
var notifyObservers = SC.notifyObservers;

var FIRST_KEY = /^([^\.\*]+)/;
var IS_PATH = /[\.\*]/;

function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

// returns true if the passed path is just a keyName
function isKeyName(path) {
  return path==='*' || !IS_PATH.test(path);
}

// ..........................................................
// DEPENDENT KEYS
// 

var DEP_SKIP = { __scproto__: true }; // skip some keys and toString
function iterDeps(methodName, obj, depKey, seen) {
  
  var guid = guidFor(obj);
  if (!seen[guid]) seen[guid] = {};
  if (seen[guid][depKey]) return ;
  seen[guid][depKey] = true;
  
  var deps = meta(obj, false).deps, method = SC[methodName];
  deps = deps && deps[depKey];
  if (deps) {
    for(var key in deps) {
      if (DEP_SKIP[key]) continue;
      method(obj, key);
    }
  }
}


var WILL_SEEN, DID_SEEN;

// called whenever a property is about to change to clear the cache of any dependent keys (and notify those properties of changes, etc...)
function dependentKeysWillChange(obj, depKey) {
  var seen = WILL_SEEN, top = !seen;
  if (top) seen = WILL_SEEN = {};
  iterDeps('propertyWillChange', obj, depKey, seen);
  if (top) WILL_SEEN = null;
}

// called whenever a property has just changed to update dependent keys
function dependentKeysDidChange(obj, depKey) {
  var seen = DID_SEEN, top = !seen;
  if (top) seen = DID_SEEN = {};
  iterDeps('propertyDidChange', obj, depKey, seen);
  if (top) DID_SEEN = null;
}

// ..........................................................
// CHAIN
// 

function addChainWatcher(obj, keyName, node) {
  if (!obj || ('object' !== typeof obj)) return; // nothing to do
  var m = meta(obj);
  var nodes = m.chainWatchers;
  if (!nodes || nodes.__scproto__ !== obj) {
    nodes = m.chainWatchers = { __scproto__: obj };
  }

  if (!nodes[keyName]) nodes[keyName] = {};
  nodes[keyName][guidFor(node)] = node;
  SC.watch(obj, keyName);
}

function removeChainWatcher(obj, keyName, node) {
  if (!obj || ('object' !== typeof obj)) return; // nothing to do
  var m = meta(obj, false);
  var nodes = m.chainWatchers;
  if (!nodes || nodes.__scproto__ !== obj) return; //nothing to do
  if (nodes[keyName]) delete nodes[keyName][guidFor(node)];
  SC.unwatch(obj, keyName);
}

var pendingQueue = [];

// attempts to add the pendingQueue chains again.  If some of them end up
// back in the queue and reschedule is true, schedules a timeout to try 
// again.
function flushPendingChains(reschedule) {
  if (pendingQueue.length===0) return ; // nothing to do
  
  var queue = pendingQueue;
  pendingQueue = [];
  
  queue.forEach(function(q) { q[0].add(q[1]); });
  if (reschedule!==false && pendingQueue.length>0) {
    setTimeout(flushPendingChains, 1);
  }
}

function isProto(pvalue) {
  return meta(pvalue, false).proto === pvalue;
}

// A ChainNode watches a single key on an object.  If you provide a starting
// value for the key then the node won't actually watch it.  For a root node 
// pass null for parent and key and object for value.
var ChainNode = function(parent, key, value, separator) {
  var obj;
  
  this._parent = parent;
  this._key    = key;
  this._watching = value===undefined;
  this._value  = value || (parent._value && !isProto(parent._value) && get(parent._value, key));
  this._separator = separator || '.';
  this._paths = {};

  if (this._watching) {
    this._object = parent._value;
    if (this._object) addChainWatcher(this._object, this._key, this);
  }
};


var Wp = ChainNode.prototype;

Wp.destroy = function() {
  if (this._watching) {
    var obj = this._object;
    if (obj) removeChainWatcher(obj, this._key, this);
    this._watching = false; // so future calls do nothing
  }
};

// copies a top level object only
Wp.copy = function(obj) {
  var ret = new ChainNode(null, null, obj, this._separator);
  var paths = this._paths, path;
  for(path in paths) {
    if (!(paths[path] > 0)) continue; // this check will also catch non-number vals.
    ret.add(path);
  }
  return ret;
};

// called on the root node of a chain to setup watchers on the specified 
// path.
Wp.add = function(path) {
  var obj, tuple, key, src, separator, paths;

  paths = this._paths;
  paths[path] = (paths[path] || 0) + 1 ;

  obj = this._value;
  tuple = normalizeTuple(obj, path);
  if (tuple[0] && (tuple[0] === obj)) {
    path = tuple[1];
    key  = firstKey(path);
    path = path.slice(key.length+1);

  // static path does not exist yet.  put into a queue and try to connect
  // later.
  } else if (!tuple[0]) {
    pendingQueue.push([this, path]);
    return;

  } else {
    src  = tuple[0];
    key  = path.slice(0, 0-(tuple[1].length+1));
    separator = path.slice(key.length, key.length+1);
    path = tuple[1];
  }

  this.chain(key, path, src, separator);
};

// called on the root node of a chain to teardown watcher on the specified
// path
Wp.remove = function(path) {
  var obj, tuple, key, src, paths;

  paths = this._paths;
  if (paths[path] > 0) paths[path]--;

  obj = this._value;
  tuple = normalizeTuple(obj, path);
  if (tuple[0] === obj) {
    path = tuple[1];
    key  = firstKey(path);
    path = path.slice(key.length+1);

  } else {
    src  = tuple[0];
    key  = path.slice(0, 0-(tuple[1].length+1));
    path = tuple[1];
  }

  this.unchain(key, path);
};

Wp.count = 0;

Wp.chain = function(key, path, src, separator) {
  var chains = this._chains, node;
  if (!chains) chains = this._chains = {};

  node = chains[key];
  if (!node) node = chains[key] = new ChainNode(this, key, src, separator);
  node.count++; // count chains...

  // chain rest of path if there is one
  if (path && path.length>0) {
    key = firstKey(path);
    path = path.slice(key.length+1);
    node.chain(key, path); // NOTE: no src means it will observe changes...
  }
};

Wp.unchain = function(key, path) {
  var chains = this._chains, node = chains[key];

  // unchain rest of path first...
  if (path && path.length>1) {
    key  = firstKey(path);
    path = path.slice(key.length+1);
    node.unchain(key, path);
  }

  // delete node if needed.
  node.count--;
  if (node.count<=0) {
    delete chains[node._key];
    node.destroy();
  }
  
};

Wp.willChange = function() {
  var chains = this._chains;
  if (chains) {
    for(var key in chains) {
      if (!chains.hasOwnProperty(key)) continue;
      chains[key].willChange();
    }
  }
  
  if (this._parent) this._parent.chainWillChange(this, this._key, 1);
};

Wp.chainWillChange = function(chain, path, depth) {
  if (this._key) path = this._key+this._separator+path;

  if (this._parent) {
    this._parent.chainWillChange(this, path, depth+1);
  } else {
    if (depth>1) SC.propertyWillChange(this._value, path);
    path = 'this.'+path;
    if (this._paths[path]>0) SC.propertyWillChange(this._value, path);
  }
};

Wp.chainDidChange = function(chain, path, depth) {
  if (this._key) path = this._key+this._separator+path;
  if (this._parent) {
    this._parent.chainDidChange(this, path, depth+1);
  } else {
    if (depth>1) SC.propertyDidChange(this._value, path);
    path = 'this.'+path;
    if (this._paths[path]>0) SC.propertyDidChange(this._value, path);
  }
};

Wp.didChange = function() {
  // update my own value first.
  if (this._watching) {
    var obj = this._parent._value;
    if (obj !== this._object) {
      removeChainWatcher(this._object, this._key, this);
      this._object = obj;
      addChainWatcher(obj, this._key, this);
    }
    this._value  = obj && !isProto(obj) ? get(obj, this._key) : undefined;
  }
  
  // then notify chains...
  var chains = this._chains;
  if (chains) {
    for(var key in chains) {
      if (!chains.hasOwnProperty(key)) continue;
      chains[key].didChange();
    }
  }

  // and finally tell parent about my path changing...
  if (this._parent) this._parent.chainDidChange(this, this._key, 1);
};

// get the chains for the current object.  If the current object has 
// chains inherited from the proto they will be cloned and reconfigured for
// the current object.
function chainsFor(obj) {
  var m   = meta(obj), ret = m.chains;
  if (!ret) {
    ret = m.chains = new ChainNode(null, null, obj);
  } else if (ret._value !== obj) {
    ret = m.chains = ret.copy(obj);
  }
  return ret ;
}



function notifyChains(obj, keyName, methodName) {
  var m = meta(obj, false);
  var nodes = m.chainWatchers;
  if (!nodes || nodes.__scproto__ !== obj) return; // nothing to do

  nodes = nodes[keyName];
  if (!nodes) return;
  
  for(var key in nodes) {
    if (!nodes.hasOwnProperty(key)) continue;
    nodes[key][methodName](obj, keyName);
  }
}

function chainsWillChange(obj, keyName) {
  notifyChains(obj, keyName, 'willChange');
}

function chainsDidChange(obj, keyName) {
  notifyChains(obj, keyName, 'didChange');
}

// ..........................................................
// WATCH
// 

var WATCHED_PROPERTY = SC.SIMPLE_PROPERTY.watched;

/**
  @private

  Starts watching a property on an object.  Whenever the property changes,
  invokes SC.propertyWillChange and SC.propertyDidChange.  This is the 
  primitive used by observers and dependent keys; usually you will never call
  this method directly but instead use higher level methods like
  SC.addObserver().
*/
SC.watch = function(obj, keyName) {

  // can't watch length on Array - it is special...
  if (keyName === 'length' && SC.typeOf(obj)==='array') return this;
  
  var m = meta(obj), watching = m.watching, desc;
  keyName = normalizePath(keyName);

  // activate watching first time
  if (!watching[keyName]) {
    watching[keyName] = 1;
    if (isKeyName(keyName)) {
      desc = m.descs[keyName];
      desc = desc ? desc.watched : WATCHED_PROPERTY;
      if (desc) SC.defineProperty(obj, keyName, desc);
    } else {
      chainsFor(obj).add(keyName);
    }

  }  else {
    watching[keyName] = (watching[keyName]||0)+1;
  }
  return this;
};

SC.isWatching = function(obj, keyName) {
  return !!meta(obj).watching[keyName];
};

SC.watch.flushPending = flushPendingChains;

/** @private */
SC.unwatch = function(obj, keyName) {
  // can't watch length on Array - it is special...
  if (keyName === 'length' && SC.typeOf(obj)==='array') return this;

  var watching = meta(obj).watching, desc, descs;
  keyName = normalizePath(keyName);
  if (watching[keyName] === 1) {
    watching[keyName] = 0;
    if (isKeyName(keyName)) {
      desc = meta(obj).descs[keyName];
      desc = desc ? desc.unwatched : SIMPLE_PROPERTY;
      if (desc) SC.defineProperty(obj, keyName, desc);
    } else {
      chainsFor(obj).remove(keyName);
    }

  } else if (watching[keyName]>1) {
    watching[keyName]--;
  }
  
  return this;
};

/**
  @private

  Call on an object when you first beget it from another object.  This will
  setup any chained watchers on the object instance as needed.  This method is
  safe to call multiple times.
*/
SC.rewatch = function(obj) {
  var m = meta(obj, false), chains = m.chains, bindings = m.bindings, key, b;

  // make sure the object has its own guid.
  if (GUID_KEY in obj && !obj.hasOwnProperty(GUID_KEY)) {
    SC.generateGuid(obj, 'sc');
  }  

  // make sure any chained watchers update.
  if (chains && chains._value !== obj) chainsFor(obj);

  // if the object has bindings then sync them..
  if (bindings && m.proto!==obj) {
    for (key in bindings) {
      b = !DEP_SKIP[key] && obj[key];
      if (b && b instanceof SC.Binding) b.fromDidChange(obj);
    }
  }

  return this;
};

// ..........................................................
// PROPERTY CHANGES
// 

/**
  This function is called just before an object property is about to change.
  It will notify any before observers and prepare caches among other things.
  
  Normally you will not need to call this method directly but if for some
  reason you can't directly watch a property you can invoke this method 
  manually along with `SC.propertyDidChange()` which you should call just 
  after the property value changes.
  
  @param {Object} obj
    The object with the property that will change
    
  @param {String} keyName
    The property key (or path) that will change.
    
  @returns {void}
*/
SC.propertyWillChange = function(obj, keyName) {
  var m = meta(obj, false), proto = m.proto, desc = m.descs[keyName];
  if (proto === obj) return ;
  if (desc && desc.willChange) desc.willChange(obj, keyName);
  dependentKeysWillChange(obj, keyName);
  chainsWillChange(obj, keyName);
  SC.notifyBeforeObservers(obj, keyName);
};

/**
  This function is called just after an object property has changed.
  It will notify any observers and clear caches among other things.
  
  Normally you will not need to call this method directly but if for some
  reason you can't directly watch a property you can invoke this method 
  manually along with `SC.propertyWilLChange()` which you should call just 
  before the property value changes.
  
  @param {Object} obj
    The object with the property that will change
    
  @param {String} keyName
    The property key (or path) that will change.
    
  @returns {void}
*/
SC.propertyDidChange = function(obj, keyName) {
  var m = meta(obj, false), proto = m.proto, desc = m.descs[keyName];
  if (proto === obj) return ;
  if (desc && desc.didChange) desc.didChange(obj, keyName);
  dependentKeysDidChange(obj, keyName);
  chainsDidChange(obj, keyName);
  SC.notifyObservers(obj, keyName);
};

})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-metal/core');
require('sproutcore-metal/accessors');
require('sproutcore-metal/computed');
require('sproutcore-metal/properties');
require('sproutcore-metal/observer');
require('sproutcore-metal/utils');
require('sproutcore-metal/array');

var Mixin, MixinDelegate, REQUIRED, Alias;
var classToString, superClassString;

var a_map = Array.prototype.map;
var EMPTY_META = {}; // dummy for non-writable meta
var META_SKIP = { __scproto__: true, __sc_count__: true };

var o_create = SC.platform.create;

function meta(obj, writable) {
  var m = SC.meta(obj, writable!==false), ret = m.mixins;
  if (writable===false) return ret || EMPTY_META;
  
  if (!ret) {
    ret = m.mixins = { __scproto__: obj };
  } else if (ret.__scproto__ !== obj) {
    ret = m.mixins = o_create(ret);
    ret.__scproto__ = obj;
  }
  return ret;
}

function initMixin(mixin, args) {
  if (args && args.length > 0) {
    mixin.mixins = a_map.call(args, function(x) {
      if (x instanceof Mixin) return x;
      
      // Note: Manually setup a primitive mixin here.  This is the only 
      // way to actually get a primitive mixin.  This way normal creation
      // of mixins will give you combined mixins...
      var mixin = new Mixin();
      mixin.properties = x;
      return mixin;
    });
  }
  return mixin;
} 

var NATIVES = [Boolean, Object, Number, Array, Date, String];
function isMethod(obj) {
  if ('function' !== typeof obj || obj.isMethod===false) return false;
  return NATIVES.indexOf(obj)<0;
}

function mergeMixins(mixins, m, descs, values, base) {
  var len = mixins.length, idx, mixin, guid, props, value, key, ovalue, concats;
  
  function removeKeys(keyName) {
    delete descs[keyName];
    delete values[keyName];
  }
  
  for(idx=0;idx<len;idx++) {
    
    mixin = mixins[idx];
    if (!mixin) throw new Error('Null value found in SC.mixin()');

    if (mixin instanceof Mixin) {
      guid = SC.guidFor(mixin);
      if (m[guid]) continue;
      m[guid] = mixin;
      props = mixin.properties; 
    } else {
      props = mixin; // apply anonymous mixin properties
    }

    if (props) {
      
      // reset before adding each new mixin to pickup concats from previous
      concats = values.concatenatedProperties || base.concatenatedProperties;
      if (props.concatenatedProperties) {
        concats = concats ? concats.concat(props.concatenatedProperties) : props.concatenatedProperties;
      }

      for (key in props) {
        if (!props.hasOwnProperty(key)) continue;
        value = props[key];
        if (value instanceof SC.Descriptor) {
          if (value === REQUIRED && descs[key]) { continue; }

          descs[key]  = value;
          values[key] = undefined;
        } else {
          
          // impl super if needed...
          if (isMethod(value)) {
            ovalue = (descs[key] === SC.SIMPLE_PROPERTY) && values[key];
            if (!ovalue) ovalue = base[key];
            if ('function' !== typeof ovalue) ovalue = null;
            if (ovalue) {
              var o = value.__sc_observes__, ob = value.__sc_observesBefore__; 
              value = SC.wrap(value, ovalue);
              value.__sc_observes__ = o;
              value.__sc_observesBefore__ = ob;
            }
          } else if ((concats && concats.indexOf(key)>=0) || key === 'concatenatedProperties') {
            var baseValue = values[key] || base[key];
            value = baseValue ? baseValue.concat(value) : SC.makeArray(value);
          }
          
          descs[key]  = SC.SIMPLE_PROPERTY;
          values[key] = value;
        }
      }

      // manually copy toString() because some JS engines do not enumerate it
      if (props.hasOwnProperty('toString')) {
        base.toString = props.toString;
      }
      
    } else if (mixin.mixins) {
      mergeMixins(mixin.mixins, m, descs, values, base);
      if (mixin._without) mixin._without.forEach(removeKeys);
    }
  }
}

var defineProperty = SC.defineProperty;

function writableReq(obj) {
  var m = SC.meta(obj), req = m.required;
  if (!req || (req.__scproto__ !== obj)) {
    req = m.required = req ? o_create(req) : { __sc_count__: 0 };
    req.__scproto__ = obj;
  }
  return req;
}

function getObserverPaths(value) {
  return ('function' === typeof value) && value.__sc_observes__;
}

function getBeforeObserverPaths(value) {
  return ('function' === typeof value) && value.__sc_observesBefore__;
}

SC._mixinBindings = function(obj, key, value, m) {
  return value;
};

function applyMixin(obj, mixins, partial) {
  var descs = {}, values = {}, m = SC.meta(obj), req = m.required;
  var key, willApply, didApply, value, desc;
  
  var mixinBindings = SC._mixinBindings;
  
  mergeMixins(mixins, meta(obj), descs, values, obj);

  if (MixinDelegate.detect(obj)) {
    willApply = values.willApplyProperty || obj.willApplyProperty;
    didApply  = values.didApplyProperty || obj.didApplyProperty;
  }

  for(key in descs) {
    if (!descs.hasOwnProperty(key)) continue;
    
    desc = descs[key];
    value = values[key];
     
    if (desc === REQUIRED) {
      if (!(key in obj)) {
        if (!partial) throw new Error('Required property not defined: '+key);
        
        // for partial applies add to hash of required keys
        req = writableReq(obj);
        req.__sc_count__++;
        req[key] = true;
      }
      
    } else {
      
      while (desc instanceof Alias) {
        
        var altKey = desc.methodName; 
        if (descs[altKey]) {
          value = values[altKey];
          desc  = descs[altKey];
        } else if (m.descs[altKey]) {
          desc  = m.descs[altKey];
          value = desc.val(obj, altKey);
        } else {
          value = obj[altKey];
          desc  = SC.SIMPLE_PROPERTY;
        }
      }
      
      if (willApply) willApply.call(obj, key);
      
      var observerPaths = getObserverPaths(value),
          curObserverPaths = observerPaths && getObserverPaths(obj[key]),
          beforeObserverPaths = getBeforeObserverPaths(value),
          curBeforeObserverPaths = beforeObserverPaths && getBeforeObserverPaths(obj[key]),
          len, idx;
          
      if (curObserverPaths) {
        len = curObserverPaths.length;
        for(idx=0;idx<len;idx++) {
          SC.removeObserver(obj, curObserverPaths[idx], null, key);
        }
      }

      if (curBeforeObserverPaths) {
        len = curBeforeObserverPaths.length;
        for(idx=0;idx<len;idx++) {
          SC.removeBeforeObserver(obj, curBeforeObserverPaths[idx], null,key);
        }
      }

      // TODO: less hacky way for sproutcore-runtime to add bindings.
      value = mixinBindings(obj, key, value, m);
      
      defineProperty(obj, key, desc, value);
      
      if (observerPaths) {
        len = observerPaths.length;
        for(idx=0;idx<len;idx++) {
          SC.addObserver(obj, observerPaths[idx], null, key);
        }
      }

      if (beforeObserverPaths) {
        len = beforeObserverPaths.length;
        for(idx=0;idx<len;idx++) {
          SC.addBeforeObserver(obj, beforeObserverPaths[idx], null, key);
        }
      }
      
      if (req && req[key]) {
        req = writableReq(obj);
        req.__sc_count__--;
        req[key] = false;
      }

      if (didApply) didApply.call(obj, key);

    }
  }
  
  // Make sure no required attrs remain
  if (!partial && req && req.__sc_count__>0) {
    var keys = [];
    for(key in req) {
      if (META_SKIP[key]) continue;
      keys.push(key);
    }
    throw new Error('Required properties not defined: '+keys.join(','));
  }
  return obj;
}

SC.mixin = function(obj) {
  var args = Array.prototype.slice.call(arguments, 1);
  return applyMixin(obj, args, false);
};


Mixin = function() { return initMixin(this, arguments); };

Mixin._apply = applyMixin;

Mixin.applyPartial = function(obj) {
  var args = Array.prototype.slice.call(arguments, 1);
  return applyMixin(obj, args, true);
};

Mixin.create = function() {
  classToString.processed = false;
  var M = this;
  return initMixin(new M(), arguments);
};

Mixin.prototype.reopen = function() {
  
  var mixin, tmp;
  
  if (this.properties) {
    mixin = Mixin.create();
    mixin.properties = this.properties;
    delete this.properties;
    this.mixins = [mixin];
  }
  
  var len = arguments.length, mixins = this.mixins, idx;

  for(idx=0;idx<len;idx++) {
    mixin = arguments[idx];
    if (mixin instanceof Mixin) {
      mixins.push(mixin);
    } else {
      tmp = Mixin.create();
      tmp.properties = mixin;
      mixins.push(tmp);
    }
  }
  
  return this;
};

var TMP_ARRAY = [];
Mixin.prototype.apply = function(obj) {
  TMP_ARRAY.length=0;
  TMP_ARRAY[0] = this;
  return applyMixin(obj, TMP_ARRAY, false);
};

Mixin.prototype.applyPartial = function(obj) {
  TMP_ARRAY.length=0;
  TMP_ARRAY[0] = this;
  return applyMixin(obj, TMP_ARRAY, true);
};

function _detect(curMixin, targetMixin, seen) {
  var guid = SC.guidFor(curMixin);

  if (seen[guid]) return false;
  seen[guid] = true;
  
  if (curMixin === targetMixin) return true;
  var mixins = curMixin.mixins, loc = mixins ? mixins.length : 0;
  while(--loc >= 0) {
    if (_detect(mixins[loc], targetMixin, seen)) return true;
  }
  return false;
}

Mixin.prototype.detect = function(obj) {
  if (!obj) return false;
  if (obj instanceof Mixin) return _detect(obj, this, {});
  return !!meta(obj, false)[SC.guidFor(this)];
};

Mixin.prototype.without = function() {
  var ret = new Mixin(this);
  ret._without = Array.prototype.slice.call(arguments);
  return ret;
};

function _keys(ret, mixin, seen) {
  if (seen[SC.guidFor(mixin)]) return;
  seen[SC.guidFor(mixin)] = true;
  
  if (mixin.properties) {
    var props = mixin.properties;
    for(var key in props) {
      if (props.hasOwnProperty(key)) ret[key] = true;
    }
  } else if (mixin.mixins) {
    mixin.mixins.forEach(function(x) { _keys(ret, x, seen); });
  }
}

Mixin.prototype.keys = function() {
  var keys = {}, seen = {}, ret = [];
  _keys(keys, this, seen);
  for(var key in keys) {
    if (keys.hasOwnProperty(key)) ret.push(key);
  }
  return ret;
};

/** @private - make Mixin's have nice displayNames */

var NAME_KEY = SC.GUID_KEY+'_name';

function processNames(paths, root, seen) {
  var idx = paths.length;
  for(var key in root) {
    if (!root.hasOwnProperty || !root.hasOwnProperty(key)) continue;
    var obj = root[key];
    paths[idx] = key;

    if (obj && obj.toString === classToString) {
      obj[NAME_KEY] = paths.join('.');
    } else if (key==='SC' || (SC.Namespace && obj instanceof SC.Namespace)) {
      if (seen[SC.guidFor(obj)]) continue;
      seen[SC.guidFor(obj)] = true;
      processNames(paths, obj, seen);
    }

  }
  paths.length = idx; // cut out last item
}

superClassString = function(mixin) {
  var superclass = mixin.superclass;
  if (superclass) {
    if (superclass[NAME_KEY]) { return superclass[NAME_KEY] }
    else { return superClassString(superclass); }
  } else {
    return;
  }
}

classToString = function() {
  if (!this[NAME_KEY] && !classToString.processed) {
    classToString.processed = true;
    processNames([], window, {});
  }

  if (this[NAME_KEY]) {
    return this[NAME_KEY];
  } else {
    var str = superClassString(this);
    if (str) {
      return "(subclass of " + str + ")";
    } else {
      return "(unknown mixin)";
    }
  }

  return this[NAME_KEY] || "(unknown mixin)";
};

Mixin.prototype.toString = classToString;

// returns the mixins currently applied to the specified object
// TODO: Make SC.mixin
Mixin.mixins = function(obj) {
  var ret = [], mixins = meta(obj, false), key, mixin;
  for(key in mixins) {
    if (META_SKIP[key]) continue;
    mixin = mixins[key];
    
    // skip primitive mixins since these are always anonymous
    if (!mixin.properties) ret.push(mixins[key]);
  }
  return ret;
};

REQUIRED = new SC.Descriptor();
REQUIRED.toString = function() { return '(Required Property)'; };

SC.required = function() {
  return REQUIRED;
};

Alias = function(methodName) {
  this.methodName = methodName;
};
Alias.prototype = new SC.Descriptor();

SC.alias = function(methodName) {
  return new Alias(methodName);
};

SC.Mixin = Mixin;

MixinDelegate = Mixin.create({

  willApplyProperty: SC.required(),
  didApplyProperty:  SC.required()
  
});

SC.MixinDelegate = MixinDelegate;


// ..........................................................
// OBSERVER HELPER
// 

SC.observer = function(func) {
  var paths = Array.prototype.slice.call(arguments, 1);
  func.__sc_observes__ = paths;
  return func;
};

SC.beforeObserver = function(func) {
  var paths = Array.prototype.slice.call(arguments, 1);
  func.__sc_observesBefore__ = paths;
  return func;
};







})({});


(function(exports) {
// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-metal/core');
require('sproutcore-metal/platform');
require('sproutcore-metal/utils');
require('sproutcore-metal/accessors');
require('sproutcore-metal/properties');
require('sproutcore-metal/computed');
require('sproutcore-metal/watching');
require('sproutcore-metal/events');
require('sproutcore-metal/observer');
require('sproutcore-metal/mixin');

})({});
