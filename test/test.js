/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, document, Promise */
(function (window, document, Promise) {
  "use strict";

  /**
   * Run the tests defined in the runner method of each test module
   * TODO: Should pass an option dict here specifying URL scheme, etc.
   * @method  runTestModules
   * @param   {Array}   my_module_list    List of requested modules
   * @returns {Promise} A promise
   */
  function runTestModules(my_module_list) {
    var i, len, test_list;

    for (i = 0, test_list = [], len = my_module_list.length; i < len; i += 1) {
      test_list[i] = my_module_list[i].runner({});
    }

    return Promise.all(test_list);
  }

  /**
   * Append retrieved test files to DOM and run tests on them
   * @method  declareAndRunTestModules
   * @param   {Array}   my_test_file_list   List of strings to append to DOM
   * @returns {Promise} A promise
   */
  function declareAndRunTestModules(my_test_file_list) {
    var i, len, script, fragment, script_dict, request_list, arr;

    request_list = [];
    fragment = document.createDocumentFragment();
    for (i = 0, len = my_test_file_list.length; i < len; i += 1) {
      script_dict = my_test_file_list[i];

      if (script_dict.src) {
        arr = script_dict.url.split("/");
        script = document.createElement("script");
        script.type = "text/javascript";
        script.text = script_dict.src;
        request_list.push({"name": arr[arr.length - 1]});
        fragment.appendChild(script);
      }
    }

    // this will declare modules
    document.getElementsByTagName('head')[0].appendChild(fragment);

    return request(request_list)
      .then(runTestModules);
  }

  /**
   * Fetch module scripts currently in the DOM
   * @method    fetchUrls
   * @param     {String}  my_tag_name   Tag name of the module to fetch
   * @returns   {Array}   List of found modules
   */
  function fetchUrls(my_tag_name) {
    var i, len, url, element_list, module_list, test_module_list;

    element_list = document.getElementsByTagName(my_tag_name);
    module_list = [];
    test_module_list = [];

    for (i = 0, len = element_list.length; i < len; i += 1) {
      switch (my_tag_name) {
      case "script":
        url = element_list[i].getAttribute("src");
        break;
      case "link":
        url = element_list[i].getAttribute("href");
        break;
      }

      if (url.indexOf("clapp") > 0) {
        module_list.push(url);

        // TODO: no?
        if (my_tag_name = "script") {
          test_module_list.push(url.replace("../src/", "../test/src/test."));
        }
      }
    }

    return [module_list, test_module_list];
  }

  /**
   * Cross-browser wrapper for DOMContentLoaded
   * Thx Diego Perini - http://javascript.nwbox.com/ContentLoaded/
   * @method  contentLoaded
   * @param   {Object} win  scope/window
   * @param   {Method} fn   callback
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

  // START:
  contentLoaded(window, function () {

    // let this be the start of the chain with the only caught :-)
    request([
      {"name": "lint", "src": "../src/clapp.lint.js"}
    ])
    .spread(function (linter) {
      var module_list = fetchUrls("script");
      return Promise.all([
        linter.jsLint(module_list[0]),
        linter.jsLint(module_list[1])
      ]);
    })
    .then(function (my_linted_section_list) {
      var test_module_list = my_linted_section_list[1];

      return declareAndRunTestModules(test_module_list);
    })
    .caught(function (error) {
      return error;
    })

  });

}(window, document, Promise));

