/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, module, test, ok, stop, start, asyncTest,
  request, declare, console, document, require, QUnit */
(function (window, document, Promise) {
  "use strict";

  declare("test.clapp.loader.js", [], function () {

    var test_loader = {};

    // =========================== PRIVATE ===================================

    /**
    * Test that requireJS works along the clappjs loader
    * TODO: promise?
    * @method  testRequireJS
    * @returns {?}
    */
    function testRequireJS() {
      require(["req"], function (req) {
        test("RequireJS still works normally alongside clapp", function () {
          ok(req !== undefined, "Calling require still returns something");
          ok(req.test_value !== undefined, "Module correctly declared");
          ok(req.sub_module.test_value !== undefined, "Sub dependency loaded");
        });
        start();
      });
    }

    /**
    * Standard test loading a module
    * @method  testPlainModule
    * @returns {Promise} A promise
    */
    function testPlainModule() {
      return asyncTest("Plain module load", function () {
        return request([
          {"name": "foo", "src": "js-test-files/foo.js"}
        ]).spread(function (foo) {
          ok(window.request && window.declare, "clappjs initiliazed");
          ok(foo !== undefined, "Module returned.");
          ok(foo.test_value, "Module property accessible.");
          start();
        });
      });
    }

    /**
    * Standard modules should be loaded from memory if requested again
    * @method  testPlainModuleFromMemory
    * @returns {Promise} A promise
    */
    function testPlainModuleFromMemory() {
      return asyncTest("Plain module reload from memory", function () {
        return request([
          {"name": "foo", "src": "js-test-files/foo.js"}
        ]).spread(function (foo) {
          var foo_src = document.querySelectorAll(
            "script[src='js-test-files/foo.js']"
          );

          ok(foo !== undefined, "Module returned.");
          ok(foo_src.length === 1, "Subsequent request loaded from memory.");

          start();
        });
      });
    }

    /**
    * Test plain module with dependencies declared in the callback (can only
    * return something if dependency is available)
    * @method  testPlainModuleWithCallbackDependencies
    * @returns {Promise} A promise
    */
    function testPlainModuleWithCallbackDependencies() {
      return asyncTest("Plain module, deps set in callback", function () {
        return request([
          {"name": "bar", "src": "js-test-files/bar.js"}
        ]).spread(function (bar) {
          ok(bar !== undefined, "Module returned.");
          ok(bar.test_value, "Module property accessible.");
          ok(bar.sub_module_1 !== undefined, "Sub Dependency 1 returned.");
          ok(bar.sub_module_2 !== undefined, "Sub Dependency 2 returned.");
          ok(bar.sub_module_1.test_value, "Dependency value accessible.");
          ok(bar.sub_module_2.test_value, "Dependency value accessible.");
          start();
        });
      });
    }

    /**
    * Module with multiple dependencies
    * @method testModuleMultipleDependencies
    * @returns {Promise} A promise
    */
    function testModuleMultipleDependencies() {
      return asyncTest("Multiple dependencies, no sub deps", function () {
        return request([
          {"name": "bum", "src": "js-test-files/bum.js"},
          {"name": "pum", "src": "js-test-files/pum.js"},
          {"name": "wum", "src": "js-test-files/wum.js"}
        ]).spread(function (bum, pum, wum) {
          ok(bum !== undefined, "First module returned.");
          ok(pum !== undefined, "Second module returned.");
          ok(wum !== undefined, "Third module returned.");
          ok(bum.test_value, "Module property 1 accessible.");
          ok(pum.test_value, "Module property 2 accessible.");
          ok(wum.test_value, "Module property 3 accessible.");
          start();
        });
      });
    }

    /**
    * Load multiple dependencies with multiple sub dependencies
    * @method  testModulesWithSubDependencies
    * @returns {Promise} A promise
    */
    function testModulesWithSubDependencies() {
      return asyncTest("Multiple and sub deps, from memory", function () {
        return request([
          {"name": "bar", "src": "js-test-files/bar.js"},
          {"name": "pum", "src": "js-test-files/pum.js"},
          {"name": "wur", "src": "js-test-files/wur.js"}
        ]).spread(function (bar, pum, wur) {
          var baz = document.querySelectorAll(
            "script[src='js-test-files/baz.js']"
          );
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
        });
      });
    }

    /**
    * Load multiple instance of the same module
    * @method testMultipleInstancesOfModule
    * @returns {Promise} A promise
    */
    function testMultipleInstancesOfModule() {
      return asyncTest("Load multiple instances of same dep", function () {
        return request([
          {"name": "mfg", "src": "js-test-files/mfg.js"},
          {"name": "mfg", "src": "js-test-files/mfg.js"},
          {"name": "mfg", "src": "js-test-files/mfg.js"}
        ]).spread(function (a, b, c) {
          var mfg = document.querySelectorAll(
            "script[src='js-test-files/mfg.js']"
          );
          ok(a !== undefined, "Module 1 returned.");
          ok(b !== undefined, "Module 2 returned.");
          ok(c !== undefined, "Module 3 returned.");
          ok(a.test_value, "Module 1 accessible.");
          ok(b.test_value, "Module 2 accessible.");
          ok(c.test_value, "Module 3 accessible.");
          ok(mfg.length === 1, "Same file multiple times served once.");

          start();
        });
      });
    }

    /**
    * Load multiple modules with shared internal and external dependencies
    * @method  testMultipleModulesWithMixedDependencies
    * @returns {Promise} A promise
    */
    function testMultipleModulesWithMixedDependencies() {
      return asyncTest("Multiple deps, inline/external/sub", function () {

        // declare internally
        declare("abc", [{"name": "baz", "src": "js-test-files/baz.js"}],
          function (baz) {
            return {"name": "abc", "sub_module": baz, "test_value": true};
          });
        declare("def", [{"name": "abc", "src": "js-test-files/abc.js"}],
          function (abc) {
            return {"name": "def", "sub_module": abc, "test_value": true};
          });

        return request([
          {"name": "def", "src": "js-test-files/def.js"},
          {"name": "ghi", "src": "js-test-files/ghi.js"}
        ]).spread(function (def, ghi) {
          var baz = document.querySelectorAll(
            "script[src='js-test-files/baz.js']"
          );
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
        });
      });
    }

    /**
    * Load modules by path with sub sub dependencies
    * @method testModuleLoadingByPathWithSubSubDependencies
    * @returns {Promise} A promise
    */
    function testModuleLoadingByPathWithSubSubDependencies() {
      return asyncTest("Load modules, inline, sub-sub-deps", function () {

        // declare inline
        declare("opq", [{"name": "bar", "src": "js-test-files/bar.js"}],
          function (bar) {
            return {"name": "opq", "sub_module": bar, "test_value": true};
          });

        return request([{
          "name": "xyz",
          "src": "js-test-files/sub/xyz.js",
          "dependencies": [{"name": "baz", "src": "js-test-files/baz.js"}]
        }, {
          "name": "opq",
          "src": "js-test-files/opq.js",
          "dependencies": [{"name": "bar", "src": "js-test-files/bar.js"}]
        }]).spread(function (xyz, opq) {
          var baz = document.querySelectorAll(
            "script[src='js-test-files/baz.js']"
          );
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
        });
      });
    }

    /**
     * Test shimming of external dependencies (not using declare). Load 3rd
     * party modules with different AMD testing syntax to make sure all cases
     * pass.
     * @method    testShimExternalDependencies
     * @returns   {Promise} A promise
     */
    function testShimExternalDependencies() {
      return asyncTest("Load and shim external dependencies", function () {

        // ----------------------------------------------------------------

        // module jQuery
        // > module & exports = object > factory
        // > or set as global
        // get
        function getJquery() {
          return request([{
            "name": "jquery",
            "src": "js-test-files/jquery-1.11.0.js",
            "shim": true
          }]);
        }

        // test
        function testJquery($mod) {
          var div = $mod(document).find("div").eq(0)[0].tagName;

          ok($mod !== undefined, "setup jQuery - Modules returned.");
          ok(window.$ === undefined, "setup jQuery - not set as a global.");
          ok(typeof $mod === "function", "setup jQuery - returned as module.");
          ok($mod(document).length === 1, "setup jQuery - $(document) works.");
          ok(div === "DIV", "setup jQuery Random methods (find, eq) work.");
        }

        // ----------------------------------------------------------------

        // module jio
        // > define & define.amd > define([deps], module)
        // > or set as module
        // get
        function getJIO() {
          return request([
            {"name": "storage", "src": "js-test-files/jio.js", "shim": true}
          ]);
        }

        // test
        function testJIO(jIO) {
          ok(jIO !== undefined, "jIO - List of modules returned.");
          ok(window.jIO === undefined, "jIO - Module is not set as a global");
          ok(typeof jIO.createJIO === "function", "jiO - Methods available");
          ok(jIO.hex_sha256 !== undefined, "jIO - Dependencies available");
        }

        // ----------------------------------------------------------------

        // module i18n, testing
        // > exports = object > module.exports = factory
        // > define & define.amd > call define(factory)
        // get
        function getSetup_i18n() {
          return request([{
            "name": "setup_i18n",
            "src": "js-test-files/i18next.js",
            "shim": true
          }]);
        }

        // test
        function testSetup_i18n(i18n) {
          ok(i18n !== undefined, "setup_i18n - Modules returned.");
          ok(window.i18n === undefined, "setup_i18n - Not a global");
          ok(typeof i18n.t === "function", "setup_i18n - Method avaialable");
        }

        // ----------------------------------------------------------------

        // module jquery mobile, testing
        // > get JS and CSS, load jquery internally
        // > define & define.amd > call define(with internal dep)
        // get jQuery Mobile which will load jQuery from location #2
        function getJQM() {
          return request([{
            "name": "mobile",
            "src": "js-test-files/jquery-mobile.latest.js",
            "shim": true
          }, {
            "name": "mobile_css",
            "src": "js-test-files/jquery-mobile.latest.css"
          }]);
        }

        // test jQuery Mobile
        function testJQM(mobile) {
          mobile.autoInitializePage = false;
          mobile.hashListeningEnabled = false;
          mobile.pushStateEnabled = false;
          mobile.ajaxEnabled = false;

          ok(mobile !== undefined, "List of modules returned.");
          ok(window.$ === undefined, "jQuery still not set as global");
          ok(mobile.version !== undefined, "Properties accessible");

        }

        // ----------------------------------------------------------------

        // get uri plugin, which exports to require
        function getURI() {
          return request([{
            "name": "uri",
            "src": "../lib/uri/uri.js",
            "shim": true
          }, {
            "name": "util",
            "src": "../lib/src/util.js"
          }, {
            "name": "template",
            "src": "../lib/uritemplate/uritemplate.js",
            "shim": true
          }]);
        }

        function testURI(uri, util, template) {
          var puny, ipv6, second_level;

          puny = document.querySelectorAll(
            "script[src='js-test-files/punycode.js']"
          );
          ipv6 = document.querySelectorAll(
            "script[src='js-test-files/IPv6.js']"
          );
          second_level = document.querySelectorAll(
            "script[src='js-test-files/SecondLevelDomains.js']"
          );

          ok(uri !== undefined, "Module correctly returned");
          ok(util !== undefined, "Module correctly returned");
          ok(template !== undefined, "Module correctly returned");
          ok(puny !== undefined, "Submodule 1 fetched correctly");
          ok(ipv6 !== undefined, "Submodule 2 fetched correctly");
          ok(second_level !== undefined, "Submodule 3 fetched correctly");

          start();
        }

        return getJquery()
          .spread(testJquery)
          .then(getJIO)
          .spread(testJIO)
          .then(getSetup_i18n)
          .spread(testSetup_i18n)
          .then(getJQM)
          .spread(testJQM)
          .then(getURI)
          .spread(testURI);
      });
    }

    // =========================== API ===================================
    test_loader.runner = function () {
      QUnit.module("module - loader");

      // give requireJS a breather...
      stop();

      return Promise
        .delay(10)
        .then(testRequireJS)
        .then(testPlainModule)
        .then(testPlainModuleFromMemory)
        .then(testPlainModuleWithCallbackDependencies)
        .then(testModuleMultipleDependencies)
        .then(testModulesWithSubDependencies)
        .then(testMultipleInstancesOfModule)
        .then(testMultipleModulesWithMixedDependencies)
        .then(testModuleLoadingByPathWithSubSubDependencies)
        .then(testShimExternalDependencies);
    };

    return test_loader;
  });

}(window, document, Promise));