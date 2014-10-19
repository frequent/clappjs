/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, document, Promise */
(function (window, document, Promise) {
  "use strict";

  /**
   * Run the tests defined in the runner method of each test module
   * TODO: Should pass an option dict here specifying URL scheme, etc.
   * @method  runTestModules
   * @param   {Array}   my_module_list    List of requested modules
   * @returns {Promise} A promise
   */
  function runTestModules(my_module_list) {
    var i, len, test_list;

    for (i = 0, test_list = [], len = my_module_list.length; i < len; i += 1) {
      test_list[i] = my_module_list[i].runner({});
    }

    return Promise.all(test_list);
  }

  /**
   * Append retrieved test files to DOM and run tests on them
   * @method  declareAndRunTestModules
   * @param   {Array}   my_test_file_list   List of strings to append to DOM
   * @returns {Promise} A promise
   */
  function declareAndRunTestModules(my_test_file_list) {
    var i, len, script, fragment, script_dict, request_list, arr;

    request_list = [];
    fragment = document.createDocumentFragment();
    for (i = 0, len = my_test_file_list.length; i < len; i += 1) {
      script_dict = my_test_file_list[i];

      if (script_dict.src) {
        arr = script_dict.url.split("/");
        script = document.createElement("script");
        script.type = "text/javascript";
        script.text = script_dict.src;
        request_list.push({"name": arr[arr.length - 1]});
        fragment.appendChild(script);
      }
    }

    // this will declare modules
    document.getElementsByTagName('head')[0].appendChild(fragment);

    return request(request_list)
      .then(runTestModules);
  }

  /**
   * Fetch module scripts currently in the DOM
   * @method    fetchModulesAndTestsFromDOM
   * @param     {String}  my_tag_name   Tag name of the module to fetch
   * @returns   {Array}   List of found modules
   */
  function fetchModulesAndTestsFromDOM(my_tag_name) {
    var i, len, url, pass, element_list, module_list, test_module_list;

    element_list = document.getElementsByTagName(my_tag_name);
    module_list = [];
    test_module_list = [];

    for (i = 0, len = element_list.length; i < len; i += 1) {
      switch (my_tag_name) {
      case "script":
        url = element_list[i].getAttribute("src");
        break;
      case "link":
        pass = true;
        url = element_list[i].href;
        break;
      }

      // mh...
      if (pass || url.indexOf("clapp") > 0) {
        module_list.push(url);

        // TODO: no?
        if (my_tag_name === "script") {
          test_module_list.push(url.replace("../src/", "../test/src/test."));
        }
      }
    }

    return [module_list, test_module_list];
  }

  /**
   * Cross-browser wrapper for DOMContentLoaded
   * Thx Diego Perini - http://javascript.nwbox.com/ContentLoaded/
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

  // START:
  contentLoaded(window, function () {

    // I may have to seperate between test and build with test running only
    // lint and test, while build is running lint, test, build? But in case
    // of the loader for example, what do I do with all the crap I'm
    // requesting to test it's functionality
    // >>>>> integration runs inside iframe!

    // So a test to run is async module now, what would be nice is to have
    // a way to dump modules which will unload them from internal dicts. This way
    // after running a test, the module could be dumped again. Question whether
    // this is super-usable other than inside tests?
    // >>>>> think about revoke(["[module_name"]).then...

    // I will need tests for util and lint, so make them!
    // also need more tests for loader with all options, (just "foo",
    // "name": "foo", module not found, ... still too buggy
    // I need to add tests for what is being returned, a wrong module name
    // should throw an error
    // recursion? test or stupidity
    // problem with shimed subdependencies leaking on global!!!!
    // probably done through JQM, but jIO also leaks RSVP... fuck!
    // >>>> do tests for util and lint plus missing tests for load

    // so... URLs are already a pain, so there must be something managing
    // URLs as Romain says, no hardcoded URLs anywhere! Normally this would
    // be done by the server, but thinking no-server means data being sent
    // should either be HATE or it will be HATE-ed when it arrives. Sort of
    // cheating, but the application can say "I only digest and respond in
    // HATE", so whatever is received (and sent) will be properly encoded.

    // This means my hasher module should also manage responses? received from
    // storage and map out a HATE response to be digested based on some rules
    // (which Romain) has on server and I keep on client (it's a free web...)
    // >>>>>> concept this!

    // regarding testing, I'm more or less through with it... so question is
    // what comes next, build? Or integrate the test module somewhere? For me
    // test.html should be the starting point for... tests, so actually I'm
    // ok. Although I would like everything to be inside modules, so what
    // is DONE here could possibly be a test module, which is requested here
    // just two methods, though until we do integration. Mh...

    // >>>>>> integration tests! Start with parsing the ugly Selenium table
    // >>>>>> make test a module, which is fetched on test.js?!

    // how is handling of content to be done? Do I have module that can
    // instantiate? And have methods? I could make a widget into a module
    // that returns a wrapper and some methods as before. Depending on inputs
    // the instance will be different but perform the same behavior?
    // why not.
    
    // Then the question is regarding communication between modules, how calls
    // what from whom? Because theoretically I can have autonomous units, too
    // which communicate like renderjs. this would mean attaching behaviors
    // not to the global MEMORY object, but to some lower object from which
    // they can be cleaned up again? revoke? what i'm doing now anyway. So
    // what's the point... mh.

    // so if we start to load an application, test should be wrapped up.

    // the application will need to instantiate and then fetch something to
    // render based on the url "#" > but it should require a login to see
    // if it works, so I should show a login page if not logged in or
    // somthing, the only have ... something like contacts

    // to display anything it is necessary to fetch definition, so decide
    // on a first "app": foo, "key" = contacts and try to fetch from localhost
    // first. For this I need to have jIO setup and method provided

    // >> try to get storage definition, which requires active login with x
    // >> setup storage
    // >> setup hash_listener to assemble first call to storage

    // Question remains, where do I get my first storage configuration
    // I could require a login somewhere, but this is also crap. Normally
    // if I want to access my data, I log in. Log in with whome? Login with
    // FB to access DropBox? Or login somewhere to access storage information
    // I can make an ajax request anywhere to get the login data, so this
    // might very well be the first file to fetch from the storage
    // (storage_definition_module), so when I go to the site and I'm not
    // logged in I return the login page and after user logs in = oauths,
    // I request a file via Ajax on location x to get the storage configuration
    // mh.

    // So I go to page, want to request something, no/expired token, so I need
    // to get one via oauth. When I have it I can request something which
    // may be my storage configuration for setup, then since I have token
    // I can access file from storage too

    // or WTF: http://static.guim.co.uk/sys-images/Guardian/Pix/pictures/2014/8/12/1407847256310/a1200780-89c4-4326-9041-691fdf6b535b-460x276.jpeg

    // So I go to page, want to start, no/expired token, so I need to get one
    // to access the remote drive/indexDB? I ouath, have token and can make
    // request to retrieve storage information, setup storage and access

    // Another question is whether to run the whole app inside a webworker?
    // using safejs? This way it would be tamper-safe, because the worker will
    // crash when trying to access anything not part of the API

    // So user defines his storage and then the definition is encoded
    // with password. So when accessing the storage definition the password
    // is needed to decipher. If user forgets he has to re-create his
    // storage definition. Works for simple use cases (= recreateable definition)
    // Question is where to store the definition: localStorage? indexDB/Shim?
    // Or file? But file needs to be accessed/loaded, so I can't work offline
    // unless the request is cached? Mh. Why not?

    // >>> start with unencoded defintion and localstorage, which should be
    //     setup based on what is in the definiton (no hardcoding storages..)
    // >>> fetch definition from file, so it can be retrieved via Ajax from
    //     somewhere else, too. Must also be possible to create this file
    //     from developer side, so this would eventually require a JIO operation
    //     to store the file somewhere accessible

    // >>> I could have a buildstorage, which saves files in "build" version?

    // let this be the start of the chain with the only caught :-)
    request([
      {"name": "lint", "src": "../src/clapp.lint.js"}
    ])
    .spread(function (linter) {
      var module_list = fetchModulesAndTestsFromDOM("script");
      return Promise.all([
        linter.jsLint(module_list[0]),
        linter.jsLint(module_list[1])/*,
        linter.cssLint(fetchModulesAndTestsFromDOM("link")[0]),
        linter.html5Lint() */
      ]);
    })
    .then(function (my_linted_section_list) {
      var test_module_list = my_linted_section_list[1];

      return declareAndRunTestModules(test_module_list);
    })
    .then(function () {

    })
    .caught(function (error) {
      console.log(error);
      return error;
    });

  });

}(window, document, Promise));

