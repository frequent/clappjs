/*jslint indent: 2 */
/*global module, test, ok, stop, start, XMLHttpRequest, JSLINT, toLint */
(function () {
  "use strict";

  module("csslint");

  /**
   * CSS Lint a list of files
   * Thx Tristan - setup jslint in Qunit - http://bit.ly/1qDWNVy
   * @method  cssLint
   * @param   {String} url  Url of file to lint
   */
  function cssLint(url) {
    test(url, 0, function () {
      stop();
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        start();
        var i, data = CSSLint.verify(xhr.responseText);

        for (i = 0; i < data.messages.length; i += 1) {
          ok(
              false,
              url +
                " line " + data.messages[i].line +
                ", col " + data.messages[i].col + ":" +
                data.messages[i].type + ": " +
                data.messages[i].evidence + "\n" +
                data.messages[i].reason
          );
        }
      };
      xhr.onerror = function () {
        start();
        ok(false, "Unable to CSSLINT");
      };
      xhr.open("GET", url, true);
      xhr.send();
    });
  }

  toCSSLint.forEach(cssLint);

}());