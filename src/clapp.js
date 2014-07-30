/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, window, document, Promise */
var declare, request;
(function (document, Promise) {
  "use strict";

  /* ====================================================================== */
  /*                                CLAPPJS                                 */
  /* ====================================================================== */

  /**
   * Internal "globals"
   * @global  clappjs
   */
  var clappjs = {

    /**
      * Object containing named(!) module callback methods. If a module is
      * declared as "foo" and has a callback (return) object/method, the
      * callback will be accessible through this object.
      * @property  {Object}  callback_dict
      */
    "callback_dict": {},

    /**
      * Dict containing module paths
      * @property  {Object}  path_dict
      */
    "path_dict": {},

    /**
      * Dict containing modules dependencies
      * @property  {Object}  dependency_dict
      */
    "dependency_dict": {},

    /**
      * Temporary queue preventing multiple loads in same batch
      * @property  {Object}  queue_dict
      */
    "queue_dict": {}

  };

  /**
   * Revert an array: "name", [], function () -> function (), [], "name"
   * @method  revert
   * @param   {Array} arr Array to reverse
   * @return  {Array} reversed array
   */
  function revert(array) {
    var left, right, len, temp;

    left = null;
    right = null;
    len = array.length;

    for (left = 0, right = len - 1; left < right; left += 1, right -= 1) {
      temp = array[left];
      array[left] = array[right];
      array[right] = temp;
    }
    return array;
  }

  /**
   * Return a module by name. Will only be called once module is available
   * @method  returnModule
   * @param   {String}  name    Module to return
   * @return  {Object}  module
   */
  function returnModule(name) {
    var index, list, shim;

    // clean up shim_list
    list = clappjs.shim_list || [];
    index = list.indexOf(name);
    shim = window[name] || window[name.toUpperCase()] || window.module.exports;

    if (index > -1) {
      clappjs.shim_list.splice(index, 1);
    }

    return {
      "name": name,
      "callback": clappjs.callback_dict[name] || shim
    };
  }

  /**
   * Called as a wrapper around define in case a 3rd party plugin returns a
   * define call. This allows to wrap scripts not using request/declare into
   * clappjs.
   * @method  shimDefine
   * @param   {Array}  Arguments
   * @returns {Array}  arguments
   */
  function shimDefine() {
    var args, list, sync, name, index, deps, named;

    // add this module to clappjs internal structure
    function shimDeclare(my_name, my_index) {
      clappjs.shim_list.splice(my_index, 1);
      clappjs.named_module_list.splice(my_index, 1);
      clappjs.dependency_dict[my_name] = args[1] || null;
      declare(my_name, deps, args[0]);
    }

    // shim-module which tries to load it's dependencies must also be shimmed
    function shimDependencies(my_element) {
      return {
        "name": my_element,
        "shim": true
      };
    }

    // check whether a shim_list(ed) module is on the loading queue.If so,
    // it should not be regarded when evaluating whether to pass a call
    // through to the original define.
    function testWhetherNamed(my_counter, my_module) {
      if (clappjs.named_module_list.indexOf(my_module) > -1 &&
          name !== my_module) {
        my_counter += 1;
      }
      return my_counter;
    }

    // WARNING: IE8 indexOf/map/reduce - http://bit.ly/1mgMCUy
    args = revert(arguments);
    name = args[2];
    list = clappjs.shim_list;
    sync = window.sync_define;
    deps = args[1].map(shimDependencies);
    index = list.indexOf(name);
    named = list.reduce(testWhetherNamed, 0);

    // try to catch direct calls from requirejs. Make sure the list of shim
    // calls is empty or does not contain any named moduled. This is still
    // unreliable

    // return out
    if (sync && list.length - named === 0) {
      return sync(arguments);
    }

    // named modules, easy to solve
    if (index > -1 && name) {
      shimDeclare(name, index);
    }

    // single anonymous dependency can be solved, too
    if (!name && list.length === 1) {
      shimDeclare(list[0], 0);
    }
  }

  /**
   * Digest module definition in case it is provided and allow loading regular
   * modules through declare/request without breaking loaders such as require
   * @method  digestModuleSpec
   * @param   {String/Object} spec  Module (spec) to load
   * @return  {String}    module name
   */
  function digestModuleSpec(conf) {
    var name;

    if (typeof conf === "string") {
      return conf;
    }

    name = conf.name;

    clappjs.path_dict[name] = conf.src || null;
    clappjs.dependency_dict[name] = conf.dependencies || null;

    // compatablity sigh...
    if (conf.shim) {
      if (!clappjs.shim_list) {
        clappjs.shim_list = [];
        clappjs.named_module_list = [];
        if (window.define) {
          window.sync_define = window.define;
        }
        window.define = shimDefine;
        window.module = {"exports": {}};
        window.exports = window.module.exports;
        window.define.amd = window.define.amd || {};
      }
      clappjs.shim_list.push(name);

      // non-anonymous modules need to be labelled to not count against
      // shim_list
      if (conf.named) {
        clappjs.named_module_list.push(name);
      }
    }

    return name;
  }

  /**
   * Establish a loading order based on an array of passed modules to load,
   * testing for dependencies recursively and generating bundles of files
   * to load, for example:
   * ["localStorage"] > returns ["rsvp", "sha256"], ["jio"], ["localStorage"]
   * NOTE: remove? - if dependencies are not stored upfront this won't work!
   * @method  setLoadingOrder
   * @param   {Array}   module_list   List of modules to list
   * @param   {Array}   bundle_list   Response being assembled
   * @returns {Array}   finished bundle_list
   */
  function setLoadingOrder(module_list, bundle_list) {
    var mod, len, dependency_list, i, position, base, name;

    bundle_list = bundle_list || [];

    for (i = 0, len = module_list.length; i < len; i += 1) {
      bundle_list[0] = bundle_list[0] || {"recursion": 0};
      base = bundle_list[0];
      mod = module_list[i];
      name = digestModuleSpec(mod);
      dependency_list = clappjs.dependency_dict[name];

      // no dependency, time to push
      if (!dependency_list) {
        bundle_list[1] = bundle_list[1] || [];
        bundle_list[1].push(name);
        base.lowest = base.recursion;
      } else {

        // dependencies > recurse over dependencies
        base.recursion += 1;
        bundle_list = setLoadingOrder(dependency_list, bundle_list);
        base.recursion -= 1;
        position = (base.lowest - base.recursion) + 1;
        bundle_list[position] = bundle_list[position] || [];
        bundle_list[position].push(name);
      }

      // remove recursion/lowest object from array, since we are done
      if (i === len - 1 && base.recursion === 0) {
        bundle_list.shift();
      }
    }

    return bundle_list;
  }

  /**
   * Declare a module from requestBundle = handle onload
   * Thx: RenderJS - http://git.erp5.org/gitweb/renderjs.git/
   * @method  declareModule
   * @param   {String}  name  Module name
   * @param   {String}  path  Module path
   * @returns {Promise}
   */
  function declareModule(name, element) {
    var resolver;

    // set on queue to prevent multiple calls in same batch
    resolver = clappjs.queue_dict[name] = clappjs.queue_dict[name] ||
      new Promise(function (resolve, reject) {
        element.onload = function () {
          delete clappjs.queue_dict[name];
          resolve(returnModule(name));
        };
        element.onerror = function (e) {
          reject(e);
        };
      });

    return resolver;
  }

  /**
   * To have another path fallback, try to see whether a module is a
   * dependency of another module and try to load from the same location
   * @method  trace
   * @param   {String}  name  Module name to search
   * @returns {Boolean/undefined} Name of parent module
   */
  function trace(name) {
    var dep, dict, module, i, len, sub, path;

    dict = clappjs.dependency_dict;

    for (dep in dict) {
      if (dict.hasOwnProperty(dep)) {
        module = dict[dep];
        if (module) {
          for (i = 0, len = module.length; i < len; i += 1) {
            sub = module[i];
            if (name === sub.name) {
              path = clappjs.path_dict[dep];

              if (path) {
                return path.substring(0, path.lastIndexOf("/")) +
                    "/" + name + ".js";
              }
            }
          }
        }
      }
    }
  }

  /**
   * Request a bundle of files by tucking them onto the doc head and waiting
   * for them to load and run (eg ["foo", "bar", "baz"])
   * @method  requestBundle
   * @param   {Array}   bundle  Bundle to load
   * @returns {Promise} Promise (Loaded files)
   */
  function requestBundle(bundle) {
    var i, len, promise_list, mod, is_on_lib, batch, path, el, is_on_queue,
      is_on_window;

    promise_list = [];
    batch = document.createDocumentFragment();

    // resolve a loaded dependency
    function passOutResolve(my_module, my_resolver) {
      return my_resolver
        .then(function () {
          return returnModule(my_module);
        });
    }

    for (i = 0, len = bundle.length; i < len; i += 1) {
      mod = bundle[i];

      is_on_window = window[mod.toUpperCase()] || window[mod] ||
          window.module[mod];
      is_on_queue = clappjs.queue_dict[mod];
      is_on_lib = clappjs.callback_dict[mod];

      if (is_on_window) {
        promise_list[i] = returnModule(mod);
      } else if (is_on_lib) {
        promise_list[i] = returnModule(mod);
      } else if (is_on_queue) {
        promise_list[i] = passOutResolve(mod, is_on_queue);
      } else {

        // punt for path...
        path =  clappjs.path_dict[mod] || trace(mod) || "js/" + mod + ".js";

        // humhum switch...
        switch (path.split(".").pop().split("?")[0]) {
        case "css":
          el = document.createElement("link");
          el.rel = "stylesheet";
          el.type = "text/css";
          el.charset = "utf-8";
          el.href = path;
          break;
        case "js":
          el = document.createElement("script");
          el.src = path;
          break;
        }

        // add to fragment
        batch.appendChild(el);

        // add listener
        promise_list[i] = declareModule(mod, el);
      }
    }

    // WARNING: DOM access
    if (batch.firstElementChild || batch.firstChild) {
      document.head.appendChild(batch);
    }

    // START: Assemble response_list
    return Promise.all(promise_list)
      .then(function (response_list) {
        return response_list;
      });
  }

  /* ====================================================================== */
  /*                         Internal Module Loader                         */
  /* ====================================================================== */

  /**
   * ======================================================================
   * NOTE: We are using "request/declare" instead of "require/define" to have
   * a promised-based modular loader inside the application independent of
   * loaders like requireJS. 
   * ======================================================================
   */

  /**
   * "Declare" a module to the dependency_dict (similar to requirejs "define")
   * Modules must be name-based!
   *
   * declare("[name]", [dependencies], function (dependencies) {
   *   return something;
   * });
   *
   * Thx: RSVP https://github.com/tildeio/rsvp.js
   * Thx: requireJS http://requirejs.org
   * @method  declare
   * @param   {String} name             Module name
   * @param   {Array}  dependency_list  List of dependencies
   * @param   {Method} callback         Callback returning module
   */
  declare = function (name, dependency_list, callback) {
    var resolver;

    // remember for setLoadingOrder
    if (dependency_list.length > 0) {
      clappjs.dependency_dict[name] = dependency_list;
    }

    // digest promises returned for each module
    function digestDependencyArray(my_dependency_array) {
      var i, len, response_array;

      len = my_dependency_array.length;
      for (i = 0, response_array = []; i < len; i += 1) {
        response_array[i] = my_dependency_array[i];
      }

      return Promise.all(response_array);
    }

    // resolve request promise returning individual parameters (vs an array)
    function resolveDependencyArray(my_fullfillment_array) {
      var return_value = callback.apply(window, my_fullfillment_array);

      // window.exports must be used when integrating commonjs modules
      // because window.exports will always be defined, it can only be used
      // if the callback returns undefined, eg. a third party plugin using
      // module.exports vs return foo
      if (!return_value) {
        return_value = window.exports;
      }

      resolver(return_value);
    }

    // START: set callback to (resolved callback or new promise
    // NOTE: Not sure this is the best way, because files are kept in cache
    //       AND memory. When caching is active, refresh of the page will
    //       load all modules from cache (OK). However, subsequent module
    //       requests on the initial page load will be served from
    //       callback_dict. Switching to cache would require to handle inline
    //       modules, manage addition of script tags (xyz.js can be <script>
    //       tag-ged multiple times) and handling of non-availability of cache
    //       (Chrome with self-signed SSL for example). So far, I prefer
    //       the callback_dict
    // NOTE: Question is how much penalty for re-parsing large modules (JQM)
    clappjs.callback_dict[name] = clappjs.callback_dict[name] ||
      new Promise(function (resolve) {
        resolver = resolve;
        if (dependency_list.length === 0) {
          return resolver(callback.apply(window));
        }

        // WARNING: missing a catch()
        return request(dependency_list)
          .then(digestDependencyArray)
          .then(resolveDependencyArray);
          //.catch(console.log);
      });
  };

  /**
   * "Request" a module for immideate use (mimics "require")
   *
   *      request(["foo", "bar"]).spread(function(foo, bar) {});
   *
   * @method  request
   * @param   {Array}   module_list List of modules to load
   */
  request = function (module_list) {

    // request built bundles
    function requestBundleList(my_loading_order) {
      var i, len, promise_index = [];

      for (i = 0, len = my_loading_order.length; i < len; i += 1) {
        promise_index[i] = requestBundle(my_loading_order[i]);
      }

      return Promise.all(promise_index);
    }

    // assemble return array by looping over requested modules, returned
    // bundles and modules inside each bundle to build a return_array
    function assembleReturnArray(my_bundles) {
      var i, j, k, module_len, bundle_len, len, module, bundle, loaded_module,
        name, return_array = [];

      // loop modules needed
      for (i = 0, module_len = module_list.length; i < module_len; i += 1) {
        module = module_list[i];
        name = module.name || module;

        // loop responses (normally only 1)
        for (j = 0, bundle_len = my_bundles.length; j < bundle_len; j += 1) {
          bundle = my_bundles[j];

          // loop individual bundle (contains modules) and assemble answer
          for (k = 0, len = bundle.length; k < len; k += 1) {
            loaded_module = bundle[k];
            if (name === loaded_module.name) {
              return_array.push(loaded_module.callback);
            }
          }
        }
      }

      return return_array;
    }

    // return list of requested modules
    // will wait until all bundles are loaded AND until all callbacks promises
    // are resolved = recursive dependencies of callbacks are also loaded
    function returnArray(my_return_array) {
      return Promise.all(my_return_array);
    }

    // START: create loading order of bundles [["a", "b"], [.. to load
    return requestBundleList(setLoadingOrder(module_list))
      .then(assembleReturnArray)
      .then(returnArray);
  };

}(document, Promise));