/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global module, test, ok, stop, start, XMLHttpRequest, uglify, console */
(function () {
  "use strict";

  QUnit.module("uglify2");

  /*
   * Thx - wrapper created by Dan Wolff (danwolff.se)
   * https://github.com/Skalman/UglifyJS-online
   * Thx - UglifyJS is released under the BSD license, copyright Mihai Bazon.
   * https://github.com/mishoo/UglifyJS2
   */

  var default_options = {
    "parse": {
      "strict": false
    },
    "compress": {
      "sequences" : true,
      "properties" : true,
      "dead_code" : true,
      "drop_debugger" : true,
      "unsafe" : true,
      "unsafe_comps" : true,
      "conditionals" : true,
      "comparisons" : true,
      "evaluate" : true,
      "booleans" : true,
      "loops" : true,
      "unused" : true,
      "hoist_funs" : true,
      "hoist_vars" : false,
      "if_return" : true,
      "join_vars" : true,
      "cascade" : true,
      "side_effects" : true,
      "negate_iife" : true,
      "screw_ie8" : false,
      "warnings" : true,
      "global_defs" : {}
    },
    "output": {
      "indent_start": 0,
      "indent_level": 4,
      "quote_keys": false,
      "space_colon": true,
      "ascii_only": false,
      "inline_script": true,
      "width": 80,
      "max_line_len": 32000,
      "beautify": false,
      "source_map": null,
      "bracketize": false,
      "semicolons": true,
      "comments": /@license|@preserve|^!/,
      "preserve_line": false,
      "screw_ie8": false
    }
  };

  /**
   * run uglification on a file
   * @method  uglify
   * @param   {String}  code      The code of the file to uglify
   * @param   {Object}  options   Options for uglify
   * @returns {String}  uglified code
   */
  function uglify(code, options) {
    var passed_options, parse_options, compress_options, output_options,
      toplevel_ast, compressor, compressed_ast, code;

    passed_options = options || {};
    parse_options = options.parse || default_options.parse;
    compress_options = options.compress || default_options.compress;
    output_options = options.output || default_options.output;

    // 1. Parse
    toplevel_ast = parse(code, parse_options);
    toplevel_ast.figure_out_scope();

    // 2. Compress
    compressor = new Compressor(compress_options);
    compressed_ast = toplevel_ast.transform(compressor);

    // 3. Mangle
    compressed_ast.figure_out_scope();
    compressed_ast.compute_char_frequency();
    compressed_ast.mangle_names();

    // 4. Generate output
    code = compressed_ast.print_to_string(output_options);

    return code;
  }

  /**
   * generate an error message to display in Qunit
   * @method  showUglyJsError
   * @param   {Object}  e     Error object thrown
   * @return  {String}  HTML Error message
   */
  function showUglyJSError(e) {
    var message, input, lines, line, encodeHTML;

    function encodeHTML(str) {
      return (str + '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
    }

    if (e instanceof JS_Parse_Error) {
      lines = input.split('\n');
      line = lines[e.line - 1];

      message = 'Parse error: <strong>' + encodeHTML(e.message) + '</strong>\n' +
        '<small>Line ' + e.line + ', column ' + e.col + '</small>\n\n' +
        (lines[e.line-2] ? (e.line - 1) + ': ' + encodeHTML(lines[e.line-2]) + '\n' : '') +
        e.line + ': ' +
          encodeHTML(line.substr(0, e.col)) +
          '<mark>' + encodeHTML(line.substr(e.col, 1) || ' ') + '</mark>' +
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
        var output, i, input;

        input = xhr.responseText;

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
        } catch (e) {
          ok(false, e.message);
          ok(false, showUglyJSError(e, input));
        }
      };
      xhr.onerror = function () {
        start();
        ok(false, "Unable to Uglify");
      };
      xhr.open("GET", url, true);
      xhr.send();
    });
  }

  toUglify.forEach(setupUglify);

}());



