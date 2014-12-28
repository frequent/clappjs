/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, document, declare, atob, JSON */
(function (window, document, JSON, atob) {
  "use strict";

  /* ====================================================================== */
  /*                              STORAGE                                   */
  /* ====================================================================== */

  /* ====================================================================== */
  /*                       Helpers Functions (stay private)                 */
  /* ====================================================================== */

  /**
   * Retrieve all storage types declared in a storage definition
   * @method  retrieveStorageTypes
   * @param   {Object}  my_storage_definition  Storage definition
   * @param   {Array}   my_type_array          Array of types found
   * @returns {Array}   Array of types found
   */
  function retrieveStorageTypes(my_storage_definition, my_type_array) {
    var sub, arr, set, i, len, storage_type;

    arr = my_type_array || [];
    storage_type = my_storage_definition.type + "storage";
    sub = my_storage_definition.sub_storage ||
        my_storage_definition.storage_list;

    // add new storage types
    if (arr.indexOf(storage_type) === -1) {
      arr.push(storage_type);
    }

    if (sub) {
      set = my_storage_definition.storage_list ||
          [my_storage_definition.sub_storage];
      for (i = 0, len = set.length; i < len; i += 1) {
        arr.concat(retrieveStorageTypes(set[i], arr));
      }
    }

    return arr;
  }

  /**
   * Expand storage definition types to full module spec
   * @method  generateModuleSpec
   * @param   {Array}   my_name_list  List of modules to load
   * @returns {Array}   List of modules with full spec
   */
  function generateModuleSpec(my_name_list) {
    var i, len, item;

    for (i = 0, len = my_name_list.length; i < len; i += 1) {
      item = my_name_list[i];
      my_name_list[i] = {
          "name": item,
          "src": '../../lib/jio/' + item + '.js',
          "shim": true
        }
    }

    return my_name_list;
  }

  /**
   * Build a reference query object, which will then be converted into
   * the actual query synatax from storage.query buildQuery call. Method
   * is necessary, because URL will just contain a key=[module] and this
   * method constructs the query object necessary to look for objects defining
   * this module
   * @method  buildReferenceQueryObject
   * @param   {Array}     my_portal_type_list   list of portal types to query
   * @param   {Array}     my_reference_list     list of values to query
   * @param   {String}    my_key                key to query values for
   * @returns query object
   */
  // TODO: this should eventually be generic, too
  function buildReferenceQueryObject(my_portal_type_list, my_reference_list, my_key) {
    var i, len, obj, query_object

    query_object = [];
    for (i = 0, len = my_portal_type_list.length; i < len; i += 1) {
      if (i > 0) {
        query_object.push([{"operator": "OR"}]);
      }
      obj = {"operator": "AND"};
      obj[my_key || "reference_portal_type"] = my_reference_list;
      query_object.push([{"portal_type": [my_portal_type_list[i]]}, obj]);
    }

    return query_object;
   }

  /**
   * Build a qury string from parameters passed
   * First pass at an API:
   *  [
   *    [
   *      {"pt": ["foo", "bar"]},
   *      {"op": "AND", "cous": ["123"]}
   *    ],
   *    [{"op": "NOT"}],
   *    [{...}, {...}]
   *  ]
   * 
   * @method  buildQuery
   * @param   {Object}  my_query_dict    Query parameters
   * @returns {String}  query string
   */
  function buildQuery(my_query_dict) {
    var i, j, k, key, len, block_len, block, section, query;

    // NOTE: my_input will be string (operator) or array ([value_list])!
    function iterator(my_key, my_value, my_input) {
      var snip;

      if (my_key === "operator") {
        my_input += ' ' + my_value + ' ';
      } else {
        snip = my_key + ': "';
        my_input += ' (' + snip + my_value.join('" OR ' + snip) + '") ';
      }

      return my_input;
    }

    // TODO: duplicate iterator
    for (i = 0, query = '', len = my_query_dict.length; i < len; i += 1) {
      block = my_query_dict[i];
      query += '(';
      for (j = 0, block_len = block.length; j < block_len; j += 1) {
        section = block[j];
        for (k in section) {
          if (section.hasOwnProperty(k)) {
            query += iterator(k, section[k], []);
          }
        }
      }
      query += ')';
    }

    // TODO: find better way than to wrap connectors and replace here...
    query = query
      .replace('( AND )', ' AND ', "g")
      .replace('( OR )', ' OR ', "g")
      .replace('( NOT )', ' NOT ', "g")

    return {"query": query};
  }

  /**
   * Retrieve keys from a query dict
   * @method    getQueryKeys
   * @param     {Array}   my_mock_query_list    Query raw syntax
   * @returns   {Array}   key_list
   */
  function getQueryKeys(my_query_list) {
    var i, i_len, j, j_len, param, key_list, query_dict, query_element;

    for (key_list = [], i = 0, i_len = my_query_list.length; i < i_len; i += 1) {
      query_element = my_query_list[i];
      for (j = 0, j_len = query_element.length; j < j_len; j += 1) {
        query_dict = query_element[j];
        for (param in query_dict) {
          if (query_dict.hasOwnProperty(param) && param !== "operator") {
            key_list.push(param);
          }
        }
      }
    }

    return key_list;
  }

  /**
   * =========================================================================
   *                          EXPOSED METHODS
   * =========================================================================
   */
  declare("storage", [{
    "name": 'jio',
    "src": '../../lib/jio/jio.js',
    "shim": true
  }, {
    "name": 'hasher',
    "src": '../../src/clapp.util.hasher'
  },{
    "name": 'util',
    "src": '../../src/clapp.util.js'
  }], function (jio, hasher, util) {
    var storage = {};

    /**
     * Retrieve a defintion from storage, try to load as module or from file
     * @method  query
     * @param   {Object}  my_storage      Storage to query
     * @param   {String}  my_query_dict   Query parameters
     * @param   {Object}  my_param_dict   Request parameters
     * @returns {Object}  query result
     */
    storage.query = function (my_storage, my_query_dict, my_param_dict) {
      var query;

      query = util.extend(
        buildQuery(my_query_dict),
        my_param_dict || {"include_docs": true}
      );

      // TODO: cleanup, this fails promise chain!
      return my_storage.allDocs(query)
      .then(function (my_result) {
        var k, file_len, list, index, i, j, k, key, len, block_len, block,
          section, src_list, valid_key_list, front, back, pass, param;

        // wrap chain in a separate method to preserve my_type value
        function fetchFile(my_name) {
          var src, data, i, len, list;

          src = 'data/' + my_name + '.json.js';

          // load as a module
          function loadAsModule(my_spec) {
            return request(my_spec)
              .then(function (my_response) {

                // TODO: this should be done in generic response handler
                data = my_response;
                if (util.typeOf(data, 'Array')) {
                  list = [];
                  for (i = 0, len = data.length; i < len; i += 1) {
                    list.push(my_storage.post[i]);
                  }
                  return Promise.all(list);
                }
                return my_storage.post(data);
              })
              .then(function () {
                return data;
              })
              .caught(function() {
                return loadFromDisk({"url": my_spec[0].src.slice(0, -3)});
              });
          }

          // load from disk
          function loadFromDisk(my_raw_src) {
            var i, len, list;
            return jio.util.ajax(my_raw_src)
              .then(function (my_response) {

                // TODO: this should be done in generic response handler
                data = util.parse(my_response.target.responseText);
                if (util.typeOf(data, 'Array')) {
                  list = [];
                  for (i = 0, len = data.length; i < len; i += 1) {
                    list.push(my_storage.post[i]);
                  }
                  return Promise.all(list);
                }
                return my_storage.post(data);
              })
              .then(function () {
                return data;
              });
          }

          // if built load as module, else from disk
          if (storage.is_built) {
            return loadAsModule([{"name": my_name, "src": src}]);
          }
          return loadFromDisk({"url": src.slice(0, -3)});
        }

        // hold results or promises
        list = [];

        // fetch definition from storage || embedded JSON (prod) || disk (dev)
        // TODO: make generic
        // TODO: also, on regular alldocs calls, 0 should be possible
        // TODO: this does not catch errors...!
        // TODO: add fallback in case keys are not specified, standard case!
        if (my_result.data.total_rows === 0) {

          // retrieve keys from query_dict
          valid_key_list = getQueryKeys(my_query_dict);

          for (i = 0, len = my_query_dict.length; i < len; i += 1) {
            src_list = [];
            front = [];
            back = [];
            block = my_query_dict[i];
            for (j = 0, block_len = block.length; j < block_len; j += 1) {
              section = block[j];
              for (param in section) {
                index = valid_key_list.indexOf(param);
                if (section.hasOwnProperty(param) && index > -1) {
                  switch (index) {
                    case 0:
                      front = section[param];
                      break;
                    case 1:
                      back = section[param];
                      break;
                  }
                }
              }
            }

            // need to create src_list and unload here, to handle multiple
            // query segments (... AND ...) AND (... OR ...)
            src_list = ["x"].concat(back)
              .join("|" + front + "_").split("|").splice(1, back.length);

            // drop off
            for (k = 0, file_len = src_list.length; k < file_len; k += 1) {
              list.push(fetchFile(src_list[k]));
            }
          }

          return Promise.all(list)
            .then(function (my_result_list) {
              return hasher.convertResponseToHate(my_result_list, query);
            });
        }

        // got something from allDoc, wrap result in proper HATE object
        return hasher.convertResponseToHate(my_result, query);
      });
    }

    /**
     * Digest a portal type by looking up portal_definition of the requested
     * portal type and subsequent required portal types to gather all
     * configuration objects required. The method will traverse for a
     * respective portal type and collect information on dependent portal types
     * which will be queried once all required definitions have been loaded
     * (eg. portal definition > portal actions)
     * @method  digestType
     * @param   {Object}  my_storage  Storage to query
     * @param   {String}  my_type     Type to query
     * @param   {Array}   my_key_list Values to query
     * @param   {String}  my_key      Key for which to query values
     * @returns {Object}  my_storage once all data is retrieved
     */
    // TODO: not generic (dito for buildReferenceQueryObject, buildQuery).
    storage.digestType = function (my_storage, my_value_list, my_portal_type_list, my_key) {
      var traversal, value_list, portal_type_list, next_key_list, next_portal_type_list, key,
        next_key;

      // parameters for this digest call
      portal_type_list = my_portal_type_list || ["portal_definition"];
      key = my_key || "reference_portal_type";
      value_list = my_value_list;

      // placeholders for dependency query built during traversal
      next_portal_type_list = [];
      next_key_list = [];

      // this is the traversing promise. If a response has kids that need to
      // be queried, the resolve of the parent is passed to the child in a
      // new call to handler. If there are no more kids, the current parent
      // is resolved which resolves all parent promises while traversing up
      traversal = new Promise(function (resolve) {

        function handler(my_pass_store, my_query, my_parent_resolve) {
          return storage.query(my_pass_store, my_query)
            .then(function (my_response) {
              var i, j, len_i, len_j, deps, iter, kids, pending_list, pender,
                content;

              // fetch content from HATE response
              content = my_response.contents || [];

              // kids will be fetched here via new handler() calls
              pending_list = [];

              for (i = 0, len_i = content.length; i < len_i; i += 1) {
                iter = content[i];
                kids = iter.child_portal_type_list;
                deps = iter.dependent_portal_type_list;

                // add new dependency portal types to follow up parameters
                if (deps !== null) {
                  for (j = 0, len_j = deps.length; j < len_j; j += 1) {
                    if (next_portal_type_list.indexOf(deps[j]) === -1) {
                      next_portal_type_list.push(deps[j]);
                    }
                  }

                  next_key = iter.dependent_reference_field;
                  if (next_key_list.indexOf(iter[next_key]) === -1) {
                    next_key_list.push(iter[next_key]);
                  }
                }

                // kids will trigger recursive handler() calls
                if (kids !== null) {
                  pender = new Promise(function (pending_resolve) {
                    handler(
                      my_storage,
                      buildReferenceQueryObject(portal_type_list, kids, key),
                      pending_resolve
                    );
                  });
                  pending_list.push(pender);
                }
              }

              // once all kids have been loaded, resolve the respective parent
              return Promise.all(pending_list)
                .then(function () {
                  my_parent_resolve([next_key_list, next_portal_type_list, next_key]);
                });
            });
        }

        // start loading definitions: first call to handler
        return handler(
          my_storage,
          buildReferenceQueryObject(portal_type_list, value_list, key),
          resolve
        );
      });

      // start:
      return traversal

        // done, resolving the last promise returns follow up call parameters
        .then(function (my_new_digest_parameter_list) {
          var last, param_list;

          param_list = [my_storage].concat(my_new_digest_parameter_list);
          last = param_list[3];

          if (last !== undefined) {
            return storage.digestType.apply(null, param_list);
          }
        });
    }

    /**
     * Create a new storage. If nothing is specified it will be on memory.
     * Note that all storage (js) files requested will be fetched based on
     * the defined spec before creating and returning the storage.
     * @method  createStorage
     * @param   {String}    my_name   Name of the storage
     * @param   {Object}    my_config Storage configuration
     * @returns {Object}    generated storage
     */
    storage.createStorage = function (my_name, my_config) {
      var spec;

      // spec is either passed or fallback to memory
      spec = my_config || {
        "type": 'local',
        "mode": 'memory',
        "username": my_name,
        "application_name": my_name
      };

      // retrieve all storages files named in spec, then create storage
      return request(generateModuleSpec(retrieveStorageTypes(spec)))
        .then(function () {
          var new_store = jio.createJIO(spec);
          return new_store;
        });
    };

    /**
     * Try to resolve storage location from URL and create location
     * @method  resolveLocation
     * @param   {String}  my_url_param  URL parameter retrieved
     * @returns {Object}  generated storage
     */
    storage.resolveLocation = function (my_url_param) {
      var flux, spec;

      try {
        spec = JSON.parse(util.decode(atob(my_url_param)));

        // TODO: FIX
//         flux = storage.createStorage("flux");
//
//
//         return flux.post({
//           "portal_type": 'storage_location'
//         }).then(function (my_location) {
//           return storage.saveStorageTree(my_location._id, spec, flux);
//         }).then(function () {
//           return storage.assembleStorageLocation(flux);
//         }).then(function (my_location_configuration) {
//
//           // dipose
//           flux = null;
//           return storage.createStorage(my_location_configuration);
//         });

      } catch (err) {
        return undefined;
      }
    };

    /**
     * Recover or create a storage
     * @method  recoverStorage
     * @param   {Object}  my_http_response    http response object
     * @returns {Object}  generated storage
     */
    storage.recoverStorage = function (my_http_response) {
      var portal_type = hasher.getUrlQueryParam(
        "key",
        my_http_response._links.fallback.href
      );

      // need a flux
      return storage.createStorage("flux")
        .then(function (my_storage) {
          return storage.digestType(my_storage, [portal_type]);
        })
        .then(function (my_ready_flux) {
          console.log("et viola");
          // TODO: need to be ready here!
        });
    };

    // ================== ENTRY POINT INITALIZATION =========================

    /**
     * When no storage is available, this will fetch the appropriate module
     * and help setting up storage. Will only pass back to loop when storage
     * has been created
     * @method  setupStorage
     * @param   {String}    my_url_param      URL parameter if available
     * @param   {Object}    my_hate_response  HTTP response object
     * @returns {Object}    generated storage
     */
    storage.setupStorage = function (my_url_param, my_hate_response) {
      return storage.resolveLocation(my_url_param) ||
        storage.recoverStorage(my_hate_response);
    }

    return storage;
  });

}(window, document, JSON, atob));
