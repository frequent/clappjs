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
     * Retrieve data source information
     * @method  getSource
     * @param   {Object}  my_hate_response  HAL+JSON response object
     * @returns {Promise} hate response with pointer storage information
     */
    // TODO: don't call this on every runner loop!
    // TODO: should I hack around in hate response? What will be passed around?
    function getSource(my_hate_response) {
      my_hate_response.storage_pointer = hasher.getUrlQueryParam("pointer");

      return Promise.resolve(my_hate_response);
    }

    /**
     * Decode data source information
     * @method  validateSource
     * @param   {Object}  my_hate_response  HAL+JSON response object
     * @returns {Promise} hate response with decoded storage information
     */
    // TODO: do nothing for now
    function validateSource(my_hate_response) {
      return Promise.resolve(my_hate_response);
    }

    /**
     * Initialize storage if there is none
     * @method  renderSource
     * @param   {Object}  my_hate_response  HAL+JSON response object
     * @returns {Promise} hate response
     */
    function renderSource(my_hate_response) {
      // create from pointer

      // initialize flux
      if (flux.store === undefined) {
        return storage.createStorage("flux")
          .then(function (my_store) {
            flux.store = my_store;
            return my_hate_response;
          })
      }

      // default, do nothing
      return Promise.resolve(my_hate_response);
    }

    /**
     * Retrieve data based on url information, this includes structural files
     * and actual data
     * @method  getState
     * @param   {Object}  my_hate_response  HAL+JSON response object
     * @returns {Promise}
     */
    function getState(my_hate_response) {

      // TODO: for the moment, the url is assumed empty
      var url_param_list = [];

      return storage.retrieveData(flux.store, my_hate_response);
    }

    /**
     * Validate retrieved data = decode if necessary?
     * @method  validateState
     * @param   {Object}    my_data   retrieved data
     * @returns {Promise}
     */
    function validateState(my_data) {
      return Promise.resolve(my_data);
    }

    /**
     * Render validated data = generate UI
     * @method  renderState
     * @param   {Object}    my_data   retrieved & validated data
     * @returns {Promise}
     */
    function renderState(my_data) {
      console.log("DONE");
      return Promise.resolve();
    }

    /**
     * Core application loop. Handles everything.
     * @method  runner
     * @param   {Object}  my_http_response    HAL+JSON response object
     * @returns {Promise}
     */
    function runner(my_http_response) {
      return hasher.convertResponseToHate(my_http_response)
        .then(getSource)
        .then(validateSource)
        .then(renderSource)
        .then(getState)
        .then(validateState)
        .then(renderState);
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

      // pass emtpy object as initial http_response
      return Promise.resolve({});
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

      // let this be the only error handler!
      .then(undefined, handleErrors);

  });

}(document, Promise));