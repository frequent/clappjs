/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, Promise, FileReader, declare, XMLHttpRequest, window,
  document */
(function (Promise, FileReader, document) {
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
      * @description | Extend an object with another object
      * @method      | extend
      * @param       | {object}, my_base_dict,    Base object
      * @param       | {object}, my_extend_dict,  Extension object
      * @returns     | {object},  extended object
      **/
    util.extend = function (my_base_dict, my_extended_dict) {
      var param;

      for (param in my_extended_dict) {
        if (my_extended_dict.hasOwnProperty(param)) {
          my_base_dict[param] = my_extended_dict[param];
        }
      }
      return my_base_dict;
    };

    /**
     * @description | Property type detection. Use either by 
     * @description | typeOf(my_value) > returns [object ...]
     * @description | typeOf(my_value, "string") > returns true
     * @thanks      | requirejs, http://requirejs.org/
     * @thanks      | uritemplate, https://github.com/fxa/uritemplate-js
     * @method      | typeOf
     * @param       | {},        my_value,  Value to be tested
     * @param       | {string},  my_type,   Type to test for
     * @returns     | {boolean}, true/undefined
     **/
    util.typeOf = function (my_value, my_type) {

      // handle switch 
      if (my_type === undefined) {
        return Object.prototype.toString.call(my_value);
      }

      // handle single tests
      if (Object.prototype.toString.call(my_value) ===
          '[object ' + my_type + ']') {
        return true;
      }
    };

    /**
      * @description | global error handler
      * @thanks      | renderJS - http://bit.ly/1zSQQX5
      * @method      | error
      * @param       | {object}, my_error,   Error object
      * @returns     | {object}, error thrown
      **/
    // TODO: log where?
    util.error = function (my_error) {
      switch (my_error.constructor) {
      case "XMLHttpRequest":
        my_error = {
          readyState: my_error.readyState,
          status: my_error.status,
          statusText: my_error.statusText,
          response_headers: my_error.getAllResponseHeaders()
        };
        break;
      case "Array":
      case "String":
      case "Object":
        try {
          my_error = JSON.stringify(my_error);
        } catch (exception) {
          console.error(exception);
        }
        break;
      }

      console.warn(my_error);
      document.getElementsByTagName('body')[0].textContent = my_error;
    };

    /**
      * @description | Generate an internal utility UUID
      * @method      | uuid
      * @returns     | {string}  UUID
      **/
    // TODO: remove once delayed trigger is fixed
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
      * @description | parse JSON if not automatically parsed (chrome)
      * @method      | parse
      * @param       | {object/String}, data,   Data to parse
      * @return      | {object}, Parsed object
      **/
    util.parse = function (data) {
      if (util.typeOf(data, 'String')) {
        return JSON.parse(data);
      }
      return data;
    };

    /**
      * @description | Add an event listener to an element and provide a 
      * @description | callback to run when this listener fires
      * @method      | startListenTo
      * @param       | {object},  target,    Element to attach event to
      * @param       | {string},  type,      Name of the event
      * @param       | {method},  callback,  Callback function to run on event
      * @param       | {boolean}, capture,   UseCapture
      * @returns     | {promise}, resolving with ...
      **/
    // TODO: Fix & Test!
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
      * @description | Remove an event listener from an element
      * @method      | stopListenTo
      * @param       | {object},  target,    Element to attach event to
      * @param       | {string},  type,      Name of the event
      * @param       | {method},  callback,  Callback function to run on event
      * @param       | {Boolean}, capture,   UseCapture
      * @returns     | {Promise}, resolving with ...
      **/
    // TODO: Fix&Test!
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
      * @description | Promise-optimized Ajax
      * @thanks      | jIO - http://www.j-io.org/
      * @thanks      | renderJS - http://renderjs.org/
      * @method      | ajax
      * @param       | {object},   my_param,         Ajax parameters
      * @param       | {integer},  my_resolve_error, Don't break on error
      * @return      | {promise},  resolving with ajax response
      **/
    // TODO: Broken, fix and test!
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

        if (util.typeOf(my_param.beforeSend, 'Function')) {
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
      * @description | Listener that is removed on first trigger, 
      * @description | similar to jQuery "one"
      * @thanks      | renderJS - http://renderjs.org
      * @method      | promiseEventListener
      * @method      | loopEventListener
      * @param       | {object},  target,      DOM Object to set listener
      * @param       | {string},  type,        Type of event
      * @param       | {boolean}, useCapture,  Use capture
      * @return      | {promise}, resolving with...
      **/
    // TODO: also broken :-(
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
      * @description | Set an infinite event listener (promise will never be 
      * @description | resolved) Remove listener by cancelling promise.
      * @thanks      | renderJS - http://renderjs.org/
      * @method      | loopEventListener
      * @param       | {object},  target,       DOM Object to set listener
      * @param       | {string},  type,         Type of event
      * @param       | {boolean}, useCapture,   Use capture
      * @param       | {method},  callback,     Callback method
      * @param       | {boolean}, allowDefault, Allow to preventDefault
      * @returns     | {promise}, resolving with ...
      **/
    // TODO: test
    util.loopEventListener = function (target, type, useCapture, callback,
                                    allowDefault) {
      var event_callback, callback_promise;

      function cancelResolver() {
        if (callback_promise !== undefined &&
            util.typeOf(callback_promise.cancel, 'Function')) {
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
      * @description | Delay an event from triggering for a set amount of time
      * @description | This will run through loopEventLister and start/
      * @description | stopListen to
      * @method      | delayedEventTrigger
      * @param       | {integer}, ms,           Delay in milliseconds
      * @param       | {object},  target,       DOM Object to set listener
      * @param       | {string},  type,         Type of event
      * @param       | {boolean}, useCapture,   Use capture
      * @param       | {method},  callback,     Callback method
      * @param       | {boolean}, allowDefault, Allow to preventDefault
      * @returns     | {promise}, resolving with ...
      **/
    // TODO: Use version recently done on other project!
    util.delayedEventTrigger = function (ms, target, type, useCapture,
                                              callback, allowDefault) {
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
      * @description | Wrap readAsText into a promise
      * @thanks      | renderJS - http://renderjs.org/
      * @method      | promiseReadAsText
      * @param       | {string},  file,    Filename to read (asText)
      * @returns     | {promise}, resolving with ...
      **/
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

}(Promise, FileReader, document));
