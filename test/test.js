/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, document */
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

  // START:
  contentLoaded(window, function () {

    request([
      {"name": "lint", "src": "../src/clapp.lint.js"}
    ])
    .spread(function (linter) {
      var js_lint_list;

      js_lint_list = [
        "../src/clapp.util.js",
        "../src/clapp.loader.js",
        "../src/clapp.lint.js"
      ];

      // Start "Autopilot"
      return linter.jsLint(js_lint_list)
        .then(function (x) {
          console.log(x);
        })
        .catch(function (e) {
          console.log(e);
        });
    });

  });

}());

