/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, window, document, Promise, decodeURIComponent, atob */
(function (document, Promise) {
  "use strict";

  /*
   * Internal store
   * @property  {Object}  flux
   */
  var flux = {};

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

  // here we go 
  contentLoaded(window, function () {
    var util, render, storage, hasher;

    /**
     * Retrieve data source or create one
     * @method  getSource
     * @param   {Object}  my_hate_response  HAL+JSON response object
     * @returns {Promise} 
     */
    function getSource(my_hate_response) {

      // need a storage to continue
      flux.store = flux.store || storage.setupStorage(
          hasher.getUrlQueryParam("pointer"),
          my_hate_response
      );

      return flux.store;
    }

    // main handler will be called by hashChange unless on first init
    function runner(my_http_response) {
      return hasher.convertResponseToHate(my_http_response)
        .then(getSource)
        /*
        .then(validateSource)   // allowed access?
        .then(renderSource)     // ... do what?
        .then(getState)         // retrieve state from URLs
        .then(validateState)    // allowed access? > validate what's to be shown?
        .then(renderState)      // render State > calls a UI builder?
        */;
    }

    // error handler
    function handleErrors(my_error) {
      return util.error(my_error);
    }

    // assign variables
    function assignVariables(my_util, my_render, my_hasher, my_storage) {
      util = my_util;
      render = my_render;
      hasher = my_hasher;
      storage = my_storage;

      return Promise.resolve();
    }

    /* ==================================================================== */
    /*                          STARTING POINT                              */
    /* ==================================================================== */
    return request([{
      "name": 'util',
      "src": '../../src/clapp.util.js'
    }, {
      "name": 'render',
      "src": '../../src/clapp.render.js'
    }, {
      "name": 'hasher',
      "src": '../../src/clapp.hasher.js'
    }, {
      "name": 'storage',
      "src": '../../src/clapp.storage.js'
    }])
      .spread(assignVariables)
      .then(runner)
      /*
      .then(getStorageLocation)
      .then(retrieveAppConfiguration)
      .then(initializeApplicationStorage)
      .then(initializeApplication)
      */
      .caught(handleErrors);

  });

}(document, Promise));