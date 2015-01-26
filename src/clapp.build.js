/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, Promise, module, test, ok, declare, parse, Compressor,
JS_Parse_Error, DefaultsError, Error, CSSOCompressor, CSSOTranslator */
(function () {
  "use strict";

  /* ====================================================================== */
  /*                              BUILD                                     */
  /* ====================================================================== */

  /* ====================================================================== */
  /*                          Utility Functions                             */
  /* ====================================================================== */

  /**
   * =========================================================================
   *                          EXPOSED METHODS
   * =========================================================================
   */

  declare("build", [
    {"name": 'util', "src": '../src/clapp.util.js'},
    // uglifycss
    {"name": 'uglycss', "src": '../lib/uglifycss/uglifycss.js'},
    // uglifyjs
    {"name": 'parse', "src": '../lib/uglifyjs/parse.js'},
    {"name": 'ast', "src": '../lib/uglifyjs/ast.js'},
    {"name": 'compress', "src": '../lib/uglifyjs/compress.js'},
    {"name": 'output', "src": '../lib/uglifyjs/output.js'},
    {"name": 'scope', "src": '../lib/uglifyjs/scope.js'},
    {"name": 'sourcemap', "src": '../lib/uglifyjs/source_map.js'},
    {"name": 'transform', "src": '../lib/uglifyjs/transform.js'},
    {"name": 'utils', "src": '../lib/uglifyjs/utils.js'},
    // csso
    {"name": 'csso', "src": '../lib/csso/csso.web.js'}
  ], function (util, uglifycss, parse) {

    var build = {};

    /**
      * @description | Load a list of urls via Ajax. Skip if the files are 
      * @description | already available
      * @method      | promiseAjaxLoop
      * @param       | {array},   my_url_list,   Urls to load
      * @param       | {array},   my_str_list,   Response once loaded
      * @return      | {promise}, resolving with list of files
      **/
    // TODO: make generic, also used in test and util?
    build.promiseAjaxLoop = function (my_url_list, my_str_list) {
      var i, len, file_list;

      for (i = 0, file_list = [], len = my_url_list.length; i < len; i += 1) {
        file_list[i] = my_str_list[i] || util.ajax({"url": my_url_list[i]});
      }

      return Promise.all(file_list);
    };

    /**
      * @description | Run a set of methods on a number of files
      * @method      | run
      * @param       | {array},   my_file_url_list,  List of urls
      * @param       | {array},   my_file_str_list,  List of file strings
      * @param       | {method},  my_test,           Test method to run
      * @returns     | {array},   Array of uglifified strings
      **/
    // TODO: not generic
    build.run = function (my_file_url_list, my_file_str_list, my_test) {
      var i, len, return_array = [];

      for (i = 0, len = my_file_str_list.length; i < len; i += 1) {
        return_array[i] = my_test(my_file_url_list[i], my_file_str_list[i]);
      }

      return Promise.all(return_array);
    };

    /**
      * @description | Generate information on reduced file size
      * @method      | generateOutputInfo
      * @param       | {string},  my_data,   Output
      * @param       | {string},  my_input,  Input
      * @returns     | {string},  Info on reduced bytesize
      **/
    build.generateOutputInfo = function (my_data, my_input) {
      var in_len, out_len;

      in_len = my_input.length;
      out_len = my_data.length;

      return "input: " + in_len + " bytes | output: " + out_len + "bytes." +
          "saved: " + ((1 - out_len / in_len) * 100).toFixed(2) + "%.";
    };

    /**
      * @description | Generate generic error message
      * @method      | showUglyError
      * @param       | {string},  my_url,   URL for file uglified
      * @param       | {object},  my_err,   Error object
      * @returns     | {string},  Error info for Qunit
      **/
    build.showUglyError = function (my_url, my_err) {
      var message = my_url + ", Error:";

      if (my_err instanceof JS_Parse_Error) {
        message += "JS Parse Error, " + my_err.message + ", line: " +
            my_err.line + ", col: " + my_err.col;
      } else if (my_err instanceof DefaultsError) {
        message += my_err.msg;
      } else if (my_err instanceof Error) {
        message += my_err.message;
      } else {
        message += my_err;
      }

      return message;
    };

    /**
      * @description | Run uglification on a CSS file. Done using port of YUI
      * @description | CSS Compressor to NodeJS
      * @thanks      | Franck Marcia - https://github.com/fmarcia
      * @method      | uglifycss
      * @param       | {array},   code,    List of file URLs to fetch and uglify
      * @returns     | {string}   Single uglified string
      **/
    build.uglifycss = function (my_url_list, my_file_str_list) {

      // helper: run uglification
      function uglify(my_code, my_options) {
        return uglifycss.processString(my_code, my_options);
      }

      // helper: uglify a file through Qunit
      function quenchCSS(my_file_url, my_file_str) {
        test(my_file_url, 1, function () {
          var data;

          try {
            data = uglify(my_file_str, {});
            ok(true, build.generateOutputInfo(data, my_file_str));

            // pass back finished string
            return new Promise.resolve({
              "url": my_file_url,
              "str": my_file_str
            });

          } catch (e) {
            ok(false, e.message);
            ok(false, build.showUglyError(e, my_file_str));

            // break chain
            throw e;
          }
        });
      }

      // helper: run uglfication on files
      function uglifycssFiles(my_file_list) {
        module("uglifycss");
        build.run(my_url_list, my_file_list, quenchCSS);
      }

      // START:
      return build.promiseAjaxLoop(my_url_list, my_file_str_list || [])
        .then(uglifycssFiles);
    };

    /**
      * @description | UglfiyJS default option object
      * @property    | uglfiyjs_default_options
      **/
    build.uglfiyjs_default_options = {
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
      * @description | Run uglification on a JS file.
      * @thanks      | Dan Wolf,  https://github.com/Skalman/UglifyJS-online
      * @thanks      | Mihai Bazon, https://github.com/mishoo/UglifyJS2
      * @method      | uglifyjs
      * @param       | {string},  code,      The code of the file to uglify
      * @returns     | {string},  The uglified code
      **/
    build.uglifyjs = function (my_url_list, my_file_str_list) {

      // helper: uglify file
      function uglify(code, options) {
        var passed_options, parse_options, compress_options, output_options,
          toplevel_ast, compressor, compressed_ast, default_dict;

        default_dict = build.uglfiyjs_default_options;
        passed_options = options || {};
        parse_options = passed_options.parse || default_dict.parse;
        compress_options = passed_options.compress || default_dict.compress;
        output_options = passed_options.output || default_dict.output;

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

      // helper: uglify a file through Qunit
      function quenchJS(my_file_url, my_file_str) {
        test(my_file_url, 1, function () {
          var data;

          try {
            data = uglify(my_file_str, {});
            ok(true, build.generateOutputInfo(data, my_file_str));

            // pass back finished string
            return new Promise.resolve({
              "url": my_file_url,
              "str": my_file_str
            });

          } catch (e) {
            ok(false, e.message);
            ok(false, build.showUglyError(e, my_file_str));

            // break chain
            throw e;
          }
        });
      }

      // helper: run uglfication on files
      function uglifyJSFiles(my_file_list) {
        module("uglifyjs");
        build.run(my_url_list, my_file_list, quenchJS);
      }

      // START:
      return build.promiseAjaxLoop(my_url_list, my_file_str_list || [])
        .then(uglifyJSFiles);
    };

    /**
      * @description | Run uglification on a JS file. Made using CSSO
      * @thanks      | Vladimir Grinenko - https://github.com/css/csso
      * @method      | csso
      * @param       | {string},  code,      The code of the file to uglify
      * @returns     | {string},  Minified code
      **/
    // TODO: do differently once all other things are working
    build.csso = function (my_url_list, my_file_str_list) {

      // helper: run CSSO over file string
      function runCSSO(my_file_url, my_file_str) {
        var compressor, translator;

        compressor = new CSSOCompressor();
        translator = new CSSOTranslator();

        test(my_file_url, 1, function () {
          var data;

          try {
            data = translator.translate(compressor.compress(my_file_str));
            ok(true, build.generateOutputInfo(data, my_file_str));

            // pass back finished string
            return new Promise.resolve({
              "url": my_file_url,
              "str": my_file_str
            });

          } catch (e) {
            ok(false, e.message);
            ok(false, build.showUglyError(e, my_file_str));

            // break chain
            throw e;
          }
        });
      }

      // helper: run uglfication on files
      function cssoFiles(my_file_list) {
        module("csso");
        build.run(my_url_list, my_file_list, runCSSO);
      }

      // START:
      return build.promiseAjaxLoop(my_url_list, my_file_str_list || [])
        .then(cssoFiles);

    };

    return build;
  });

}(Promise));

