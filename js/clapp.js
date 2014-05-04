/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, window, document, RSVP */

var request, declare;
(function (window, document, RSVP) {
  "use strict";

  /* ====================================================================== */
  /*                           Application Object                           */
  /* ====================================================================== */
  /**
   * Internal application "global"
   * @global  app
   */
  var app = {

    /**
     * Loading queue to prevent the same file bing loaded multiple times
     * @property  {Object}  registration_queue_dict
     */
    "registration_queue_dict": {},

    /**
     * Dict containing named(!) module callback methods. If a module is
     * declared as "foo" and has a callback method, the callback will be
     * accessible through here.
     *
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
     * @property  {Object}  module_path_dict
     */
    "module_dependency_dict": {}
  };


  /**
    * Retrieve path specified on <script> tags.
    * Thx RequireJS - http://requirejs.org
    * @caller  main entry point
    * @method  fetchScriptPath
    * @param   {String}  attr         Attribute to find
    * @returns {String}  Path
    */
  function fetchScriptPath(attr) {
    var i, path, script_list, len;

    // WARNING: DOM Access
    script_list = document.getElementsByTagName("script");

    for (i = 0, len = script_list.length; i < len; i += 1) {
      path = script_list[i].getAttribute(attr);
      if (path) {
        return path;
      }
    }
    return undefined;
  }

  /**
    * Cross-browser wrapper for DOMContentLoaded
    * Thx Diego Perini - http://javascript.nwbox.com/ContentLoaded/
    * @caller  main entry point
    * @method  contentLoaded
    * @param   {Object} win            Scope/Window
    * @param   {Method} fn             Callback
    */
  function contentLoaded(win, fn) {
    var done, top, doc, root, add, rem, pre, init, poll;

    done = false;
    top = true;
    doc = win.document;
    root = doc.documentElement;
    add = doc.addEventListener ? 'addEventListener' : 'attachEvent';
    rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent';
    pre = doc.addEventListener ? '' : 'on';

    init = function (e) {
      if (e.type === 'readystatechange' && doc.readyState !== 'complete') {
        return;
      }
      (e.type === 'load' ? win : doc)[rem](pre + e.type, init, false);
      if (!done) {
        done = true;
        fn.call(win, e.type || e);
      }
    };

    poll = function () {
      try {
        root.doScroll('left');
      } catch (e) {
        window.setTimeout(poll, 50);
        return;
      }
      init('poll');
    };

    if (doc.readyState === 'complete') {
      fn.call(win, 'lazy');
    } else {
      if (doc.createEventObject && root.doScroll) {
        try {
          top = !win.frameElement;
        } catch (ignore) {}
        if (top) {
          poll();
        }
      }
      doc[add](pre + 'DOMContentLoaded', init, false);
      doc[add](pre + 'readystatechange', init, false);
      win[add](pre + 'load', init, false);
    }
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

    deps = app.module_dependency_dict;

    // nothing set on init
    if (!deps) {
      return [module_list];
    }

    bundle_list = bundle_list || [];
    for (i = 0, mod_len = module_list.length; i < mod_len; i += 1) {
      bundle_list[0] = bundle_list[0] || {"recursion": 0};
      base = bundle_list[0];
      mod = module_list[i];
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
    * Load a module!
    * Thx: RenderJS - http://git.erp5.org/gitweb/renderjs.git/
    * @caller  requestModule
    * @method  declareModule
    * @param   {String}  name  Module name
    * @param   {String}  path  Module path
    * @returns {Promise}
    */
  function declareModule(name, path) {
    var el;

    // don't request the same file multiple times
    if (app.registration_queue_dict.hasOwnProperty(name)) {
      return {
        "name": name,
        "promise": RSVP.resolve()
      };
    }

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

    app.registration_queue_dict[name] = true;
    return {
      "promise": new RSVP.Promise(function (resolve, reject) {
        el.onload = function () {
          var callback, outbound;

          delete app.registration_queue_dict[name];
          callback = app.module_callback_dict[name];

          // NOTE: loaded modules executing will register in callback_dict
          outbound = {"name": name};
          if (callback) {
            outbound.module = callback();
          }
          resolve(outbound);
        };
        el.onerror = function (e) {
          reject(e);
        };
      }),
      "element": el
    };
  }

  /**
    * Request a bundle of files by tucking them onto the doc head and waiting
    * for them to load and run.
    * @caller  request
    * @method  request_bundle
    * @param   {Array}   bundle    Bundle to load
    * @returns {Promise} Promise (Loaded files)
    */
  function requestBundle(bundle) {
    var i, len, promise_list, mod, is_on_lib, batch, declared;

    promise_list = [];
    batch = document.createDocumentFragment();

    for (i = 0, len = bundle.length; i < len; i += 1) {
      mod = bundle[i];
      is_on_lib = app.module_callback_dict[mod];

      if (is_on_lib) {
        promise_list[i] = RSVP.resolve({
          "module": is_on_lib.callback(),
          "name": mod
        });
      } else {
        declared = declareModule(mod, app.module_path_dict[mod]);
        if (declared.element) {
          batch.appendChild(declared.element);
        }
        promise_list[i] = declared.promise;
      }
    }

    // WARNING: DOM access
    if (batch.firstElementChild || batch.firstChild) {
      document.head.appendChild(batch);
    }

    return RSVP.all(promise_list)
      .then(function (response_list) {
        return response_list;
      })
      .fail(app.error);
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
    * @param   {Array}   module_list       List of modules to load
    */
  request = function (module_list) {
    var return_array, queue;

    return_array = [];
    queue = RSVP.resolve();

    // NOTE: generates dependency bundles and loops over bundles to build
    // the return_array which includes the requested modules (must be
    // defined by name to be requested by name(!))
    setLoadingOrder(module_list).forEach(function (el) {
      queue = queue.then(function () {
        return requestBundle(el).then(function (bundle_response) {
          var i, j, mod_len, len, mod, loaded_mod;

          // try to find matches for return_array. (keep order!!!)
          for (i = 0, mod_len = module_list.length; i < mod_len; i += 1) {
            mod = module_list[i];
            for (j = 0, len = bundle_response.length; j < len; j += 1) {
              loaded_mod = bundle_response[j];
              if (mod === loaded_mod.name && loaded_mod.module) {
                return_array.push(loaded_mod.module);
              }
            }
          }
        });
      });
    });

    return queue.then(function () {
      return RSVP.resolve(return_array);
    });
  };

  /**
    * "Declare" is our internal "define". Use it to define module (must be
    * name based, which can later be requested. Declare like this:
    *
    * declare("foo", [dependencies], function (dependencies) {
    *   return something;
    * });
    *
    * Thx: RSVP https://github.com/tildeio/rsvp.js
    * Thx: requireJS http://requirejs.org
    * @caller  declareModule, any
    * @method  define
    * @param   {String} name             Module name
    * @param   {Array}  dependency_list  List of dependencies
    * @param   {Method} callback         Callback returning module
    */
  declare = function (name, dependency_list, callback) {

    if (dependency_list.length === 0) {
      dependency_list = undefined;
    }

    // NOTE: we only like name based modules!
    if (name) {
      app.module_dependency_dict[name] = dependency_list;
      app.module_callback_dict[name] = callback;
    }
  };

  /* ====================================================================== */
  /*                             ENTRY POINT                                */
  /* ====================================================================== */

  // let's go!
  contentLoaded(window, function () {
    request(["render"])
      .then(function (module_list) {
        module_list[0].set(fetchScriptPath("data-config"));
      })
      .fail(app.error);
  });

}(window, document, RSVP));