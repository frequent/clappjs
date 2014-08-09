/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, window, document, Promise */
(function (document, Promise) {
  "use strict";

  /**
   * Retrieve storage configuration path set on clappsjs
   * Thx http://requirejs.org
   * @method fetchPath
   * @param   {String} attribute  Name of attribute to find
   * @return  {String} path
   */
  function fetchPath (attribute) {
    var i, len, path, head, script_list;

    // WARNING: DOM ACCESS
    head = document.head || document.getElementsByTagName('head')[0];
    script_list = head.getElementsByTagName('script');

    for (i = 0, len = script_list.length; i < len; i += 1) {
      path = script_list[i].getAttribute(attribute);
      if (path) {
        return path;
      }
    }
  };

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

  /* ====================================================================== */
  /*                          STARTING POINT                                */
  /* ====================================================================== */

  contentLoaded(window, function () {

    // helper: fetch storage module
    function getStorage() {
      return request([
        {
          "name": "storage",
          "src": "lib/jio/jio.js",
          "shim": true
        }
      ]);
    }

    function what(jIO) {

    }

    // START:
    getStorage()
      .then(what)
      .catch(console.log);
    
  });

}(document, Promise));