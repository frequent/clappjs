/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, window, document, RSVP */
var declare, request;
(function (document, RSVP) {
  "use strict";

  /* ====================================================================== */
  /*                                CLAPPJS                                 */
  /* ====================================================================== */

  /**
   * Internal "global" - kept off global namespace
   * @global  clappjs
   */
  var clappjs = {

    /**
      * Queue preventing multiple loads in same queue
      * @property  {Object}  queue_dict
      */
    "queue_dict": {},

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
    "dependency_dict": {}
  };

  /**
   * Return a module by name. Will only be called once module is available
   * @method  returnModule
   * @param   {String}  name    Module to return
   * @return  {Object}  module
   */
  function returnModule(name) {
    return {
      "name": name,
      "callback": clappjs.callback_dict[name]
    };
  }

  /**
   * Digest module definition in case it is provided
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

    return name;
  }

  /**
   * Establish a loading order based on an array of passed modules to load,
   * testing for dependencies recursively and generating bundles of files
   * to load, for example:
   * ["localStorage"] > returns ["rsvp", "sha256"], ["jio"], ["localStorage"]
   * Note: if dependencies are not stored anywhere upfront this won't work!
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

    resolver = new RSVP.Promise(function (resolve, reject) {
      element.onload = function () {
        clappjs.queue_dict[name] = null;
        resolve(returnModule(name));
      };
      element.onerror = function (e) {
        reject(e);
      };
    });

    // module is already in the load-queue - wait for onload return callback
    if (clappjs.queue_dict.hasOwnProperty(name)) {
      return resolver
        .then(function () {
          return returnModule(name);
        })
        .fail(console.log);
    }

    // flag as being queued with resolver so it's available elsewhere!
    clappjs.queue_dict[name] = resolver;

    return resolver;
  }

  /**
   * Request a bundle of files by tucking them onto the doc head and waiting
   * for them to load and run (eg ["foo", "bar", "baz"])
   * @method  requestBundle
   * @param   {Array}   bundle  Bundle to load
   * @returns {Promise} Promise (Loaded files)
   */
  function requestBundle(bundle) {
    var i, len, promise_list, mod, is_on_lib, batch, path, el, is_on_queue;

    promise_list = [];
    batch = document.createDocumentFragment();

    // resolve a loaded dependency
    function passOutResolve(module, resolver) {
      return resolver
        .then(function () {
          return returnModule(module);
        })
        .fail(console.log);
    }

    for (i = 0, len = bundle.length; i < len; i += 1) {
      mod = bundle[i];
      is_on_queue = clappjs.queue_dict[mod];
      is_on_lib = clappjs.callback_dict[mod];

      if (is_on_lib) {
        promise_list[i] = returnModule(mod);
      } else if (is_on_queue) {
        promise_list[i] = passOutResolve(mod, is_on_queue);
      } else {
        path =  clappjs.path_dict[mod] || "js/" + mod + ".js";

        // humhum...
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
          el.type = "text/javascript";
          el.src = path;
          break;
        }
        // add to fragment
        batch.appendChild(el);

        // add listener
        promise_list[i] = declareModule(mod, el);
      }
    }

    // WARNING: batched, but DOM access > will allow listeners to trigger
    if (batch.firstElementChild || batch.firstChild) {
      document.head.appendChild(batch);
    }

    // return arguments instead of array? - http://bit.ly/1q9GltY
    return RSVP.all(promise_list)
      .then(function (response_list) {
        return response_list;
      })
      .fail(console.log);
  }

  /* ====================================================================== */
  /*                         Internal Module Loader                         */
  /* ====================================================================== */

  /**
   * ======================================================================
   * NOTE: We are using "request/declare" instead of "require/define" to have
   * a promised-based modular loader inside the application independent of
   * loaders like requireJS. Also, by not declaring "require" and "define"
   * we will purposely fail all AMD/CommonJS compat tests, so other plugins
   * are available the normal way.
   * ======================================================================
   */

  /**
   * "Declare" a module for the in-memory lib (similar to requirejs "define")
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
      return RSVP.all(response_array);
    }

    // resolve request promise returning an array of requested modules
    function resolveDependencyArray(my_fullfillment_array) {
      resolver(callback(my_fullfillment_array));
    }

    // set callback to (resolved callback or new promise
    clappjs.callback_dict[name] = clappjs.callback_dict[name] ||
      new RSVP.Promise(function (resolve) {
        resolver = resolve;
        if (dependency_list.length === 0) {
          return resolve(callback());
        }
        return request(dependency_list)
          .then(digestDependencyArray)
          .then(resolveDependencyArray);
      });
  };

  /**
   * "Request" a module for immideate use (mimics "require")
   *
   *      request(["foo", "bar"]).then(function(module_array) {});
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

      return RSVP.all(promise_index);
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
    // are resolved = dependencies of callbacks are also loaded
    function returnArray(my_return_array) {
      return RSVP.all(my_return_array);
    }

    // create loading order of bundles [["a", "b"], [.. loaded together
    return requestBundleList(setLoadingOrder(module_list))
      .then(assembleReturnArray)
      .then(returnArray);
  };

}(document, RSVP));