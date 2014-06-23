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

//   /**
//    * Retrieve path specified on <script> tags.
//    * Thx RequireJS - http://requirejs.org
//    * @caller  main entry point
//    * @method  fetchScriptPath
//    * @param   {String}  attr  Attribute to find
//    * @returns {String}  path
//    */
//   function fetchScriptPath(attr) {
//     var i, path, script_list, len;
// 
//     // WARNING: DOM Access
//     script_list = document.getElementsByTagName("script");
// 
//     for (i = 0, len = script_list.length; i < len; i += 1) {
//       path = script_list[i].getAttribute(attr);
//       if (path) {
//         return path;
//       }
//     }
//     return undefined;
//   }

  /**
   * Digest a dependency object and nested dependencies and return a string
   * @method digestDependency
   * @param   {Object/String} value   Dependeny to digest
   * @return  {String} name of digested dependency
   */
  function digestDependency(value) {
    var i, dep_len, dep_list;

    if (typeof value === "string") {
      return value;
    }

    clappjs.module_path_dict[value.name] = value.src;
    dep_list = value.dependency_list || [];

    // recurse over sub dependencies
    for (i = 0, dep_len = dep_list.length; i < dep_len; i += 1) {
      digestDependency(dep_list[i]);
    }
    return value.name;
  }

  /**
   * Establish a loading order based on an array of passed modules to load,
   * testing for dependencies recursively and generating bundles of files
   * to load, for example:
   * ["localStorage"] > returns ["rsvp", "sha256"], ["jio"], ["localStorage"]
   * @caller  request
   * @method  setLoadingOrderitem
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
      dependency_list = deps[digestDependency(mod)];

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
   * Load a module!
   * Thx: RenderJS - http://git.erp5.org/gitweb/renderjs.git/
   * @caller  requestModule
   * @method  declareModule
   * @param   {String}  name  Module name
   * @param   {String}  path  Module path
   * @returns {Promise}
   */
  function declareModule(name, element) {

    // don't request the same file multiple times
    if (clappjs.registration_queue_dict.hasOwnProperty(name)) {
      return {
        "name": name,
        "callback": undefined
      };
    }

    // flag as being queued
    clappjs.registration_queue_dict[name] = true;

    return new RSVP.Promise(function (resolve, reject) {
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
  }

  /**
   * Request a bundle of files by tucking them onto the doc head and waiting
   * for them to load and run.
   * @caller  request
   * @method  request_bundle
   * @param   {Array}   bundle  Bundle to load
   * @returns {Promise} Promise (Loaded files)
   */
  function requestBundle(bundle) {
    var i, len, promise_list, mod, is_on_lib, batch, path, el;

    promise_list = [];
    batch = document.createDocumentFragment();

    for (i = 0, len = bundle.length; i < len; i += 1) {
      mod = bundle[i];
      is_on_lib = clappjs.module_callback_dict[mod];

      if (is_on_lib) {
        promise_list[i] = RSVP.resolve({
          "callback": is_on_lib(),
          "name": mod
        });
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
   * "Request" is our internal "require". Call modules like this:
   *
   *      request(["foo", "bar"]).then(function(module_array) {});
   *
   * @caller  any
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
   * "Declare" is the internal "define". Use it to define module (must be
   * name based, which can later be requested. Declare like this:
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

    // Store callback - a module may have dependencies which must be requested
    // and loaded prior to triggering the callback. This stores the callback
    // as a promise, which will be fullfilled when all dependencies are loaded
    // By not overwriting, the callback will remain fullfilled and return
    // the callback with dependencies on subsequent calls.
    clappjs.module_callback_dict[name] =
      clappjs.module_callback_dict[name] ||
        new RSVP.Promise(function (resolve) {
        return request(dependency_list)
          .then(function (dependency_array) {
            var i, len, response_array;

            len = dependency_array.length;
            if (len > 0) {
              for (i = 0, response_array = []; i < len; i += 1) {
                response_array[i] = dependency_array[i];
              }
              return RSVP.all(response_array);
            }
          })
          .then(function (fullfilled_array) {
            resolve(callback(fullfilled_array));
          })
          .fail(console.log);
      });

    // Store dependencies - easier...
    clappjs.module_dependency_dict[name] = dependency_list;
  };

//   /**
//    * Cross-browser wrapper for DOMContentLoaded
//    * Thx Diego Perini - http://javascript.nwbox.com/ContentLoaded/
//    * @caller  main entry point
//    * @method  contentLoaded
//    * @param   {Object} win  scope/window
//    * @param   {Method} fn   callback
//    */
//   function contentLoaded(win, fn) {
//     var done, top, doc, root, add, rem, pre, init, poll;
// 
//     done = false;
//     top = true;
//     doc = win.document;
//     root = doc.documentElement;
//     add = doc.addEventListener ? 'addEventListener' : 'attachEvent';
//     rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent';
//     pre = doc.addEventListener ? '' : 'on';
// 
//     init = function (e) {
//       if (e.type === 'readystatechange' && doc.readyState !== 'complete') {
//         return;
//       }
//       (e.type === 'load' ? win : doc)[rem](pre + e.type, init, false);
//       if (!done) {
//         done = true;
//         fn.call(win, e.type || e);
//       }
//     };
// 
//     poll = function () {
//       try {
//         root.doScroll('left');
//       } catch (e) {
//         window.setTimeout(poll, 50);
//         return;
//       }
//       init('poll');
//     };
// 
//     if (doc.readyState === 'complete') {
//       fn.call(win, 'lazy');
//     } else {
//       if (doc.createEventObject && root.doScroll) {
//         try {
//           top = !win.frameElement;
//         } catch (ignore) {}
//         if (top) {
//           poll();
//         }
//       }
//       doc[add](pre + 'DOMContentLoaded', init, false);
//       doc[add](pre + 'readystatechange', init, false);
//       win[add](pre + 'load', init, false);
//     }
//   }

//   /* =================================================================== */
//   /*                             ENTRY POINT                             */
//   /* =================================================================== */
// 
//   // let's go!
//   contentLoaded(window, function () {
//     return request(["render"])
//       .then(function (module_list) {
//         var render = module_list[0];
// 
//         return render.set({"url": fetchScriptPath("data-config")});
//       })
//       .fail(console.log);
//   });

}(document, RSVP));