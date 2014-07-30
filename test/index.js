/*jslint indent: 2, node: true */
"use strict";

// requireJS - necessary to make sure config is set before require call are
// made - thx http://bit.ly/1n4lbst
var require = {
  "paths": {
    "req": 'js/req',
    "dep": 'js/dep'
  }
};

// files to lint (JS/CSS)
var toJSLint = [

  // test modules
  "modules/clapp/test.clapp.js",

  // script files 
  "../src/clapp.js"
];

var toCSSLint = [
  "css/test.css"
];

/*
var fileList = [
  // root
  "index.html",
  "index.js",
  "license.txt",
  "tests.html",
  "tests.manifest",
  // src
  "src/hasOwnProperty.js",
  "src/toString.js",
  "src/isObject.js",
  // wrapper
  "src/wrapper/footer.js",
  "src/wrapper/header.js",
  // tests
  "tests/jslint.js",
  "tests/MYLIB.js"
];

var toConcat = [];
*/