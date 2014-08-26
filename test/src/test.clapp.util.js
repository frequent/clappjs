/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, module, test, ok, stop, start, asyncTest, expect, MouseEvent,
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

    /**
     * Test event bindings for touch, mouse and custom events. At this test
     * without wrapping inside a promise (below)
     * not parse out of the box.
     * @method  testStartListenTo
     * @returns {Promise} A promise
     */
    function testStartListenTo() {
      return asyncTest("startListenTo method", function () {

        expect(6);

        return request([
          {"name": "util", "src": "../src/clapp.util.js"}
        ]).spread(function (util) {
          var button;

          function dispatchDefaultEvent(my_target, my_type) {
            var evt_mouse, doc = document;

            if (doc.createEvent) {
              evt_mouse = new MouseEvent(my_type, {
                'view': window,
                'bubbles': true,
                'cancelable': true
              });
              my_target.dispatchEvent(evt_mouse);
            } else {
              evt_mouse = doc.createEventObject();
              my_target.fireEvent('on' + my_type, evt_mouse);
            }
          }

          function clickCallback(my_event) {
            ok(true, "event triggered");
            ok(my_event.type === "click", "correct event detected");
          }

          function touchCallback(my_event) {
            ok(true, "event triggered");
            ok(my_event.type === "touchstart", "correct event detected");
          }

          button = document.createElement("button");

          // http://mzl.la/1APSl8U
          util.startListenTo(button, "click", clickCallback);
          dispatchDefaultEvent(button, "click");

          // https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent
          util.startListenTo(button, "touchstart", touchCallback);
          dispatchDefaultEvent(button, "touchstart");
          dispatchDefaultEvent(button, "click");

          start();
        });
      });
    }

    /**
     * Test event unbinding for touch, mouse and custom events (no promise)
     * @method  testStopListenTo
     * @param   {Object}  my_button   Button used in previous step
     * @returns {Promise} A promise
     */

    // ============================= API =====================================
    test_util.runner = function () {

      QUnit.module("module - util");

      return Promise
        .delay(10)
        .then(testUtilParse)
        .then(testUtilUuid)
        .then(testStartListenTo);
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