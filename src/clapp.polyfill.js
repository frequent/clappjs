/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, document, declare */
(function (window, document) {
  "use strict";

  /* ====================================================================== */
  /*                              POLYFILL                                  */
  /* ====================================================================== */

  /**
   * =========================================================================
   *               Try to save what's possible for IE8-9, Android 2.x
   * =========================================================================
   */
  declare("polyfill", [
    {"name": 'shim', "src": '../lib/es5shim/es5shim.js'}
  ], function () {

    // Console-polyfill. MIT license.
    // https://github.com/paulmillr/console-polyfill
    // Make it safe to do console.log() always.
    (function(con) {
      var prop, method, empty, dummy, properties, methods;

      empty = {};
      dummy = function() {};
      properties = 'memory'.split(',');
      methods = (
        'assert,clear,count,debug,dir,dirxml,error,exception,'
        'group,groupCollapsed,groupEnd,info,log,markTimeline,profile,' +
        'profiles,profileEnd,show,table,time,timeEnd,timeline,timelineEnd,'+
        'timeStamp,trace,warn'
      ).split(',');

      while (prop = properties.pop()) {
        con[prop] = con[prop] || empty;
      }
      while (method = methods.pop()) {
        con[method] = con[method] || dummy;
      }
    })(this.console = this.console || {}); // Using `this` for web workers.

  });

}());
