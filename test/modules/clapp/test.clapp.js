/*jslint indent: 2 */
/*global module, test, ok, stop, start, XMLHttpRequest, JSLINT, toLint */
(function () {
  "use strict";

    /**
   * Cross-browser wrapper for DOMContentLoaded
   * Thx Diego Perini - http://javascript.nwbox.com/ContentLoaded/
   * @caller  main entry point
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

  module("CLAPP");

  contentLoaded(window, function () {

    asyncTest( "Single plain module load", function () {
      request(["foo"])
        .then(function (module_list) {

          ok(window.request && window.declare, "clappjs initiliazed");
          ok(module_list !== undefined, "List of modules returned.");
          ok(module_list.length === 1, "List of modules contains one module.");
          ok(module_list[0].test_value, "Module property accessible.");

          start();
        })
        .fail(console.log);
    });

    asyncTest( "Single module load with missing dependency", function () {
      request(["bar"])
        .then(function (module_list) {

          ok(module_list !== undefined, "List of modules returned.");
          ok(module_list.length === 1, "List of modules contains one module.");
          ok(module_list[0].test_value, "Module property accessible.");
          ok(module_list[0].sub_module !== undefined, "Dependency returned.");
          ok(module_list[0].sub_module.test_value, "Dependency accessible.");

          start();
        })
        .fail(console.log);
    });
  });

}());