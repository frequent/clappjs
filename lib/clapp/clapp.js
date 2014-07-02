/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, window, document, RSVP */
var declare, request;
(function (document, RSVP) {
  "use strict";

  /* ====================================================================== */
  /*                           Application Object                           */
  /* ====================================================================== */

  /**
   * Internal application "global" - keep off global namespace
   * @global  clappjs
   */
  var clappjs = {

    /**
      * Queue preventing multiple loads in same queue
      * @property  {Object}  registration_queue_dict
      */
    "registration_queue_dict": {},

    /**
      * Object containing named(!) module callback methods. If a module is
      * declared as "foo" and has a callback (return) object/method, the
      * callback will be accessible through this object.
      * @property  {Object}  module_callback_dict
      */
    "module_callback_dict": {},

    /**
      * Dict containing module paths
      * @property  {Object}  module_path_dict
      */
    "module_path_dict": {},


    /**
      * Dict containing modules dependencies
      * @property  {Object}  module_dependency_dict
      */
    "module_dependency_dict": {}
  };

  /**
   * Establish a loading order based on an array of passed modules to load,
   * testing for dependencies recursively and generating bundles of files
   * to load, for example:
   * ["localStorage"] > returns ["rsvp", "sha256"], ["jio"], ["localStorage"]
   * Note: if dependencies are not stored anywhere upfront this won't work!
   * @caller  request
   * @method  setLoadingOrder
   * @param   {Array}   module_list   List of modules to list
   * @param   {Array}   bundle_list   Response being assembled
   * @returns {Array}   finished bundle_list
   */
  function setLoadingOrder(module_list, bundle_list) {
    var mod, mod_len, dependency_list, i, position, base, deps;

    deps = clappjs.module_dependency_dict;
    bundle_list = bundle_list || [];

    for (i = 0, mod_len = module_list.length; i < mod_len; i += 1) {
      bundle_list[0] = bundle_list[0] || {"recursion": 0};
      base = bundle_list[0];
      mod = module_list[i];

      // digest dependency objects
      dependency_list = deps[mod];

      // no dependency, time to push
      if (!dependency_list) {
        bundle_list[1] = bundle_list[1] || [];
        bundle_list[1].push(mod);
        base.lowest = base.recursion;
      } else {

        // dependencies > recurse over dependencies
        base.recursion += 1;
        bundle_list = setLoadingOrder(dependency_list, bundle_list);
        base.recursion -= 1;
        position = (base.lowest - base.recursion) + 1;
        bundle_list[position] = bundle_list[position] || [];
        bundle_list[position].push(mod);

      }
      // remove recursion/lowest object from array, since we are done
      if (i === mod_len - 1 && base.recursion === 0) {
        bundle_list.shift();
      }
    }
    return bundle_list;
  }

  /**
   * Declare a module from requestBundle = handle onload
   * Thx: RenderJS - http://git.erp5.org/gitweb/renderjs.git/
   * @caller  requestModule
   * @method  declareModule
   * @param   {String}  name  Module name
   * @param   {String}  path  Module path
   * @returns {Promise}
   */
  function declareModule(name, element) {
    var resolver;

    resolver = new RSVP.Promise(function (resolve, reject) {
      element.onload = function () {
        clappjs.registration_queue_dict[name] = null;
        resolve({
          "name": name,
          "callback": clappjs.module_callback_dict[name]
        });
      };
      element.onerror = function (e) {
        reject(e);
      };
    });

    // module is already in the load-queue - wait for onload return callback
    if (clappjs.registration_queue_dict.hasOwnProperty(name)) {
      return resolver.then(function () {
        return {
          "name": name,
          "callback": clappjs.module_callback_dict[name]
        };
      }).fail(console.log);
    }

    // flag as being queued with resolver so it's available elsewhere!
    clappjs.registration_queue_dict[name] = resolver;
    return resolver;
  }

  /**
   * Request a bundle of files by tucking them onto the doc head and waiting
   * for them to load and run (eg ["foo", "bar", "baz"])
   * @caller  request
   * @method  request_bundle
   * @param   {Array}   bundle  Bundle to load
   * @returns {Promise} Promise (Loaded files)
   */
  function requestBundle(bundle) {
    var i, len, promise_list, mod, is_on_lib, batch, path, el, is_on_queue;

    promise_list = [];
    batch = document.createDocumentFragment();

    function passOut(module) {
      return {
        "name": module,
        "callback": clappjs.module_callback_dict[module]
      };
    }

    function passOutResolve(module, resolver) {
      return resolver
        .then(function () {
          return passOut(module);
        })
        .fail(console.log);
    }

    for (i = 0, len = bundle.length; i < len; i += 1) {
      mod = bundle[i];
      is_on_queue = clappjs.registration_queue_dict[mod];
      is_on_lib = clappjs.module_callback_dict[mod];

      if (is_on_lib) {
        promise_list[i] = passOut(mod);
      } else if (is_on_queue) {
        promise_list[i] = passOutResolve(mod, is_on_queue);
      } else {
        path =  clappjs.module_path_dict[mod] || "js/" + mod + ".js";

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

    // return arguments instead of array - http://bit.ly/1q9GltY
    return RSVP.all(promise_list)
      .then(function (response_list) {
        // this will be the return_array!
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
   * "Request" a module for immideate use (mimics "require")
   *
   *      request(["foo", "bar"]).then(function(module_array) {});
   *
   * @method  request
   * @param   {Array}   module_list List of modules to load
   */
  request = function (module_list) {
    var return_array, promise_list;

    return_array = [];
    promise_list = [];

    // NOTE: generates dependency bundles and loops over bundles to build
    // the return_array which includes the requested modules (must be
    // defined by name to be requested by name(!))
    setLoadingOrder(module_list).forEach(function (el, index) {
      promise_list[index] = requestBundle(el)
        .then(function (bundle_response) {
          var i, j, mod_len, len, mod, loaded_mod;

          // try to find matches for return_array - keep order(!) by
          // looping over requested modules and passing back undefined
          // for external modules
          for (i = 0, mod_len = module_list.length; i < mod_len; i += 1) {
            mod = module_list[i];
            for (j = 0, len = bundle_response.length; j < len; j += 1) {
              loaded_mod = bundle_response[j];
              if (mod === loaded_mod.name) {
                return_array.push(loaded_mod.callback);
              }
            }
          }
        });
    });

    // wait until all bundles are loaded AND until all callbacks promises
    // are resolved, meaning that dependencies of callbacks are also loaded
    return RSVP.all(promise_list)
      .then(function () {
        return RSVP.all(return_array);
      });
  };

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

    // Keep dependencies for next call
    if (dependency_list.length > 0) {
      clappjs.module_dependency_dict[name] = dependency_list;
    }

    clappjs.module_callback_dict[name] =
      clappjs.module_callback_dict[name] ||
        new RSVP.Promise(function (resolve) {
        if (dependency_list.length === 0) {
          return resolve(callback());
        }
        return request(dependency_list)
          .then(function (dependency_array) {
            var i, len, response_array;

            len = dependency_array.length;
            if (len > 0) {
              for (i = 0, response_array = []; i < len; i += 1) {
                response_array[i] = dependency_array[i];
              }
              return RSVP.all(response_array).fail(console.log);
            }
          })
          .then(function (fullfilled_array) {
            resolve(callback(fullfilled_array));
          })
          .fail(console.log);
      })
      .fail(console.log);
  };

}(document, RSVP));