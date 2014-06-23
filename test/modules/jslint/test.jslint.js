/*jslint indent: 2 */
/*global module, test, ok, stop, start, XMLHttpRequest, JSLINT, toLint */
(function () {
  "use strict";

  module("JSLINT");

  /**
   * JSLint a list of files
   * Thx Tristan - setup jslint in Qunit - http://bit.ly/1qDWNVy
   * @method  jsLint
   * @param   {String} url  Url of file to lint
   */
  function jsLint(url) {
    test(url, 0, function () {
      stop();
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        start();
        JSLINT(xhr.responseText, {});
        var data = JSLINT.data(), i;
        for (i = 0; i < data.errors.length; i += 1) {
          ok(false, url + ":" + data.errors[i].line + ":" +
             data.errors[i].character + ": " + data.errors[i].evidence + "\n" +
             data.errors[i].reason);
        }
      };
      xhr.onerror = function () {
        start();
        ok(false, "Unable to JSLINT");
      };
      xhr.open("GET", url, true);
      xhr.send();
    });
  }

  toJSLint.forEach(jsLint);

}());