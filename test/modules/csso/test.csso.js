/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global module, test, ok, stop, start, XMLHttpRequest, console, uglifycss,
 toUglifyCSS, JS_Parse_Error, DefaultsError, Error  */
(function () {
  "use strict";

  /**
   * Done using CSSO
   * Author: Vladimir Grinenko - https://github.com/css/csso
   * MIT licenced
   */

  module("csso");


  /**
   * generate an error message to display in Qunit
   * @method  showUglyCSSError
   * @param   {Object}  e     Error object thrown
   * @return  {String}  HTML  Error message
   */
  function showCSSOError(e) {
    return e;
  }

  /**
   * Run structural optimization on a minified CSS string (must not include
   * comments!)
   * @method  setupCSSO
   * @param   {String} my_input_css_string  A previously minified CSS string
   */
  function setupCSSO(my_input_css_object) {
    var compressor, translator, output, str;

    compressor = new CSSOCompressor();
    translator = new CSSOTranslator();

    for (file in my_input_css_object) {
      if (my_input_css_object.hasOwnProperty(file)) {
        str = my_input_css_string[file];
        try {
          output = translator.translate(
            cleanInfo(compressor.compress(srcToCSSP(str, 'stylesheet', true)))
          );

          ok(
            true,
            'input: ' + str.length + ' bytes | output: ' + output.length +
              ' bytes, saved ' +
                  ((1 - output.length / str.length) * 100).toFixed(2) + '%'
          );

          // TODO: do something else!
          console.log(output);
        } catch (e) {
          ok(false, e.message);
          ok(false, showCSSOError(e));
        }
      }
    }

  }

  transferToCSSO.forEach(setupCSSO);

}());



