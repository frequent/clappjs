/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, module, test, ok, stop, start, JSLINT, toLint, asyncTest,
  request, declare, console, document, require, QUnit */
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

  module("module loader");

  contentLoaded(window, function () {

    // requirjs...
    QUnit.config.autostart = false;

    window.setTimeout(function () {

      // some old fashioned require-ing to make sure nothing is broken
      require(["req"], function (req) {

        test("RequireJS still works normally alongside clapp", function () {
          ok(req !== undefined, "Calling require still returns something");
          ok(req.test_value !== undefined, "Module correctly declared");
          ok(req.sub_module.test_value !== undefined, "Sub dependency loaded");
        });

      });

      start();

    }, 10);


    asyncTest("Plain module load", function () {
      request(["foo"]).spread(function (foo) {

        ok(window.request && window.declare, "clappjs initiliazed");
        ok(foo !== undefined, "Module returned.");
        ok(foo.test_value, "Module property accessible.");

        start();
      })
        .catch(console.log);
    });

    asyncTest("Plain module reload from memory", function () {
      request(["foo"]).spread(function (foo) {
        var foo_src = document.querySelectorAll("script[src='js/foo.js']");

        ok(foo !== undefined, "Module returned.");
        ok(foo_src.length === 1, "Subsequent request loaded from memory.");

        start();
      })
        .catch(console.log);
    });

    asyncTest("Plain module, deps declared in module callback", function () {
      request(["bar"]).spread(function (bar) {

        ok(bar !== undefined, "Module returned.");
        ok(bar.test_value, "Module property accessible.");
        ok(bar.sub_module_1 !== undefined, "Sub Dependency 1 returned.");
        ok(bar.sub_module_2 !== undefined, "Sub Dependency 2 returned.");
        ok(bar.sub_module_1.test_value, "Dependency value accessible.");
        ok(bar.sub_module_2.test_value, "Dependency value accessible.");

        start();
      })
        .catch(console.log);
    });

    asyncTest("Multiple dependencies, no sub dependencies", function () {
      request(["bum", "pum", "wum"]).spread(function (bum, pum, wum) {

        ok(bum !== undefined, "First module returned.");
        ok(pum !== undefined, "Second module returned.");
        ok(wum !== undefined, "Third module returned.");
        ok(bum.test_value, "Module property 1 accessible.");
        ok(pum.test_value, "Module property 2 accessible.");
        ok(wum.test_value, "Module property 3 accessible.");

        start();
      })
        .catch(console.log);
    });

    asyncTest("Multiple and sub dependencies, from memory", function () {
      request(["bar", "pum", "wur"]).spread(function (bar, pum, wur) {
        var baz = document.querySelectorAll("script[src='js/baz.js']");

        ok(bar !== undefined, "Module 1 returned.");
        ok(pum !== undefined, "Module 2 returned.");
        ok(wur !== undefined, "Module 3 returned.");
        ok(bar.test_value, "Module property 1 accessible.");
        ok(pum.test_value, "Module property 2 accessible.");
        ok(wur.test_value, "Module property 3 accessible.");
        ok(bar.sub_module_1 !== undefined, "Dependency returned.");
        ok(bar.sub_module_1.test_value, "Dependency accessible.");
        ok(bar.sub_module_2 !== undefined, "Dependency returned.");
        ok(bar.sub_module_2.test_value, "Dependency accessible.");
        ok(wur.sub_module !== undefined, "Dependency returned.");
        ok(wur.sub_module.test_value, "Dependency accessible.");
        ok(baz.length === 1, "Subsequent requests served from memory.");

        start();
      })
        .catch(console.log);
    });

    asyncTest("Load multiple instances of same dependency", function () {
      request(["mfg", "mfg", "mfg"]).spread(function (a, b, c) {
        var mfg = document.querySelectorAll("script[src='js/mfg.js']");

        ok(a !== undefined, "Module 1 returned.");
        ok(b !== undefined, "Module 2 returned.");
        ok(c !== undefined, "Module 3 returned.");
        ok(a.test_value, "Module 1 accessible.");
        ok(b.test_value, "Module 2 accessible.");
        ok(c.test_value, "Module 3 accessible.");
        ok(mfg.length === 1, "Same file multiple times in batch served once.");

        start();
      })
        .catch(console.log);
    });

    asyncTest("Multiple dependencies, inline/external/sub", function () {
      declare("abc", ["baz"], function (baz) {
        var abc = {
          "name": "abc",
          "sub_module": baz,
          "test_value": true
        };

        return abc;
      });

      declare("def", ["abc"], function (abc) {
        var def = {
          "name": "def",
          "sub_module": abc,
          "test_value": true
        };

        return def;
      });

      request(["def", "ghi"]).spread(function (def, ghi) {
        var baz = document.querySelectorAll("script[src='js/baz.js']");

        ok(def !== undefined, "Module 1 returned.");
        ok(ghi !== undefined, "Module 2 returned.");
        ok(def.test_value, "Module property 1 accessible.");
        ok(ghi.test_value, "Module property 2 accessible.");
        ok(def.sub_module !== undefined, "Dependency returned.");
        ok(def.sub_module.test_value, "Dependency accessible.");
        ok(ghi.sub_module !== undefined, "External dependency ok.");
        ok(ghi.sub_module.test_value, "External dependency access.");
        ok(baz.length === 1, "Subsequent requests served from memory.");

        start();
      })
        .catch(console.log);
    });

    asyncTest("Load modules by path, inline, sub-sub-dependency", function () {
      declare("opq", ["bar"], function (bar) {
        var opq = {
          "name": "opq",
          "sub_module": bar,
          "test_value": true
        };

        return opq;
      });

      request([
        {"name": "xyz", "src": "js/sub/xyz.js", "dependencies": ["baz"]},
        {"name": "opq", "src": "js/opq.js", "dependencies": ["bar"]}
      ])
        .spread(function (xyz, opq) {
          var baz = document.querySelectorAll("script[src='js/baz.js']");

          ok(xyz !== undefined, "Module 1 returned.");
          ok(opq !== undefined, "Module 2 returned.");
          ok(xyz.test_value, "Module property 1 from subfolder ok.");
          ok(opq.test_value, "Module property 2 accessible.");
          ok(xyz.sub_module !== undefined, "Dependency returned.");
          ok(xyz.sub_module.test_value, "Dependency accessible.");
          ok(opq.sub_module !== undefined, "External dependency returned.");
          ok(opq.sub_module.test_value, "External dependency accessible.");
          ok(baz.length === 1, "Subsequent requests served from memory.");

          start();
        })
        .catch(console.log);
    });

    asyncTest("Load and shim external dependencies", function () {

      // load jquery
      function getJquery() {
        return request([{
          "name": "jquery",
          "src": "js/jquery/jquery-1.11.0.js",
          "shim": true,
          "named": true
        }]);
      }

      // run jquery tests
      function testJquery($mod) {
        var div = $mod(document).find("div").eq(0)[0].tagName;

        // prevent JQM from triggering later
        $mod(document).on("mobileinit", function () {
          $mod.mobile.autoInitializePage = false;
        });

        ok($mod !== undefined, "jQuery - List of modules returned.");
        ok(window.$ === undefined, "jQuery - not set as a global.");
        ok(typeof $mod === "function", "jQuery - returned as module.");
        ok($mod(document).length === 1, "jQuery - $(document) works.");
        ok(div === "DIV", "Random jQuery methods (find, eq) work.");
      }

      // get plugin "jio", anonymous, with sub dependencies
      function getJIO() {
        return request([
          {"name": "storage", "src": "js/jio/jio.js", "shim": true}
        ]);
      }

      // test jio
      function testJIO(jIO) {
        console.log(jIO);
        ok(jIO !== undefined, "jIO - List of modules returned.");
        ok(window.jIO === undefined, "jIO - Module is not set as a global");
        ok(typeof jIO.createJIO === "function", "jiO - Methods available");
        ok(jIO.hex_sha256 !== undefined, "jIO - Dependencies available");
      }

      // get plugin i18n, anonymous
      function getI18n() {
        return request([{
          "name": "i18n",
          "src": "js/i18next/i18next.amd-1.7.3.js",
          "shim": true
        }]);
      }

      // test i18n
      function testI18n(i18n) {
        ok(i18n !== undefined, "i18n - List of modules returned.");
        ok(window.i18n === undefined, "i18n - not set as a global");
        ok(typeof i18n.t === "function", "i18n - Methods accessible");
      }

      // get jQuery Mobile
      function getJQM() {
        return request([{
          "name": "mobile",
          "src": "js/jquery-mobile/jquery-mobile.latest.js",
          "shim": true
        }, {
          "name": "mobile_css",
          "src": "js/jquery-mobile/jquery-mobile.latest.css"
        }]);
      }

      // test jQuery Mobile
      function testJQM(mobile) {
        ok(mobile !== undefined, "List of modules returned.");
        ok(window.$ === undefined, "jQuery not set as global");
        ok(mobile.version !== undefined, "Properties accessible");

        start();
      }

      getJquery()
        .spread(testJquery)
        .then(getJIO)
        .spread(testJIO)
        .then(getI18n)
        .spread(testI18n)
        .then(getJQM)
        .spread(testJQM)
        .catch(console.log);
    });

  });

}());