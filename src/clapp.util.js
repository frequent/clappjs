/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, Promise, FileReader, declare, XMLHttpRequest, window */
(function (Promise, FileReader) {
  "use strict";

  /* ====================================================================== */
  /*                                UTIL                                    */
  /* ====================================================================== */

  /**
   * =========================================================================
   *                Utility methods required in other modules
   * =========================================================================
   */
  declare("util", [], function () {

    var util = {};

    /**
     * global error handler
     * thx: renderJS - http://bit.ly/1zSQQX5
     * @method    error
     * @param     {Object}    e   Error object
     */
    // TODO: log where?
    util.error = function (e) {
      if (e.constructor === XMLHttpRequest) {
        console.error(e);

        e = {
          readyState: e.readyState,
          status: e.status,
          statusText: e.statusText,
          response_headers: e.getAllResponseHeaders()
        };
      }

      if (e.constructor === Array ||
          e.constructor === String ||
          e.constructor === Object) {
        try {
          e = JSON.stringify(e);
        } catch (exception) {
          console.error(exception);
        }
      }

      console.warn(e);
      //document.getElementsByTagName('body')[0].textContent = e;
    };

    /**
     * parse JSON if response is not automatically parsed by browser
     * @method  parse
     * @param   {Object/String} data   Data to parse
     * @return  {Object} Parsed object
     */
    util.parse = function (data) {
      if (typeof data === "string") {
        return JSON.parse(data);
      }
      return data;
    };

    /**
     * Add an event listener to an element and provide a callback to
     * run when this listener fires
     * @method  startListenTo
     * @param   {Object}  target    Element to attach event to
     * @param   {String}  type      Name of the event
     * @param   {Method}  callback  Callback function to run on event
     * @capture {Boolean} capture   UseCapture
     */
    util.startListenTo = function (target, type, callback, capture) {
      if (target.addEventListener) {
        target.addEventListener(type, callback, capture || false);
      } else if (target.attachEvent) {
        target["e" + type + callback] = callback;
        target[type + callback] = function () {
          target["e" + type + callback](window.event);
        };
        target.attachEvent("on" + type, target[type + callback]);
      }
    };

    /**
     * Remove an event listener from an element
     * @method  stopListenTo
     * @param   {Object}  target    Element to attach event to
     * @param   {String}  type      Name of the event
     * @param   {Method}  callback  Callback function to run on event
     * @capture {Boolean} capture   UseCapture
     */
    util.stopListenTo = function (target, type, callback, capture) {
      if (target.removeEventListener) {
        target.removeEventListener(type, callback, capture || false);
      } else if (target.detachEvent) {
        target.detachEvent("on" + type, target[type + callback]);
        target[type + callback] = null;
        target["e" + type + callback] = null;
      }
    };

    /**
     * Promise-optimized Ajax
     * thx: jIO - http://www.j-io.org/ | thx: renderJS - http://bit.ly/1zSQQX5
     * info: oReilly http://bit.ly/1q2HAsn Browser networking
     * @method ajax
     * @param   {Object}   my_param           Ajax parameters
     * @param   {Integer}  my_resolve_error   Don't break on error
     * @return  {Promise} A Promise
     */
    util.ajax = function (my_param, my_resolve_error) {
      var xhr;

      function resolver(resolve, reject) {
        var status, k, xhr_header_dict, refuse;

        function handler() {
          try {
            switch (xhr.readyState) {
            case 0:
              reject(xhr);
              break;
            // case 2: // headers received
            case 4:
              status = xhr.status;
              refuse = status < 200 || status >= 300;

              if (refuse && status !== my_resolve_error) {
                reject(xhr);
              } else {
                resolve(xhr);
              }
              break;
            }
          } catch (e) {
            reject(e);
          }
        }

        xhr = new XMLHttpRequest();
        xhr_header_dict = my_param.headers || {};
        //xhr.setRequestHeader('Accept', 'text/html');
        //xhr.withCredentials = true;
        xhr.open(my_param.type || "GET", my_param.url, true);

        if (typeof my_param.beforeSend === 'function') {
          my_param.beforeSend(xhr);
        }

        for (k in xhr_header_dict) {
          if (xhr_header_dict.hasOwnProperty(k)) {
            xhr.setRequestHeader(k, xhr_header_dict[k]);
          }
        }

        xhr.onreadystatechange = handler;
        xhr.send(my_param.data || null);
      }

      function canceller() {
        if ((xhr !== undefined) && (xhr.readyState !== xhr.DONE)) {
          xhr.abort();
        }
      }

      //function notifier() {}

      return new Promise(resolver, canceller);
    };

    /**
     * Listener that is removed on first trigger, similar to jQuery "one"
     * thx: renderJS - http://bit.ly/1zSQQX5
     * @method promiseEventListener
     * @method  loopEventListener
     * @param   {Object}  target        DOM Element/Object to set listener
     * @param   {String}  type          Type of event
     * @param   {Boolean} useCapture    Use capture
     * @return  {Promise} Promise Object
     */
    util.promiseEventListener = function (target, type, useCapture) {
      var event_callback;

      function canceller() {
        util.stopListenTo(target, type, event_callback, useCapture);
      }

      function resolver(resolve) {
        event_callback = function (evt) {
          canceller();
          evt.stopPropagation();
          evt.preventDefault();
          resolve(evt);
          return false;
        };

        util.startListenTo(target, type, event_callback, useCapture);
      }
      return new Promise(resolver, canceller);
    };

    /**
     * Set an infinite event listener (promise will never be resolved)
     * Remove listener by cancelling promise.
     * thx: renderJS - http://bit.ly/1zSQQX5
     * @method loopEventListener
     * @param   {Object}  target        DOM Element/Object to set listener
     * @param   {String}  type          Type of event
     * @param   {Boolean} useCapture    Use capture
     * @param   {Function}callback      Callback method
     * @param   {Boolean} allowDefault  Allow to preventDefault
     * @returns {Promise} Promise object
     */
    util.loopEventListener = function (target, type, useCapture, callback,
                                    allowDefault) {
      var event_callback, callback_promise;

      function cancelResolver() {
        if ((callback_promise !== undefined) &&
            (typeof callback_promise.cancel === 'function')) {
          callback_promise.cancel();
        }
      }

      function canceller() {
        if (event_callback !== undefined) {
          util.stopListenTo(target, type, event_callback, useCapture);
        }
        cancelResolver();
      }

      function itsANonResolvableTrap(resolve, reject) {

        event_callback = function (evt) {
          evt.stopPropagation();
          if (allowDefault !== true) {
            evt.preventDefault();
          }
          cancelResolver();
          callback_promise = new Promise()
            .cancellable()
            .then(function () {
              if (callback) {
                return callback(evt);
              }
              // jslint...
              resolve(evt);
            })
            .then(null, function (error) {
              if (!(error instanceof Promise.CancellationError)) {
                canceller();
                reject(error);
              }
            });
        };

        util.startListenTo(target, type, event_callback, useCapture);
      }
      return new Promise(itsANonResolvableTrap, canceller);
    };

    /**
     * Generate an internal utility UUID
     * @method    uuid
     * @returns   {String}  UUID
     */
    util.uuid = function () {
      function S4() {
        return ('0000' + Math.floor(
          Math.random() * 0x10000 /* 65536 */
        ).toString(16)).slice(-4);
      }
      return "id_" + S4() + S4() + "-" + S4() + "-" + S4() + "-"
          + S4() + "-" + S4() + S4() + S4();
    };

    /**
     * Delay an event from triggering for a set amount of time
     * This will run through loopEventLister and start/stopListen to
     * @method  delayedEventTrigger
     * @param   {Integer} ms  Delay in milliseconds
     * @param   {Object}  target        DOM Element/Object to set listener
     * @param   {String}  type          Type of event
     * @param   {Boolean} useCapture    Use capture
     * @param   {Function}callback      Callback method
     * @param   {Boolean} allowDefault  Allow to preventDefault
     * @returns {Promise} A promise
     */
    util.delayedEventTrigger = function (ms, target, type, useCapture,
                                              callback, allowDefault ) {
      var uuid, tagged_type, wrapped_callback;

      uuid = util.uuid();
      tagged_type = type + "." + uuid;
      wrapped_callback = function (evt) {
        var len, identifier, pending_promise;

        len = evt.type.split(".");
        identifier = len[len - 1];
        pending_promise = util[identifier];

        // this terminates a pending promise in case a new event comes in
        // before ms has passed!
        if (pending_promise) {
          pending_promise.cancel();
          delete util[identifier];
        }

        util[uuid] = Promise
          .cancellable()
          .delay(ms)
          .then(callback);

        return util[uuid];
      };

      return util.loopEventListener(
        target,
        tagged_type,
        useCapture,
        wrapped_callback,
        allowDefault
      );
    };

    /**
     * Wrap readAsText into a promise
     * thx: renderJS - http://bit.ly/1zSQQX5
     * @method    promiseReadAsText
     * @param     {String}  file    Filename to read (asText)
     * @returns   {Promise} Promise object
     */
    util.promiseReadAsText = function (file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (evt) {
          resolve(evt.target.result);
        };
        reader.onerror = function (evt) {
          reject(evt);
        };
        reader.readAsText(file);
      });
    };

    return util;
  });

}(Promise, FileReader));
