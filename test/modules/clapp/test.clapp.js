/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
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

  module("module loader");

  contentLoaded(window, function () {

    asyncTest("Plain module load", function () {
      request(["foo"])
        .then(function (module_list) {

          ok(window.request && window.declare, "clappjs initiliazed");
          ok(module_list !== undefined, "List of modules returned.");
          ok(module_list.length === 1, "Module list contains one module.");
          ok(module_list[0].test_value, "Module property accessible.");

          start();
        })
        .fail(console.log);
    });

    asyncTest("Plain module load, reload from memory", function () {
      request(["foo"])
        .then(function (module_list) {
          var foo = document.querySelectorAll("script[src='js/foo.js']");

          ok(module_list !== undefined, "List of modules returned.");
          ok(foo.length === 1, "Subsequent request gets module from memory.");
          start();
        })
        .fail(console.log)

    });

    asyncTest("Plain module load, missing dependency", function () {
      request(["bar"]).then(function (module_list) {

          ok(module_list !== undefined, "List of modules returned.");
          ok(module_list.length === 1, "One module returned");
          ok(module_list[0].test_value, "Module property accessible.");
          ok(
            module_list[0].sub_module_1 !== undefined,
            "Sub Dependency 1 returned."
          );
          ok(
            module_list[0].sub_module_2 !== undefined,
            "Sub Dependency 2 returned."
          );
          ok(
            module_list[0].sub_module_1.test_value,
            "Dependency value accessible."
          );
          ok(
            module_list[0].sub_module_2.test_value,
            "Dependency value accessible."
          );

          start();
        })
        .fail(console.log);
    });

    asyncTest("Multiple dependencies, no sub dependencies", function () {
      request(["bum", "pum", "wum"])
        .then(function (module_list) {

          ok(module_list !== undefined, "List of modules returned.");
          ok(module_list.length === 3, "Module list contains three modules.");
          ok(module_list[0].test_value, "Module property 1 accessible.");
          ok(module_list[1].test_value, "Module property 2 accessible.");
          ok(module_list[2].test_value, "Module property 3 accessible.");

          start();
        })
        .fail(console.log);
    });

    asyncTest("Multiple and sub dependencies, from memory", function () {
      request(["bar", "pum", "wur"])
        .then(function (module_list) {
          var baz = document.querySelectorAll("script[src='js/baz.js']");

          ok(module_list !== undefined, "List of modules returned.");
          ok(module_list.length === 3, "Module list contains three modules.");
          ok(module_list[0].test_value, "Module property 1 accessible.");
          ok(module_list[1].test_value, "Module property 2 accessible.");
          ok(module_list[2].test_value, "Module property 3 accessible.");
          ok(
            module_list[0].sub_module_1 !== undefined,
            "Dependency returned."
          );
          ok(
            module_list[0].sub_module_1.test_value,
            "Dependency accessible."
          );
          ok(
            module_list[0].sub_module_2 !== undefined,
            "Dependency returned."
          );
          ok(
            module_list[0].sub_module_2.test_value,
            "Dependency accessible."
          );
          ok(module_list[2].sub_module !== undefined, "Dependency returned.");
          ok(module_list[2].sub_module.test_value, "Dependency accessible.");
          ok(baz.length === 1, "Subsequent requests served from memory.");

          start();
        })
        .fail(console.log);
    });

    asyncTest(
      "Multiple dependencies, inline, external, sub dependencies, from memory",
      function () {
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
          .then(function (module_list) {
            var baz = document.querySelectorAll("script[src='js/baz.js']");

            ok(module_list !== undefined, "List of modules returned.");
            ok(module_list.length === 2, "Module list contains two modules.");
            ok(module_list[0].test_value, "Module property 1 accessible.");
            ok(module_list[1].test_value, "Module property 2 accessible.");
            ok(
              module_list[0].sub_module !== undefined,
              "Dependency returned."
            );
            ok(module_list[0].sub_module.test_value, "Dependency accessible.");
            ok(
              module_list[1].sub_module !== undefined,
              "External dependency returned."
            );
            ok(
              module_list[1].sub_module.test_value,
               "External dependency accessible."
            );
            ok(baz.length === 1, "Subsequent requests served from memory.");

            start();
          })
          .fail(console.log);
      }
    );

    asyncTest("Load dependencies by path, inline with sub-sub-dependency", function () {
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
      .then(function (module_list) {
        var baz = document.querySelectorAll("script[src='js/baz.js']");

        ok(module_list !== undefined, "List of modules returned.");
        ok(module_list.length === 2, "Module list contains two modules.");
        ok(module_list[0].test_value, "Module property 1 from subfolder accessible.");
        ok(module_list[1].test_value, "Module property 2 accessible.");
        ok(module_list[0].sub_module !== undefined, "Dependency returned.");
        ok(module_list[0].sub_module.test_value, "Dependency accessible.");
        ok(module_list[1].sub_module !== undefined, "External dependency returned.");
        ok(module_list[1].sub_module.test_value, "External dependency accessible.");
        ok(baz.length === 1, "Subsequent requests served from memory.");

        start();
      })
      .fail(console.log);
    });

    asyncTest("Load and shim external dependencies", function () {
      function getJquery() {
        return request([
          {"name": "jquery", "src": "js/jquery/jquery-1.11.0.js", "shim": true}
        ]);
      };

      function testJquery(my_module_list) {
        var $mod = my_module_list[0];

        ok(my_module_list !== undefined, "List of modules returned.");
        ok(my_module_list.length === 1, "Module list contains one module.");
        ok(
          window.$ === undefined && window.jQuery === undefined,
          "jQuery is not set as a global"
        );
        ok(typeof $mod === "function", "jQuery returned as module");
        ok($mod(document).length === 1, "jQuery accessible $(document) works");
        ok(
          $mod(document).find("div").eq(0)[0].tagName === "DIV",
          "random jQuery methods (find, eq) work"
        );
      }

      function getJIO() {
        return request([
          {"name": "storage", "src": "js/jio/jio.js", "shim": true}
        ]).fail(console.log)
      }

      function testJIO(my_module_list) {
        var jIO = my_module_list[0];

        ok(my_module_list !== undefined, "List of modules returned.");
        ok(my_module_list.length === 1, "Module list contains one module");
        ok(window.jIO === undefined, "Module is not set as a global");
        ok(typeof jIO.createJIO === "function", "Module methods available");
        ok(jIO.hex_sha256 !== undefined, "Module dependencies available");

        start();
      }

      getJquery()
        .then(testJquery)
        .then(getJIO)
        .then(testJIO)
        .fail(console.log);
    });
  });

}());