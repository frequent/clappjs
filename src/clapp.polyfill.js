/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global declare */
(function () {
  "use strict";

  /* ====================================================================== */
  /*                            POLYFILL                                    */
  /* ====================================================================== */

  /* ====================================================================== */
  /*                          Utility Functions                             */
  /* ====================================================================== */

  /**
   * =========================================================================
   *                          EXPOSED METHODS
   * =========================================================================
   */
  declare("polyfill", [
    {"name": 'shim', "src": '../lib/es5shim/es5shim.js'}
  ], function () {

    /**
      * @description | Console-polyfill. MIT license. Make it safe to do 
      * @description | console.log() always
      * @thanks      | https://github.com/paulmillr/console-polyfill
      * @method      | shimConsoleLog
      * @param       | {object},  my_console,  window.console
      **/
    function shimConsoleLog(my_console) {
      var prop, method, empty, dummy, properties, methods;

      empty = {};
      dummy = function () {};
      properties = 'memory'.split(',');
      methods = (
        'assert,clear,count,debug,dir,dirxml,error,exception,' +
        'group,groupCollapsed,groupEnd,info,log,markTimeline,profile,' +
        'profiles,profileEnd,show,table,time,timeEnd,timeline,timelineEnd,' +
        'timeStamp,trace,warn'
      ).split(',');

      // NOTE: jslint requires "===" vs "="
      while (prop = properties.pop()) {
        my_console[prop] = my_console[prop] || empty;
      }
      while (method = methods.pop()) {
        my_console[method] = my_console[method] || dummy;
      }
    }

    // this module returns nothing, but triggers all applicable shims
    // Using `this` for web workers.  
    shimConsoleLog(this.console || {});
  });

}());
