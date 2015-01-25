/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global Promise, module, test, ok, declare, console, QUnit, HTMLInspector,
 CSSLint, JSLINT */
(function (Promise, JSLINT) {
  "use strict";

  /* ====================================================================== */
  /*                               LINT                                     */
  /* ====================================================================== */

  /* ====================================================================== */
  /*                          Utility Functions                             */
  /* ====================================================================== */

  /**
    * @description | Run a test for a file not found
    * @method      | flag404
    * @param       | {string},   my_url,   Urls which could not be loaded
    **/
  function flag404(my_url) {
    ok(false, "404: File not found: " + my_url);
  }

  /**
    * @description | Return an error string for JSLINT to display in Qunit test
    * @method      | showJSLintError
    * @param       | {string},    my_url,   Urls of file which was tested
    * @param       | {object},    my_err,   Error Object
    * @returns     | {string},    response string
    **/
  function showHTML5Errors(my_url, my_err) {
    var str = my_url + ": " + my_err.rule + ": " + my_err.message + ": " +
      my_err.context;
    //console.warn(my_err.message, my_err.context);
    return str;
  }

  /**
    * @description | Return an error string for JSLINT to display in Qunit test
    * @method      | showJSLintError
    * @param       | {string},    my_url,  Urls of file which was tested
    * @param       | {object},    my_err,  Error Object
    * @returns     | {string},    response string
    **/
  function showJSLintError(my_url, my_err) {
    return my_url + "|| line:" + my_err.line + ": " +
        my_err.character + ": " +   my_err.evidence + "\n" + my_err.reason;
  }

  /**
    * @description | Return an error string for CSSLINT to display in Qunit test
    * @method      | showCSSLintErrors
    * @param       | {string},    my_url,   Urls of file which was tested
    * @param       | {object},    my_err,   Error Object
    * @returns     | {string},    response string
    **/
  function showCSSLintErrors(my_url, my_err) {
    return my_url + "|| line: " + my_err.line + ", " + my_err.col +
        ":" + my_err.type + ": " + my_err.message + "\n || Evidence:" +
            my_err.evidence;
  }

  /**
    * @description | Run JSLINT on a string as Qunit test
    * @method      | runJSLint
    * @param       | {string},    my_string_to_lint,   String to Lint
    * @param       | {string},    my_file_url,         URL of file
    **/
  function runJSLint(my_file_url, my_string_to_lint) {
    var i, len, data;

    JSLINT(my_string_to_lint, {});
    data = JSLINT.data();

    for (i = 0, len = data.errors.length; i < len; i += 1) {
      ok(false, showJSLintError(my_file_url, data.errors[i]));
    }
  }

  /**
    * @description | Run CSSLINT on a string as Qunit test
    * @method      | runCSLint
    * @param       | {string},    my_string_to_lint,   String to Lint
    * @param       | {string},    my_file_url,         URL of file
    **/
  function runCSLint(my_file_url, my_string_to_lint) {
    var i, len, data;

    data = CSSLint.verify(my_string_to_lint);

    for (i = 0, len = data.messages.length; i < len; i += 1) {
      ok(false, showCSSLintErrors(my_file_url, data.messages[i]));
    }
  }

  /**
    * @description | Run HTML5lint on a string as Qunit test
    * @method      | runHTML5Lint
    * @param       | {string},    my_string_to_lint,   String to Lint
    **/
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
    * @description | Setup tests by returning the response text and method to 
    * @description | run in Qunit
    * @method      | setupTest
    * @param       | {string},   my_loaded_url,  Url loaded
    * @param       | {object},   my_xhr_dict,    XHR response object
    * @param       | {method},   my_test_method, Method to run in Qunit test()
    * @returns     | {array},    Request response and test method
    **/
  function setupTest(my_xhr_dict, my_test_method) {
    if (my_xhr_dict.status === 404) {
      return [null, flag404];
    }
    return [my_xhr_dict.responseText, my_test_method];
  }

  /**
    * @description | Run a test method on a number of files
    * @method      | runTests
    * @param       | {array},     List of urls
    * @param       | {array},     List of response objects (http requests)
    * @param       | {function},  Test method to run
    **/
  function runLint(my_url_list, my_response_list, my_test) {
    var i, len, list;

    for (i = 0, list = [], len = my_response_list.length; i < len; i += 1) {
      list[i] = my_test(my_url_list[i], my_response_list[i]);
    }

    return list;
  }

  /**
    * @description | Load a list of files or pass through exsting strings
    * @method      | promiseAjaxLoop
    * @param       | {array},   my_url_list,  Urls to load
    * @param       | {array},   my_str_list,  Strings loaded/passed
    * @param       | {object},  my_util,      Utilities object
    * @return      | {promise}, Array of file responses
    **/
  function promiseAjaxLoop(my_url_list, my_str_list, my_util) {
    var i, len, file_list;

    for (i = 0, file_list = [], len = my_url_list.length; i < len; i += 1) {
      file_list[i] = my_str_list[i]
          || my_util.ajax({"url": my_url_list[i]}, 404);
    }

    return Promise.all(file_list);
  }

  /**
   * =========================================================================
   *                          EXPOSED METHODS
   * =========================================================================
   **/
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
  ], function (util) {
    var lint = {};

    /**
      * @description | JSLint a list of files
      * @thanks      | https://github.com/TristanCavelier/notesntools/
      * @method      | jsLint
      * @param       | {array},   my_files_to_load,  File urls to load and lint
      * @param       | {array},   my_files_loaded,   Xhr responses to pass
      * @returns     | {promise}, resolving with file names and content
      **/
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
      return promiseAjaxLoop(my_files_to_load, my_files_loaded || [], util)
        .then(jsLintFileList);
    };

  /**
    * @description | CSS Lint a list of files
    * @thanks      | https://github.com/TristanCavelier/notesntools/
    * @method      | cssLint
    * @param       | {array},   my_files_to_load,  File url to load and lint
    * @param       | {array},   my_files_loaded,   Xhr responses to pass
    * @returns     | {promise}, resolving with files to load and content
    **/
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
      return promiseAjaxLoop(my_files_to_load, my_files_loaded || [], util)
        .then(cssLintFileList);
    };

    /**
      * @description | HTML Lint a list of files
      * @thanks      | html5-lint https://github.com/mozilla/html5-lint
      * @method      | html5Lint
      * @returns     | {promise} resolving with lint results
      **/
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

}(Promise, JSLINT));