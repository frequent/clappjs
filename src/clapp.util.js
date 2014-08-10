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
     * @param   {Object}  obj     Element to attach event to
     * @param   {String}  type    Name of the event
     * @param   {Method}  fn      Callback function to run on event
     * @capture {Boolean} capture useCapture
     */
    util.startListenTo = function (obj, type, fn, capture) {
      if (obj.addEventListener) {
        obj.addEventListener(type, fn, capture || false);
      } else if (obj.attachEvent) {
        obj["e" + type + fn] = fn;
        obj[type + fn] = function () {
          obj["e" + type + fn](window.event);
        };
        obj.attachEvent("on" + type, obj[type + fn]);
      }
    };

    /**
     * Remove an event listener from an element
     * @method  stopListenTo
     * @param   {Object}  obj   Element to attach event to
     * @param   {String}  type  Name of the event
     * @param   {Method}  fn    Callback function to run on event
     * @capture {Boolean} capture useCapture
     */
    util.stopListenTo = function (obj, type, fn, capture) {
      if (obj.removeEventListener) {
        obj.removeEventListener(type, fn, capture || false);
      } else if (obj.detachEvent) {
        obj.detachEvent("on" + type, obj[type + fn]);
        obj[type + fn] = null;
        obj["e" + type + fn] = null;
      }
    };

    /**
     * Promise-optimized Ajax
     * thx: jIO - http://www.j-io.org/ | thx: renderJS - http://bit.ly/1zSQQX5
     * info: oReilly http://bit.ly/1q2HAsn Browser networking
     * @method ajax
     * @param  {Object}   param   Ajax parameters
     * @return {Promise} A Promise
     */
    util.ajax = function (param) {
      var xhr = new XMLHttpRequest();

      function resolver(resolve, reject, notify) {
        var k;

        function handler() {
          var status;

          try {
            switch (xhr.readyState) {
            case 0:
              // UNSENT
              reject(xhr);
              break;
            // case 2: // headers received
            case 4:
              // DONE
              status = xhr.status;

              if (status < 200 || status >= 300) {
                reject(xhr);
              } else {
                resolve(xhr.responseText);
              }
              break;
            }
          } catch (e) {
            reject(e);
          }
        }

        if (typeof param.headers === 'object' && param.headers !== null) {
          for (k in param.headers) {
            if (param.headers.hasOwnProperty(k)) {
              xhr.setRequestHeader(k, param.headers[k]);
            }
          }
        }

        xhr = new XMLHttpRequest();
        xhr.open(param.type || "GET", param.url, true);
        xhr.onreadystatechange = handler;
        //xhr.setRequestHeader('Accept', 'text/html');
        //xhr.withCredentials = true;

        if (typeof param.beforeSend === 'function') {
          param.beforeSend(xhr);
        }

        xhr.send(param.data || null);
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
              return callback(evt);
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
