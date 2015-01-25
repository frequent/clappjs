/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, declare */
(function (window, declare) {
  "use strict";

  /* ====================================================================== */
  /*                              HASHER                                    */
  /* ====================================================================== */

  /* ====================================================================== */
  /*                          Utility Functions                             */
  /* ====================================================================== */

  var bracket_regex;

  /**
    * @description | Regex to extract {...} from string
    * @property    | {regex},  bracket_regex
    **/
  // TODO: find better /[^{}]+(?=\})/g; /([^{}]+(?=\}))/g;
  bracket_regex = /([^{}]+(?=\}))/g;

  /**
    * @description | Decode URI string
    * @method      | decode
    * @param       | {string}, my_string, String to decode
    * @returns     | {string}, encoded uri string
    **/
  function decode(my_string) {
    return window.decodeURIComponent(my_string);
  }

  /**
    * @description | Encode URI string
    * @method      | encode
    * @param       | {string}, my_string, String to encode
    * @returns     | {string}, encoded uri string
    **/
  function encode(my_string) {
    return window.encodeURIComponent(my_string);
  }

  /**
    * @description | Convert url key string into object
    * @method      | parseKeyString
    * @param       | {string}, my_urn, url needing to parse
    * @returns     | {object}, parsed urn object
    **/
  // TODO: decode decode decode?
  function parseKeyString(my_key_string) {
    var url_param_list, param_list, i, len, url_dict, key;

    url_param_list = my_key_string.split("&");
    url_dict = {};

    for (i = 0, len = url_param_list.length; i < len; i += 1) {
      param_list = url_param_list[i].split("=");
      key = decode(param_list[0]);
      switch (key) {
      case "limit":
      case "select_list":
        url_dict[key] = url_dict[key] || [];
        url_dict[key].push(decode(param_list[1]));
        break;
      case "sort_on":
        url_dict[key] = url_dict[key] || [];
        url_dict[key].push(decode(param_list[1].split("+")));
        break;
      default:
        url_dict[key] = decode(param_list[1]);
        break;
      }
    }
    return url_dict;
  }

  /**
    * @description | Parse a urn hashtag into an array of key-based objects
    * @method      | parseUrn
    * @param       | {object}, my_urn, urn to parse
    * @returns     | {array}, list of key-based objects
    **/
  // TODO: what was this for again???
  function parseUrn(my_urn) {
    var key_list, i, len, url_list;

    // TODO: no substr(2)!!!
    key_list = my_urn.substr(2).split("key=").slice(1);
    url_list = [];

    for (i = 0, len = key_list.length; i < len; i += 1) {
      url_list.push(parseKeyString("key=" + key_list[i]));
    }

    return url_list;
  }

  /**
    * @description | Serialize urn fragment
    * @method      | serializeKeyString
    * @param       | {object}, my_urn_dict, urn object to convert to URL
    * @param       | {object}, my_utilities_dict, Utilities object
    * @returns     | {string}, URL string component
  function serializeKeyString(my_urn_dict, my_utilities_dict) {
    var hash_param_list, key;

    // handles foo | [foo, bar] | [[foo, bar],[baz, bam]]
    function recurse(my_key, my_val) {
      var i, len, param_list;

      if (my_utilities_dict.typeOf(my_val, 'Array')) {
        param_list = [];
        for (i = 0, len = my_val.length; i < len; i += 1) {
          param_list.push(
            recurse(my_key, my_val[i].toString().replace(",", "+"))
          );
        }
        return param_list;
      }
      return [encode(my_key) + "=" + encode(my_val)];
    }

    hash_param_list = [];
    for (key in my_urn_dict) {
      if (my_urn_dict.hasOwnProperty(key)) {
        hash_param_list.concat(recurse(key, my_urn_dict[key]));
      }
    }
    return hash_param_list.join("&");
  }
  **/

  /**
    * @description | Serialize a urn object into an bookmarkable URL
    * @method      | serializeUrn
    * @param       | {object}, my_urn_list, urn object to convert to URL
    * @param       | {object}, my_utilities_dict
    * @returns     | {string}, URL to lookup
  function serializeUrn(my_urn_list, my_utilities_dict) {
    var i, len, str, key_list;

    str = "#!";
    key_list = [];
    for (i = 0, len = my_urn_list.length; i < len; i += 1) {
      key_list.push(serializeKeyString(my_urn_list[i]), my_utilities_dict);
    }
    return str + key_list.join(encode("&"));
  }
  **/

  /**
    * @description | Resolve link with known parameters before passing it back
    * @description | preliminary API:
    * @description |  {base_url}      => location
    * @description |  {#seo}          => always set to ! for SEO crawlers
    * @description |  {&(...)*}       => [custom], allowing multiple RFC6570?!?
    * @description |  {&key}          => portal type
    * @description |  {&view}         => default|action[dialog]|export[dialog]
    * @description |  {&handler}      => method to call [all|get|put|del|new]
    * @description |  {&query}        => allDocs storage query
    * @description |  {&limit*}       => allDocs record limit from-to
    * @description |  {&select_list*} => allDocs fields to return
    * @description |  {&wildcard}     => allDocs wildcard
    * @description |  {&sort_on*+}    => [custom], sorting, will be join("+")ed
    * @description |  {&pointer}      => storage location
    * @description |  {&relay}        => traversal base id
    * @description |  {&id}           => get/put/remove id
    * @method      | resolveLink
    * @param       | {string}, my_mangled_urn, urn string to resolve
    * @param       | {object}, my_hate_response, full response object
    * @returns     | {string}, resolved link
    **/
  function resolveLink(my_uri) {
    var bracket_list, i, len, bracket;

    bracket_list = my_uri.match(bracket_regex);

    for (i = 0, len = bracket_list.length; i < len; i += 1) {
      bracket = bracket_list[i];
      switch (bracket) {
      case 'base_url':
        my_uri = my_uri.replace('{base_url}', window.location.href);
        break;
      default:
        my_uri = my_uri.replace(
          '{' + bracket + '}',
          '&' + encode(bracket.split(':').join('='))
        );
        break;
      }
    }

    // remove first & before encoding
    return my_uri.replace('#!&', '#!');
  }

  /**
    * @description | Convert all links in a hate response to bookmarkable links
    * @method      | resolveHateResponse
    * @param       | {object}, my_hate_response, Generated hate response object
    * @param       | {object}, my_utilities_dict
    * @returns     | {object}, same object with all links resolved
    **/
  function resolveHateResponse(my_hate_response, my_utilities_dict) {
    var testType;

    function resolveArray(my_list) {
      var i, len;

      for (i = 0, len = my_list.length; i < len; i += 1) {
        testType(my_list[i]);
      }
    }

    function resolveObject(my_dict) {
      var key;

      for (key in my_dict) {
        if (my_dict.hasOwnProperty(key)) {
          if (key === 'href') {
            my_dict[key] = resolveLink(my_dict[key], my_hate_response);
          } else {
            testType(my_dict[key]);
          }
        }
      }
    }

    // jslint... strings will be skipped here, links resolved in resolveObject
    testType = function (my_element) {
      switch (my_utilities_dict.typeOf(my_element)) {
      case '[object Array]':
        resolveArray(my_element);
        break;
      case '[object Object]':
        resolveObject(my_element);
        break;
      }
    };

    // recursively loop over generated hate response to convert links
    testType(my_hate_response);

    return my_hate_response;
  }

  /**
    * @description | Generate default hateoas response
    * @method      | createBaseHateResponse
    * @returns     | new HATEOAS response object
    **/
  function createBaseHateResponse() {
    function Hate() {
      this._embedded = {
        "contents": []
      };
      this._links = {
        "self": {
          "href": '{base_url}/',
          "name": 'Current Document'
        },
        "root": {
          "href": '{base_url}/',
          "name": 'Application Root'
        },
        "fallback": {
          "href": '{base_url}/#!{key=storage_specification}',
          "name": 'Application Root Initializer'
        }
      };
      this.title = "Restricted Hateoas Polyfill";
    }

    return new Hate();
  }

  /**
   * =========================================================================
   *                          EXPOSED METHODS
   * =========================================================================
   */
  declare("hasher", [{
    "name": 'util',
    "src": '../../src/clapp.util.js'
  }, {
    "name": 'temp',
    "src": '../../lib/uritemplate/uritemplate.js',
    "shim": true
  }, {
    "name": 'uri',
    "src": '../../lib/uri/uri.js',
    "shim": true
  }], function (util) {
    var hasher = {};

    /**
      * @description | map the different http responses and everything returned
      * @description | from fallback queries into a homogenous format. The
      * @description | following response formats are handle:
      * @description | - fallback loading (multiple/single): [[{},{}], [{},{}]
      * @description | - allDocs {data.rows[doc]}, {data.rows[value]}
      * @description | - get {data}
      * @method      | mapContent
      * @param       | {object}, my_http_response, response
      * @returns     | {object}, formatted object
      **/
    // TODO: digesting is the same as above, try to merge
    hasher.mapContent = function (my_http_response) {
      var digestResponse, content = [];

      // TODO: fallback data will not have ids on initial response, but ids
      // will not be used anyway at this point, so for now ok.
      function digestObject(my_object) {
        var data = my_object.data;

        if (data === undefined) {
          content.push(my_object);
        } else {
          digestResponse(data.rows || [data]);
        }
      }

      function digestArray(my_array) {
        var i, i_len;

        for (i = 0, i_len = my_array.length; i < i_len; i += 1) {
          digestResponse(my_array[i]);
        }
      }

      // jslint...
      digestResponse = function (my_response) {
        switch (util.typeOf(my_response)) {
        case "[object Array]":
          digestArray(my_response);
          break;
        case "[object Object]":
          digestObject(my_response.value || my_response.doc || my_response);
          break;
        }
      };

      // start
      digestResponse(my_http_response);

      return content;
    };

    /**
      * @description | retrieve a query parameter from the url looking through
      * @description | all key dicts
      * @method      | getUrlQueryParam
      * @param       | {string}, my_param, Parameter to retrieve
      * @param       | {string}, my_urn, Urn to parse instead of location
      * @returns     | {string}, value of parameter or undefined
      **/
    hasher.getUrlQueryParam = function (my_param, my_urn) {
      var i, len, key_list, item, hash;

      hash = (my_urn || window.location.href).split("#")[1] || "";
      key_list = parseUrn("#" + decode(hash));

      for (i = 0, len = key_list.length; i < len; i += 1) {
        item = key_list[i][my_param];
        if (item) {
          return item;
        }
      }
    };

    /**
      * @description | test if a http response is "hate". If not, shim it
      * @method      | convertResponseToHate
      * @param       | {object}, my_http_response, xhr response object
      * @param       | {object}, my_param_dict, request parameters
      * @returns     | {object} hate response
      **/
    hasher.convertResponseToHate = function (my_http_response, my_param_dict) {
      var response, hate_dict, param_dict, param;

      response = util.parse(my_http_response || {});
      param_dict = my_param_dict || {};

      // smart server you are...
      if (response.responseType === "application/hal+json") {
        return Promise.resolve(response.responseText);
      }

      // Base
      hate_dict = createBaseHateResponse();

      // handle content)
      hate_dict.contents = hasher.mapContent(my_http_response);

      // query parameters
      for (param in param_dict) {
        if (param_dict.hasOwnProperty(param)) {
          hate_dict["_" + param] = param_dict[param];
        }
      }

      // TODO: add links to content
      // TODO: add more HATE here

      return Promise.resolve(resolveHateResponse(hate_dict, util));
    };

    return hasher;

  });

}(window, declare));
