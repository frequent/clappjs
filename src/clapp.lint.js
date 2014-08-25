/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global Promise, module, test, ok, declare, console, QUnit, HTMLInspector,
 CSSLint */
(function (Promise) {
  "use strict";

  /* ====================================================================== */
  /*                                LINT                                    */
  /* ====================================================================== */

  /**
   * =========================================================================
   *                          Code Quality Tester
   * =========================================================================
   */

  declare("lint", [
    {"name": 'util', "src": '../src/clapp.util.js'},
    {
      "name": 'jslint',
      "src": '../lib/jslint/jslint.js',
      "shim": true
    },
    {
      "name": 'csslint',
      "src": '../lib/csslint/csslint.js',
      "shim": true
    },
    {
      "name": 'htmllint',
      "src": '../lib/htmlInspector/htmlInspector.js',
      "shim": true
    }
  ], function (util, JSLINT) {
    var lint = {};

    // TODO: why are modules still leaking into global namespace!!!
    // =========================== PRIVATE ===================================

    /**
     * Run a test for a file not found
     * @method  flag404
     * @param   {String}   my_url   Urls which could not be loaded
     * @returns -
     */
    function flag404(my_url) {
      ok(false, "404: File not found: " + my_url);
    }

    /*
     * Return an error string for JSLINT to display in Qunit test
     * @method  showJSLintError
     * @param   {String}    my_url  Urls of file which was tested
     * @param   {Object}    my_err  Error Object
     */
    function showHTML5Errors(my_url, my_err) {
      var str = my_url + ": " + my_err.rule + ": " + my_err.message + ": " +
        my_err.context;
      //console.warn(my_err.message, my_err.context);
      return str;
    }

    /*
     * Return an error string for JSLINT to display in Qunit test
     * @method  showJSLintError
     * @param   {String}    my_url  Urls of file which was tested
     * @param   {Object}    my_err  Error Object
     */
    function showJSLintError(my_url, my_err) {
      return my_url + "|| line:" + my_err.line + ": " +
          my_err.character + ": " +   my_err.evidence + "\n" + my_err.reason;
    }

    /*
     * Return an error string for CSSLINT to display in Qunit test
     * @method  showCSSLintErrors
     * @param   {String}    my_url  Urls of file which was tested
     * @param   {Object}    my_err  Error Object
     */
    function showCSSLintErrors(my_url, my_err) {
      return my_url + "|| line: " + my_err.line + ", " + my_err.col +
          ":" + my_err.type + ": " + my_err.message + "\n || Evidence:" +
              my_err.evidence;
    }

    /**
     * Run JSLINT on a string as Qunit test
     * @method  runJSLint
     * @param   {String}    my_string_to_lint   String to Lint
     * @param   {String}    my_file_url         URL of file
     * @returns -
     */
    function runJSLint(my_file_url, my_string_to_lint) {
      var i, len, data;

      JSLINT(my_string_to_lint, {});
      data = JSLINT.data();

      for (i = 0, len = data.errors.length; i < len; i += 1) {
        ok(false, showJSLintError(my_file_url, data.errors[i]));
      }
    }

    /**
     * Run CSSLINT on a string as Qunit test
     * @method  runCSLint
     * @param   {String}    my_string_to_lint   String to Lint
     * @param   {String}    my_file_url         URL of file
     * @returns -
     */
    function runCSLint(my_file_url, my_string_to_lint) {
      var i, len, data;

      data = CSSLint.verify(my_string_to_lint);

      for (i = 0, len = data.messages.length; i < len; i += 1) {
        ok(false, showCSSLintErrors(my_file_url, data.messages[i]));
      }
    }

    /**
     * Run HTML5lint on a string as Qunit test
     * @method  runHTML5Lint
     * @param   {String}    my_string_to_lint   String to Lint
     * @returns -
     */
    function runHTML5Lint(my_file_url) {

      HTMLInspector.inspect({
        "onComplete": function (errors) {
          var i, len;

          for (i = 0, len = errors.length; i < len; i += 1) {
            ok(false, showHTML5Errors(my_file_url, errors[i]));
          }
        }
      });
    }

    /**
     * Setup tests by returning the response text and method to run in Qunit
     * @method  setupTest
     * @param   {String}   my_loaded_url  Url loaded
     * @param   {Object}   my_xhr_dict    XHR response object
     * @param   {Method}   my_test_method Method to run in Qunit test()
     * @returns {Array}    request response and test method
     */
    function setupTest(my_xhr_dict, my_test_method) {
      if (my_xhr_dict.status === 404) {
        return [null, flag404];
      }
      return [my_xhr_dict.responseText, my_test_method];
    }

    /**
     * Run a test method on a number of files
     * @method runTests
     * @param   {Array}     List of urls
     * @param   {Array}     List of response objects (http requests)
     * @param   {Function}  Test method to run
     */
    function runLint(my_url_list, my_response_list, my_test) {
      var i, len, list;

      for (i = 0, list = [], len = my_response_list.length; i < len; i += 1) {
        list[i] = my_test(my_url_list[i], my_response_list[i]);
      }

      return list;
    }

    /**
     * Load a list of files or pass through exsting strings
     * @method  promiseAjaxLoop
     * @param   {Array}   my_url_list    Urls to load
     * @param   {Array}   my_str_list  Strings loaded/passed
     * @return  {Promise} Array of file responses
     */
    function promiseAjaxLoop(my_url_list, my_str_list) {
      var i, len, file_list;

      for (i = 0, file_list = [], len = my_url_list.length; i < len; i += 1) {
        file_list[i] = my_str_list[i]
            || util.ajax({"url": my_url_list[i]}, 404);
      }

      return Promise.all(file_list);
    }

    // =========================== API ===================================

    /**
     * JSLint a list of files
     * Thx Tristan - http://bit.ly/1qDWNVy
     * @method  jsLint
     * @param   {Array}   my_files_to_load  Array of file url to load and lint
     * @param   {Array}   my_files_loaded   Array of xhr responses to pass
     * @returns {Promise} A promise
     */
    lint.jsLint = function (my_files_to_load, my_files_loaded) {

      // set and run tests
      function cleanJS(my_file_url, my_response_object) {
        var return_arr = setupTest(my_response_object, runJSLint);

        test(my_file_url, 0, function () {
          return_arr[1](my_file_url, return_arr[0]);
        });

        return {"url": my_file_url, "src": return_arr[0]};
      }

      // set module
      function jsLintFileList(my_response_list) {
        QUnit.module("jslint bundle");
        return runLint(my_files_to_load, my_response_list, cleanJS);
      }

      // START:
      return promiseAjaxLoop(my_files_to_load, my_files_loaded || [])
        .then(jsLintFileList);
    };

    /**
     * CSS Lint a list of files
     * Thx Tristan - http://bit.ly/1qDWNVy
     * @method  cssLint
     * @param   {Array}   my_files_to_load  Array of file url to load and lint
     * @param   {Array}   my_files_loaded   Array of xhr responses to pass
     * @returns {Promise} A promise
     */
    lint.cssLint = function (my_files_to_load, my_files_loaded) {

      // set and run tests
      function cleanCSS(my_file_url, my_response_object) {
        var return_arr = setupTest(my_response_object, runCSLint);

        test(my_file_url, 0, function () {
          return_arr[1](my_file_url, return_arr[0]);
        });

        return {"url": my_file_url, "src": return_arr[0]};
      }

      // set module
      function cssLintFileList(my_response_list) {
        QUnit.module("csslint bundle");
        runLint(my_files_to_load, my_response_list, cleanCSS);
      }

      // START:
      return promiseAjaxLoop(my_files_to_load, my_files_loaded || [])
        .then(cssLintFileList);
    };

    /**
     * HTML Lint a list of files
     * Thx https://github.com/mozilla/html5-lint
     * @method  html5Lint
     * @returns {Promise} A promise
     */
    // TODO: can't prevent inspector leaking onto window, because exports
    // does not return the full inspector
    lint.html5Lint = function () {

      // set and run tests
      function cleanHTML() {
        test("current DOM", 0, function () {
          runHTML5Lint("current DOM", runHTML5Lint);
        });

        return {"url": null, "src": null};
      }

      // START:
      QUnit.module("html5lint bundle");

      return cleanHTML();
    };

    return lint;
  });

}(Promise));