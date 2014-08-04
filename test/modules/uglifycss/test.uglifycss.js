/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global module, test, ok, stop, start, XMLHttpRequest, console, uglifycss,
 toUglifyCSS, JS_Parse_Error, DefaultsError, Error, transferToCSSO */
(function () {
  "use strict";

  /**
   * Done using UglifyCSS
   * Port of YUI CSS Compressor to NodeJS
   * Author: Franck Marcia - https://github.com/fmarcia
   * MIT licenced
   */

  module("uglifycss");

  /**
   * run uglification on a CSS file
   * @method  uglify
   * @param   {String}  code      The code of the file to uglify
   * @param   {Object}  options   Options for uglify
   * @returns {String}  uglified code
   */
  function uglify(code, options) {
    return uglifycss.processString(code, options);
  }

  /**
   * generate an error message to display in Qunit
   * @method  showUglyCSSError
   * @param   {Object}  e     Error object thrown
   * @param   {String}  input String being uglified on which error occurred
   * @return  {String}  HTML  Error message
   */
  function showUglyCSSError(e, input) {
    var message, lines, line;

    function encodeHTML(str) {
      return str + ''
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
    }

    // TODO: not sure these errors will be correct
    if (e instanceof JS_Parse_Error) {
      lines = input.split('\n');
      line = lines[e.line - 1];

      message = 'Parse error: <strong>' + encodeHTML(e.message) +
        '</strong>\n' + '<small>Line ' + e.line + ', column ' + e.col +
          '</small>\n\n' + (lines[e.line - 2] ? (e.line - 1) + ': ' +
          encodeHTML(lines[e.line - 2]) + '\n' : '') + e.line + ': ' +
        encodeHTML(line.substr(0, e.col)) + '<mark>' +
        encodeHTML(line.substr(e.col, 1) || ' ') + '</mark>' +
        encodeHTML(line.substr(e.col + 1)) + '\n' +
        (lines[e.line] ? (e.line + 1) + ': ' + encodeHTML(lines[e.line]) : '');
    } else if (e instanceof DefaultsError) {
      message = '<strong>' + encodeHTML(e.msg) + '</strong>';
    } else if (e instanceof Error) {
      message = e.name + ': <strong>' + encodeHTML(e.message) + '</strong>';
    } else {
      message = '<strong>' + encodeHTML(e) + '</strong>';
    }

    return message;
  }

  /**
   * Uglify a list of files
   * @method  setupUglify
   * @param   {String} url  Url of file to lint
   */
  function setupUglify(url) {
    test(url, 1, function () {
      stop();
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        start();
        var output, input, transfer;

        input = xhr.responseText;
        transfer = {};

        try {
          output = uglify(input, {});
          ok(
            true,
            'input: ' + input.length + ' bytes | output: ' + output.length +
              ' bytes, saved ' +
                  ((1 - output.length / input.length) * 100).toFixed(2) + '%'
          );

          // TODO: do something else!
          //console.log(output);
          transfer[url] = output;
          transferToCSSO.push(transfer);
        } catch (e) {
          ok(false, e.message);
          ok(false, showUglyCSSError(e, input));
        }
      };
      xhr.onerror = function () {
        start();
        ok(false, "Unable to UglifyCSS");
      };
      xhr.open("GET", url, true);
      xhr.send();
    });
  }

  toUglifyCSS.forEach(setupUglify);

}());



