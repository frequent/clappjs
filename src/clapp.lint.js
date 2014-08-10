/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global Promise, module, test, ok, declare */
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
    {"name": 'jslint', "src": '../lib/jslint/jslint.js'},
    {"name": 'csslint', "src": '../lib/csslint/csslint.js'}
  ], function (util, JSLINT, CSSLint) {

    var lint = {};

    /**
     * Load a list of urls via Ajax
     * @method  promiseAjaxLoop
     * @param   {Array}   my_url_list   Urls to load
     * @return  {Promise} Array of file responses
     */
    lint.promiseAjaxLoop = function (my_url_list) {
      var i, len, file_list;

      for (i = 0, file_list = [], len = my_url_list.length; i < len; i += 1) {
        file_list[i] = util.ajax({"url": my_url_list[i]});
      }

      return Promise.all(file_list);
    }

    /**
     * Run a test method on a number of files
     * @method runTests
     * @param   {Array}     List of urls
     * @param   {Array}     List of file strings
     * @param   {Function}  Test method to run
     */
    lint.run = function (my_file_url_list, my_file_str_list, my_test) {
      var i, len;

      for (i = 0, len = my_file_str_list.length; i < len; i += 1) {
        my_test(my_file_url_list[i], my_file_str_list[i]);
      }
    };

    // ============================= CSSLINT =================================
    /**
     * CSS Lint a list of files
     * Thx Tristan - setup jslint in Qunit - http://bit.ly/1qDWNVy
     * @method  cssLint
     * @param   {Array} url_list  List of files to lint
     */
    lint.cssLint = function (my_url_list) {

      // helper: lint a file
      function cleanCSS(my_file_url, my_file_str) {
        test(my_file_url, 0, function () {
          var i, len, data, err;

          data = CSSLint.verify(my_file_str);

          for (i = 0, len = data.messages.length; i < len; i += 1) {
            err = data.messages[i];
            ok(
              false,
              my_file_url + " line " + err.line + ", col " + err.col + ":" +
                  err.type + ": " + err.evidence + "\n" + err.reason
            );
          }
        });
      }

      // helper: run CSSlint on files
      function cssLintFileList(my_file_list) {
        module("csslint bundle");
        lint.run(my_url_list, my_file_list, cleanCSS);
      }

      // START:
      return lint.promiseAjaxLoop(my_url_list)
        .then(cssLintFileList);
    };

    // ============================= JSLINT ==================================
    /**
     * JSLint a list of files
     * Thx Tristan - setup jslint in Qunit - http://bit.ly/1qDWNVy
     * @method  jsLint
     * @param   {String} url  Url of file to lint
     */
    lint.jsLint = function (my_url_list) {

      // helper: lint a file
      function cleanJS(my_file_url, my_file_str) {
        test(my_file_url, 0, function () {
          var i, len, data, err;

          JSLINT(my_file_str, {});
          data = JSLINT.data();

          for (i = 0, len = data.errors.length; i < len; i += 1) {
            err = data.errors[i];
            ok(
              false,
              my_file_url + ":" + err.line + ":" + err.character + ": " +
                  err.evidence + "\n" + err.reason
            );
          }
        });
      }

      // helper: run JSlint on files
      function jsLintFileList(my_file_list) {
        module("jslint bundle");
        lint.run(my_url_list, my_file_list, cleanJS);
      }

      // START:
      return lint.promiseAjaxLoop(my_url_list)
        .then(jsLintFileList);
    };

    return lint;
  });

}(Promise));