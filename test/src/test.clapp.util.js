/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, module, test, ok, stop, start, asyncTest,
  request, declare, console, document, require, QUnit */
(function (Promise) {
  "use strict";

  declare("test.clapp.util.js", [], function () {

    var test_util = {};

    // =========================== PRIVATE ===================================

    /**
     * [Text]
     * @method  [name]
     * @returns {Promise} A promise
     */
    function testFoo() {
      return asyncTest("[name]", function () {
        ok(true);
        start();
      });
    }

    // ============================= API =====================================
    test_util.runner = function () {
      module("module util");

      return Promise
        .delay(10)
        .then(testFoo);
    };

    return test_util;
  });

}(Promise));