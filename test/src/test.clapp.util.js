/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, module, test, ok, stop, start, asyncTest,
  request, declare, console, document, require, QUnit, deepEqual */
(function (Promise) {
  "use strict";

  declare("test.clapp.util.js", [], function () {

    var test_util = {};

    // =========================== PRIVATE ===================================

    /**
     * Test the parse method, which makes sure an object (from HTTP request)
     * is not returned as string. Notably Chrome and Safari seem to sometime
     * not parse out of the box.
     * @method  testUtilParse
     * @returns {Promise} A promise
     */
    function testUtilParse() {
      return asyncTest("Parse method", function () {
        return request([
          {"name": "util", "src": "../src/clapp.util.js"}
        ]).spread(function (util) {
          var string_object, real_object;

          string_object = '{"bar": "baz", "bam": 123, "bum": null}';
          real_object = {"bar": "baz", "bam": 123, "bum": null};

          deepEqual(util.parse(string_object), real_object, "Parse works");

          start();
        });
      });
    }

    /**
     * Test UUID generation
     * not parse out of the box.
     * @method  testUtilUuid
     * @returns {Promise} A promise
     */
    function testUtilUuid() {
      return asyncTest("Uuid method", function () {
        return request([
          {"name": "util", "src": "../src/clapp.util.js"}
        ]).spread(function (util) {
          var uuid = util.uuid();

          ok(uuid, "Method returns value");
          ok(uuid.split("_")[0] === "id", "String added to front of uuid");

          start();
        });
      });
    }

    // ============================= API =====================================
    test_util.runner = function () {

      module("module - util");

      return Promise
        .delay(10)
        .then(testUtilParse)
        .then(testUtilUuid);
        //.then(testStartListenTo)
        //.then(testStopListenTo)
        //.then(testError)
        //.then(testAjax)
        //.then(testPromiseEventListener)
        //.then(testLoopEventListener)
        //.then(testDelayedEventTrigger)
        //.then(testPromiseReadAsText)
    };

    return test_util;
  });

}(Promise));