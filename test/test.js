/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global Promise, XMLHttpRequest, css_process_list, dom_snapshot_list */
// files to lint (JS/CSS)
var toJSLint = [

  // test modules
  "modules/clapp/test.clapp.js",
  "modules/jslint/test.jslint.js",
  "modules/csslint/test.csslint.js",
  "modules/uglifyjs/test.uglifyjs.js",
  "modules/uglifycss/test.uglifycss.js",

  // script files
  "../src/clapp.js"
];

var toCSSLint = [
  "css/test.css"
];

var toUglifyJS = [
  "../src/clapp.js"
];

var toUglifyCSS = [
  "js/jquery-mobile/jquery-mobile.latest.css"
];

var transferToCSSO = [];



var css_process_list;

css_process_list = [
  [
    "js/jquery-mobile/jquery-mobile.latest.css"
  ]
];

