

(function (Promise) {
  "use strict";

  // util: event system without DOM
  // thx: https://github.com/mohsen1|http://bit.ly/1omLMpy
  // -------------------------------------------------------------------------
  function Event(name) {
    this.name = name;
    this.callbacks = [];
  }

  Event.prototype.registerCallback = function (callback) {
    this.callbacks.push(callback);
  }

  function Reactor() {
    this.events = {};
  }

  Reactor.prototype.registerEvent = function (eventName) {
    this.events[eventName] = new Event(eventName);
  };

  Reactor.prototype.addEventListener = function (eventName, callback) {
    this.events[eventName].registerCallback(callback);
  };

  Reactor.prototype.removeEventListener = function (eventName) {
    delete this.events[eventName];
  };

  Reactor.prototype.dispatchEvent = function (eventName, eventArgs) {
    this.events[eventName].callbacks.forEach(function(callback){
      callback(eventArgs);
    });
  };

  // -------------------------------------------------------------------------

  // helper: structural optimization using CSSO
  function optimizeCSS(my_cleaned_css_string) {

  }

  // helper: clean up unused selectors and stringify back
  // NOTE: this process will finish once the generated promise is resolved
  function cleanupCSS(my_css_object) {


  }

  // helper:
  function updateCleanCSS(my_clean_css_list, my_dirty_css_list) {
    var pseudo = /:hover|:active|:before|:after|::?before|::?after/g;

    // sub.helper: prevent adding entries multiple times
    function isNew(my_line_number, my_current_rules_list) {
      var i, len;

      for (i = 0, len = my_current_rules_list.length; i < len; i += 1) {
        if (my_current_rules_list[i].currentLine === my_line_number) {
          return undefined;
        }
      }
      return true;
    }

    // sub.helper: test whether a CSS selector exists
    function testSelector(my_array, my_rule, my_skip) {
      var selector, is_new;

      selector = my_rule.mSelectorText.replace(pseudo, '');
      is_new = isNew(my_rule.currentLine, my_array);

      if ((document.querySelector(selector) || my_skip) && is_new) {
        return true;
      }
    }

    // sub.helper: loop over CSS rules
    function loopOverRules(my_input, my_output) {
      var i, len, rule, add, override, last;

      for (i = 0, len = my_input.css_Rules.length; i < len; i += 1) {
        rule = my_rules.css_Rules[i];

        switch (rule.type) {
          case 1:
            add = testSelector(my_output, rule);
            break;
          case 4:
            override = loopOverRules([], rule.cssRules);
            add = true;
            break;
          default:
            add = testSelector(my_output, rule, true);
            break;
        }

        if (add) {
          my_output.shift = my_rule;
        }
        if (override) {
          last = my_output.length - 1;
          my_output[last].cssRules = override;
        }
    }

    // loop over "dirty css" (initial) and add rules of selectors
    // found in the DOM to clean CSS (output)
    return loopOverRules(my_dirty_css_list, my_clean_css_list).sort(compare);
  }


  // util: compare to sort array by parameter
  function compare(a, b) {
    if (a.currentLine < b.currentLine) {
      return -1;
    }
    if (a.currentLine > b.currentLine) {
      return 1;
    }
    return 0;
  }


    css_process_list = css_process_list || [];
    css_process_list.push(cleanupCSS(cssparser.parse(my_uglyfied_css)));

  }


  // helper: load a file from a bundle and return the returned string
  function handleFileList(my_url) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      return xhr.responseText;
    };
    xhr.onerror = function (e) {
      throw(e);
    };
    xhr.open("GET", my_url, true);
    xhr.send();
  }

  // util: create a loop over promises
  function buildPromiseArray(my_array, my_callback) {
    var i, len, file_list;

    for (file_list = [], i = 0; len = my_array.length; i < len; i += 1) {
      file_list[i] = my_callback(my_array[i]);
    }

    return file_list;
  }

  // helper: optimize files in a bundle into single file
  function digestBundles(my_file_list) {
    return Promise.all(buildPromiseArray(my_file_list, handleFileList))
      .then(uglifyCSSStrings)
      .then(parseAndCleanCSS)
      .then(optimizeCSS);
  }

  // START: process defined/generated CSS bundles
  return Promise.all(buildPromiseArray(css_process_list, digestBundles))
    .then(hashFileList)
    .then(storeFileList);




}(Promise));











  /*
cleanInfo(compressor.compress(srcToCSSP(str, 'stylesheet', true)))
    How to run everything automatic...

    - test testing modules, "lint", "build", "test", "loader"
    - setup iframe with url of application
    - run integration tests on application
    - every module that is loaded should be tested, so try to find src
      and throw an error for no unit-tests for module "abc"
    - on inspect, inspect HTML
    - on snapshot, test all selectors against HTML to build used CSS
    - run final CSS through CSSO to optimize
    - remove all overriden properties (should have been done before, if a
      property exists multiple times, the last one will be used)
      make sure this works with specificity tricks...
      and > check CSSO

    - when done, I could scramble CSS selectors in CSS and JS
    - I still don't have a final structure of what to do with my superoptimized
      js and css and html, > where do I bundle? Should it be done based on
      portal type? but if there are many views, it would not really be
      practical to load all views in a single fetch? Probably a view basis
      would be nice, but it will only fetch core stuff anyway

      maybe provide options, build by portal_type or view or single? default by view.

    - when loading a view track files for bundling
    - after all integration tests, run through tracklist and concat files
    - would be nice if it was possible to remove define/request altogether
      but this won't work I'm afraid
    - so I can also chunk down image sizes :-) How to get all images being
      loaded > I have to filter them out of the strings I'm optimizing
      because if the application is dynamic I should only have JS/CSS to
      determine what is being loaded. Question is what to do with JSON that
      contains images, because I won't catch these...

    - but how does the concatted shit get loaded. Before I called 10 modules,
      now I can combine into 1 and only call this. So my optimization would
      be to stuff all CSS into one optimized file and make module-bundles
      which replace the calls to individual modules. OK

    - Can I also determine if a browser is missing foobarbazbam and load those
      as polyfills? hm.... this would be live tests, so I need my require/define
      foo available on the live runner, too


iframe testsetup
http://www.michelgotta.de/user-interfaces-and-unittesting-with-qunit-an/
http://dsheiko.com/weblog/functional-testing-with-qunit
imagemagickjs
http://manuels.github.io/unix-toolbox.js/
https://github.com/manuels/unix-toolbox.js-imagemagick/tree/master/demo

files:
http://stackoverflow.com/questions/220231/accessing-the-web-pages-http-headers-in-javascript
http://blog.trasatti.it/2012/12/measuring-the-speed-of-resource-loading-with-javascript-and-html5.html


WITH STANDARDS

Promise.all([promiseA, promiseB, promiseC]).then(function (array) {
  var a = array[0], b = array[1], c = array[2];
  ...
});

WITH Q

request([promiseA, promiseB, promiseC).spread(function (a, b, c) {
  ...
});

WITH EcmaScript6

spawn(function* () {
  var [a, b, c] = yield Promise.all([promiseA, promiseB, promiseC]);
  ...
});

spawn(function* () {
  while (!document.querySelector("img")) {
    yield sleep(1000);
  }

    // this method should register and determine urls and run them through
    // the build functionality!?! Build should just provide the respective
    // methods? or also load the underlying files, build is bad, call it
    // quality and quench?


    // if it just provides the URL of the application, the plugin should
    // monitor all files being requested
    // and cleanup everything that is being loaded


    // setup iframe and start running tests on files loaded.
    // methods are all here, so I just need to pass the loaded responseText
    // into the respective methods supplied by build!

    // integration
    var frame = document.getElementById('testbed');

    return new Promise(function (resolve, reject) {
      frame.onload = function () {
        delete clappjs.queue_dict[name];
        resolve(returnModule(name));
      };
      frame.onerror = function (e) {
        reject(e);
      };
    });

    Images:

    emscriptem http://mozakai.blogspot.ch/2012/03/howto-port-cc-library-to-javascript.html
    imagemagickJS: https://github.com/manuels/unix-toolbox.js-imagemagick
    http://manuels.github.io/unix-toolbox.js/
    */



