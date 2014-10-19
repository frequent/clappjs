/*
 * used from i18next v1.7.3
 * http://i18next.com
 * 1. exports > exports
 * 2. define > define
 */
(function (root, factory) {

  if (typeof exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  }

}(this, function () {
  var setup_i18n = {};

  setup_i18n.prop = "bar";
  setup_i18n.meth = function () {};

  return setup_i18n; 

}));