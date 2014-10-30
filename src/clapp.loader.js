/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, window, document, Promise */
var declare, request;
(function (document, Promise) {
  "use strict";

  /* ====================================================================== */
  /*                                LOADER                                  */
  /* ====================================================================== */

  /**
   * =========================================================================
   *                Core module that manages loading of other modules
   * =========================================================================
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
    "queue_dict": {},

    /**
     * Working list of modules that need to be shimmed, because they don't
     * support clappjs request/declare syntax (= all 3rd party plugins)
     */
    "shim_list": [],

    /**
     * Working list of dependencies that cannot be associated with a module
     * that requires/defines them. List will be empties onload with all
     * dependencies on the list "going" to the module triggering onload
     */
    "untraced_list": []
  };

  /**
   * Reverse an array: ["name", [], function ()] -> [function (), [], "name"]
   * @method  revert
   * @param   {Array} my_array Array to reverse
   * @return  {Array} reversed array
   */
  function revert(my_array) {
    var left, right, len, temporary_store;

    left = null;
    right = null;
    len = my_array.length;

    for (left = 0, right = len - 1; left < right; left += 1, right -= 1) {
      temporary_store = my_array[left];
      my_array[left] = my_array[right];
      my_array[right] = temporary_store;
    }
    return my_array;
  }

  /**
   * Return a module by name. Will only be called once module is available
   * @method  returnModule
   * @param   {String}  my_name    Module to return
   * @return  {Object}  module
   */
  function returnModule(my_name) {
    var index, list;

    // clean up shim_list
    list = clappjs.shim_list;
    index = list.indexOf(my_name);

    if (index > -1) {
      list.splice(index, 1);
    }

    return {
      "name": my_name,
      "callback": Promise.resolve(
        clappjs.callback_dict[my_name] ||
          window[my_name] ||
            window[my_name.toUpperCase()] ||
              window.module.exports
      )
    };
  }

  /**
   * Shim around "require". Catches require calls, stores them on untraced
   * list and associated them with the next module calling onload. Should
   * work because require calls from inside 3rd party plugins are made when
   * a loaded file is parsed and onload triggers when parsing is done.
   * @method  shimRequire
   * @param   {Array}  Arguments
   * @returns {Array}  arguments
   */
  function shimRequire() {
    var sync, callback, i, len, module_list, args;

    args = arguments;
    sync = clappjs.sync_require;

    // Nothing to shim, call regular require without doing anything
    if (sync && clappjs.shim_list.length === 0) {
      return sync.apply(null, args);
    }

    // always convert to array
    function mangleArguments(my_name) {
      if (typeof my_name === "string") {
        return [my_name];
      }
      return my_name;
    }

    module_list = mangleArguments(args[0]);
    callback = args[1];

    // Stack and wait for onload to resolve the untraced_list
    // TODO: bad handling of single callback being stored on all deps
    for (i = 0, len = module_list.length; i < len; i += 1) {
      clappjs.untraced_list.push({
        "name": module_list[i],
        "callback": callback
      });
    }
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
    var sync, args, list, name, deps, callback, i, len;

    // NOTE: here, name will be the first argument (string, array or method)
    args = arguments;
    name = args[0];
    list = clappjs.shim_list;
    sync = clappjs.sync_define;

    // same logic as shimRequire, exist with normal define, if nothing to do
    if (sync && (list.length === 0 || list.indexOf(name) > -1)) {
      return clappjs.sync_define.apply(null, args);
    }

    // WARNING: Before reverting arguments, original define must be called!
    args = revert(args);
    name = args[2];
    callback = args[0];
    deps = args[1] || [];

    // handle through untraced_list to associate dependencies with module
    // triggering onloadlike
    for (i = 0, len = deps.length; i < len; i += 1) {
      clappjs.untraced_list.push({"name": deps[i], "callback": callback});
    }
  }

  /**
   * Digest module definition in case it is provided and allow loading regular
   * modules through declare/request without breaking loaders such as require
   * @method    digestModuleSpec
   * @param     {String/Object} spec  Module (spec) to load
   * @return    {String}    module name
   */
  function digestModuleSpec(conf) {
    var name;

    if (typeof conf === "string") {
      return conf;
    }

    if (clappjs.shimmed === undefined) {
      clappjs.shimmed = true;
      if (window.require) {
        clappjs.sync_require = window.require;
      }
      if (window.define) {
        clappjs.sync_define = window.define;
      }
      window.require = shimRequire;
      window.define = shimDefine;

      // jQuery wants this
      window.define.amd = window.define.amd || {};

      // fake exports
      window.module = {"exports": {}};
      window.exports = window.module.exports;
    }

    name = conf.name;
    clappjs.path_dict[name] = conf.src || null;

    if (conf.shim) {
      clappjs.shim_list.push(name);
    }

    return name;
  }

  /**
   * Establish a loading order based on an array of passed modules to load,
   * testing for dependencies recursively and generating bundles of files
   * to load
   * TODO: too complicated. Drop! If dependencies are not specified, works?
   * @method  setLoadingOrder
   * @param   {Array}   module_list   List of modules to list
   * @param   {Array}   bundle_list   Response being assembled
   * @returns {Array}   finished bundle_list
   */
  function setLoadingOrder(module_list, bundle_list) {
    var len, dependency_list, i, base, name, current, next;

    bundle_list = bundle_list || [];

    for (i = 0, len = module_list.length; i < len; i += 1) {

      // pass a level counter through the recursive call
      bundle_list[0] = bundle_list[0] || {"level": 0};
      base = bundle_list[0];
      current = base.level;
      next = current + 1;
      name = digestModuleSpec(module_list[i]);
      dependency_list = clappjs.dependency_dict[name];

      // no dependency, add module to first bundle (on position 2)
      if (!dependency_list) {
        bundle_list[1] = bundle_list[1] || [];
        bundle_list[1].push(name);
      } else {
        // dependencies > call setLoading Order on dependencies
        bundle_list[0].level += 1;
        bundle_list = setLoadingOrder(dependency_list, bundle_list);

        bundle_list[next] = bundle_list[next] || [];
        bundle_list[next].push(name);
      }

      // remove level object from array, since we are done
      if (i === len - 1 && base.level === 0) {
        bundle_list.shift();
      }
    }

    return bundle_list;
  }


  /**
   * Associate shimmed subdepencies with the latest module triggering
   * onload to try and have some logic for handling require calls made from
   * a 3rd party shimmed plugin
   * @method    solvePendingSubdependencies
   * @param     {String}    my_name   Module triggering onload
   * @returns   {Promise}   A promise
   */
  function solvePendingSubdependencies(my_name) {
    var i, len, trace, path, request_list, callback, origin, base, config;

    base = clappjs.path_dict[my_name];
    clappjs.dependency_dict[my_name] = clappjs.dependency_dict[my_name] || [];

    if (clappjs.shim_list.indexOf(my_name) > -1 && base !== null) {
      request_list = [];
      path = base.split('/').slice(0, -1).join('/');

      for (i = 0, len = clappjs.untraced_list.length; i < len; i += 1) {

        // NOTE: callback not handled well, find better way to store once!
        trace = clappjs.untraced_list[i];
        callback = trace.callback;
        origin = trace.name.split('./');
        config = {
          "name": trace.name,
          "shim": true,
          "src": path + '/' + (origin[1] || origin[0]).split('.js')[0] + '.js'
        };
        request_list.push(config);
        clappjs.dependency_dict[my_name].push(config);
      }

      // clear the list
      clappjs.untraced_list = [];

      if (clappjs.callback_dict[my_name] || callback === undefined) {
        return request(request_list);
      }
      declare(my_name, request_list, callback);
    }
    return Promise.resolve();
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
          return solvePendingSubdependencies(name)
            .then(function () {
              return resolve(returnModule(name));
            });
        };
        element.onerror = function (e) {
          reject(e);
        };
      });

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
    var i, len, promise_list, mod, is_on_lib, batch, path, el, is_on_queue,
      is_on_window;

    promise_list = [];
    batch = document.createDocumentFragment();
    window.module = window.module || {};

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
        path =  clappjs.path_dict[mod] || "js/" + mod + ".js";

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

  /**
   * "Declare" a module to the dependency_dict (clappjs "define")
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

      return resolver(return_value);
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
    clappjs.callback_dict[name] = clappjs.callback_dict[name] ||
      new Promise(function (resolve, reject) {
        resolver = resolve;

        if (dependency_list.length === 0) {
          resolve(callback.apply(window));
        }

        return request(dependency_list)
          .then(digestDependencyArray)
          .then(resolveDependencyArray)
          .caught(function (my_error) {
            reject(my_error);
          });
      });
  };

  /**
   * "Request" a module for immideate use (clappjs "require")
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