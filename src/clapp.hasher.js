/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, document, declare */
(function (window, document) {
  "use strict";

  /* ====================================================================== */
  /*                              HASHER                                    */
  /* ====================================================================== */

  /* ====================================================================== */
  /*                          Utility Functions                             */
  /* ====================================================================== */

  var bracket_regex;

  /**
   * Regex to extract {...} from string
   * @property  {Regex}  bracket_regex
   */
  bracket_regex = /[^{}]+(?=\})/g;

  /**
   * Decode URI string
   * @method    decode
   * @param     {string}  my_string   String to decode
   * @returns   {string}  encoded uri string
   */
  function decode(my_string) {
    return window.decodeURIComponent(my_string);
  }

  /**
   * Encode URI string
   * @method    encode
   * @param     {string}  my_string   String to encode
   * @returns   {string}  encoded uri string
   */
  function encode(my_string) {
    return window.encodeURIComponent(my_string);
  }

  /**
   * Convert url key string into object
   * @method  parseKeyString
   * @param   {String}  my_urn    url needing to parse
   * @returns {Object}  URN object
   */
  function parseKeyString(my_key_string) {
    var url_param_list, param_list, i, len, url_dict, key;

    url_param_list = my_urn.split("&");
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
    * Parse a urn hashtag into an array of key-based objects
    * @method  parseUrn
    * @param   {Object}  my_urn    urn to parse
    * @returns {Array}   list of key-based objects
    */
  function parseUrn(my_urn) {
    var key_list, i, len, url_list;

    key_list = my_urn.substr(3).split("key=").slice(1);
    url_list = [];

    for (i = 0, len = key_list.length; i < len; i += 1) {
      url_list.push(parseKeyString("key=" + key_list[i]));
    }

    return url_list;
  }

  /**
    * Serialize a urn object into an bookmarkable URL
    * @method  serializeKeyString
    * @param   {Object}  my_urn_dict    urn object to convert to URL
    * @returns {String}  URL string component
    */
  function serializeKeyString(my_urn_dict) {
    var hash_param_list, key;

    // handles foo | [foo, bar] | [[foo, bar],[baz, bam]]
    function recurse(my_key, my_val) {
      var i, len, param_list;

      if (util.typeOf(my_val, 'Array')) {
        param_list = [];
        for (i = 0, len = my_val.length; i < len; i += 1) {
          param_list.push(
            recurse(my_key, my_val[i].toString().replace(",", "+"))
          );
        }
        return param_list;
      }
      return [encode(my_key) + "=" + encode(my_val)];
    };

    hash_param_list = [];
    for (key in my_urn_dict) {
      if (my_urn_dict.hasOwnProperty(key)) {
        hash_param_list.concat(recurse(key, my_urn_dict[key]));
      }
    }
    return hash_param_list.join(encode("&"));
  }

  /**
    * Serialize a urn object into an bookmarkable URL
    * @method  serializeUrn
    * @param   {Object}  my_urn_list    urn object to convert to URL
    * @returns {String}  URL to lookup
    */
  function serializeUrn(my_urn_list) {
    var i, len, str, key_list;

    str = "#!";
    key_list = [];
    for (i = 0, len = my_urn_list.length; i < len; i += 1) {
      key_list.push(serializeKeyString(my_urn_list[i]));
    }
    return str + key_list.join(encode("&"));
  }

  /**
   * Resolve a mangled url into an URN object
   * @method resolveUrn
   * @param   {String}  my_mangled_urn   urn string to resolve
   * @param   {Object}  my_hate_response full response object
   * @returns {String}  resolved link
   */
  function convertLink(my_uri, my_hate_response) {
    var bracket_list, i, len, bracket, uri;

    /* prelim API:
     * {base_url}    => location
     *  /
     *  {#seo}          => always set to ! for SEO crawlers
     *  {&(...)*}       => [custom], allowing multiple RFC6570 expressions
     *  {&key}          => portal type
     *  {&view}         => default|action[dialog]|export[dialog]
     *  {&handler}      => method to call [all|get|put|del|new]
     *  {&query}        => allDocs storage query
     *  {&limit*}       => allDocs record limit from-to
     *  {&select_list*} => allDocs fields to return
     *  {&wildcard}     => allDocs wildcard
     *  {&sort_on*+}    => [custom], allDocs sorting, will be join("+")ed
     *  {&pointer}      => storage location
     *  {&relay}        => traversal base id
     *  {&id}           => get/put/remove id
     */

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
   * Convert all links in a hate response to bookmarkable links
   * @method  resolveHateResponse
   * @param   {Object}  my_hate_response  Generated hate response object
   * @returns {Object}  same object with all links resolved
   */
  function resolveHateResponse(my_hate_response) {

    // strings will be skipped here, links resolved in resolveObject
    function testType(my_element) {
      switch (util.typeOf(my_element)) {
        case '[object Array]':
          resolveArray(my_element);
          break;
        case '[object Object]':
          resolveObject(my_element);
          break;
      }
    }

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
            my_dict[key] = convertLink(my_dict[key], my_hate_response);
          } else {
            testType(my_dict[key]);
          }
        }
      }
    }

    // recursively loop over generated hate response to convert links
    testType(my_hate_response);

    return my_hate_response;
  }

  /**
   * generate default hateoas response
   * @method  createBaseHateResponse
   * @returns new HATEOAS response object
   */
  function createBaseHateResponse() {
    function hate() {
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
        "find": {
          "href": '{base_url}/#!{key:storage_location_module}',
          "name": 'Fallback Storage Initializer'
        }
      };
      this.title = "Restricted Hateoas Polyfill";
    }

    return new hate();
  };

  /**
   * =========================================================================
   *              URL Manager and link parsing  = Navigation
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
  }], function (util, temp, my_uri) {
    var hasher = {};

  /**
   * =========================================================================
   *                          EXPOSED METHODS
   * =========================================================================
   */

    /**
     * retrieve a query parameter from the url looking through all key dicts
     * @method  getUrlQueryParam
     * @param   {String}    my_param  Parameter to retrieve
     * @returns {String}    value of parameter or undefined
     */
    hasher.getUrlQueryParam = function (my_param) {
      var i, len, key_list, item;

      key_list = parseUrn(window.location.hash);
      for (i = 0, len = key_list.length; i < len; i += 1) {
        item = key_list[i][my_param];
        if (item) {
          return item; 
        }
      }
    };

    /**
     * test if a http response is "hate". If not, shim it accordingly.
     * @method    convertResponseToHate
     * @param     {Object}    my_http_response  xhr response object
     * @returns   {Object}    hate response
     */
    hasher.convertResponseToHate = function (my_http_response) {
      var response, hate_dict;

      response = util.parse(my_http_response || {});

      // smart server you are...
      if (response.responseType === "application/hal+json") {
        return Promise.resolve(response.responseText);
      }

      // Base
      hate_dict = createBaseHateResponse();

      // TODO: add more HATE here

      return Promise.resolve(resolveHateResponse(hate_dict));
    };


    return hasher;

  });

}(window, document));
