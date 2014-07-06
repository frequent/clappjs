/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, module, test, ok, stop, start, JSLINT, toLint, asyncTest,
  request, declare, console, document */
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

    asyncTest("Plain module load", function () {
      request(["foo"])
        .then(function (list) {

          ok(window.request && window.declare, "clappjs initiliazed");
          ok(list !== undefined, "List of modules returned.");
          ok(list.length === 1, "Module list contains one module.");
          ok(list[0].test_value, "Module property accessible.");

          start();
        })
        .fail(console.log);
    });

    asyncTest("Plain module reload from memory", function () {
      request(["foo"])
        .then(function (list) {
          var foo = document.querySelectorAll("script[src='js/foo.js']");

          ok(list !== undefined, "List of modules returned.");
          ok(foo.length === 1, "Subsequent request gets module from memory.");

          start();
        })
        .fail(console.log);

    });

    asyncTest("Plain module, deps declared in module callback", function () {
      request(["bar"]).then(function (list) {

        ok(list !== undefined, "List of modules returned.");
        ok(list.length === 1, "One module returned");
        ok(list[0].test_value, "Module property accessible.");
        ok(list[0].sub_module_1 !== undefined, "Sub Dependency 1 returned.");
        ok(list[0].sub_module_2 !== undefined, "Sub Dependency 2 returned.");
        ok(list[0].sub_module_1.test_value, "Dependency value accessible.");
        ok(list[0].sub_module_2.test_value, "Dependency value accessible.");

        start();
      })
        .fail(console.log);
    });

    asyncTest("Multiple dependencies, no sub dependencies", function () {
      request(["bum", "pum", "wum"])
        .then(function (list) {

          ok(list !== undefined, "List of modules returned.");
          ok(list.length === 3, "Module list contains three modules.");
          ok(list[0].test_value, "Module property 1 accessible.");
          ok(list[1].test_value, "Module property 2 accessible.");
          ok(list[2].test_value, "Module property 3 accessible.");

          start();
        })
        .fail(console.log);
    });

    asyncTest("Multiple and sub dependencies, from memory", function () {
      request(["bar", "pum", "wur"])
        .then(function (list) {
          var baz = document.querySelectorAll("script[src='js/baz.js']");

          ok(list !== undefined, "List of modules returned.");
          ok(list.length === 3, "Module list contains three modules.");
          ok(list[0].test_value, "Module property 1 accessible.");
          ok(list[1].test_value, "Module property 2 accessible.");
          ok(list[2].test_value, "Module property 3 accessible.");
          ok(list[0].sub_module_1 !== undefined, "Dependency returned.");
          ok(list[0].sub_module_1.test_value, "Dependency accessible.");
          ok(list[0].sub_module_2 !== undefined, "Dependency returned.");
          ok(list[0].sub_module_2.test_value, "Dependency accessible.");
          ok(list[2].sub_module !== undefined, "Dependency returned.");
          ok(list[2].sub_module.test_value, "Dependency accessible.");
          ok(baz.length === 1, "Subsequent requests served from memory.");

          start();
        })
        .fail(console.log);
    });

    asyncTest("Multiple dependencies, inline/external/sub", function () {
      declare("abc", ["baz"], function (baz) {
        return {
          "name": "abc",
          "sub_module": baz,
          "test_value": true
        };
      });

      declare("def", ["abc"], function (abc) {
        return {
          "name": "def",
          "sub_module": abc,
          "test_value": true
        };
      });

      request(["def", "ghi"])
        .then(function (list) {
          var baz = document.querySelectorAll("script[src='js/baz.js']");

          ok(list !== undefined, "List of modules returned.");
          ok(list.length === 2, "Module list contains two modules.");
          ok(list[0].test_value, "Module property 1 accessible.");
          ok(list[1].test_value, "Module property 2 accessible.");
          ok(list[0].sub_module !== undefined, "Dependency returned.");
          ok(list[0].sub_module.test_value, "Dependency accessible.");
          ok(list[1].sub_module !== undefined, "External dependency ok.");
          ok(list[1].sub_module.test_value, "External dependency access.");
          ok(baz.length === 1, "Subsequent requests served from memory.");

          start();
        })
        .fail(console.log);
    });

    asyncTest("Load modules by path, inline, sub-sub-dependency", function () {
      declare("opq", ["bar"], function (bar) {
        return {
          "name": "opq",
          "sub_module": bar,
          "test_value": true
        };
      });

      request([
        {"name": "xyz", "src": "js/sub/xyz.js", "dependencies": ["baz"]},
        {"name": "opq", "src": "js/opq.js", "dependencies": ["bar"]}
      ])
        .then(function (list) {
          var baz = document.querySelectorAll("script[src='js/baz.js']");

          ok(list !== undefined, "List of modules returned.");
          ok(list.length === 2, "Module list contains two modules.");
          ok(list[0].test_value, "Module property 1 from subfolder ok.");
          ok(list[1].test_value, "Module property 2 accessible.");
          ok(list[0].sub_module !== undefined, "Dependency returned.");
          ok(list[0].sub_module.test_value, "Dependency accessible.");
          ok(list[1].sub_module !== undefined, "External dependency returned.");
          ok(list[1].sub_module.test_value, "External dependency accessible.");
          ok(baz.length === 1, "Subsequent requests served from memory.");

          start();
        })
        .fail(console.log);
    });

    asyncTest("Load and shim external dependencies", function () {

      // load jquery
      function getJquery() {
        return request([
          {"name": "jquery", "src": "js/jquery/jquery-1.11.0.js", "shim": true}
        ]);
      }

      // run jquery tests
      function testJquery(my_list) {
        var $mod, div;

        $mod = my_list[0];
        div = $mod(document).find("div").eq(0)[0].tagName;

        ok(my_list !== undefined, "List of modules returned.");
        ok(my_list.length === 1, "Module list contains one module.");
        ok(window.$ === undefined, "jQuery is not set as a global.");
        ok(typeof $mod === "function", "jQuery returned as module.");
        ok($mod(document).length === 1, "jQuery $(document) works.");
        ok(div === "DIV", "Random jQuery methods (find, eq) work.");
      }

      // get plugin "jio", anonymous, with sub dependencies
      function getJIO() {
        return request([
          {"name": "storage", "src": "js/jio/jio.js", "shim": true}
        ]).fail(console.log);
      }

      // test jio
      function testJIO(my_list) {
        var jIO = my_list[0];

        ok(my_list !== undefined, "List of modules returned.");
        ok(my_list.length === 1, "Module list contains one module");
        ok(window.jIO === undefined, "Module is not set as a global");
        ok(typeof jIO.createJIO === "function", "Module methods available");
        ok(jIO.hex_sha256 !== undefined, "Module dependencies available");
      }

      // get plugin i18n, anonymous
      function getI18n() {
        return request([{
          "name": "i18n",
          "src": "js/i18next/i18next.amd-1.7.3.js",
          "shim": true
        }]).fail(console.log);
      }

      // test i18n
      function testI18n(my_list) {
        var i18n = my_list[0];

        ok(my_list !== undefined, "List of modules returned.");
        ok(my_list.length === 1, "Module list contains one module");
        ok(window.i18n === undefined, "Module is not set as a global");
        ok(typeof i18n.t === "function", "Methods of module are accessible");

        start();
      }

      getJquery()
        .then(testJquery)
        .then(getJIO)
        .then(testJIO)
        .then(getI18n)
        .then(testI18n)
        .fail(console.log);
    });
  });

}());