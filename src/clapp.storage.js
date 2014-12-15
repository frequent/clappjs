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
   * =========================================================================
   *                          EXPOSED METHODS
   * =========================================================================
   */
  declare("storage", [{
    "name": 'jio',
    "src": '../../lib/jio/jio.js',
    "shim": true
  }, {
    "name": 'util',
    "src": '../../src/clapp.util.js'
  }], function (jio, util) {
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

      return my_storage.allDocs(
        util.extend(buildQuery(my_query_dict), my_param_dict || {})
      )
      // TODO: cleanup
      .then(function (my_result) {
        var k, file_len, list, index, i, j, k, key, len, block_len, block,
          section, src_list, valid_key_list, front, back, pass, param;

        // wrap chain in a separate method to preserve my_type value
        function fetchFile(my_name) {
          var src, data;

          src = 'data/' + my_name + '.json.js';

          function loadAsModule(my_spec) {
            return request(my_spec)
              .then(function (my_response) {
                data = my_response;
                return my_storage.post(data);
              })
              .then(function () {
                return data;
              })
              .caught(function() {
                return loadFromDisk({"url": my_spec[0].src.slice(0, -3)});
              });
          }

          function loadFromDisk(my_raw_src) {
            return jio.util.ajax(my_raw_src)
              .then(function (my_response) {
                data = util.parse(my_response.target.responseText);
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

        // start here
        // fetch definition from storage || embedded JSON (prod) || disk (dev)
        // TODO: this will never be robust
        // TODO: also, on regular alldocs calls, 0 should be possible
        if (my_result.data.total_rows === 0) {

          // assuming definitions are solely based on portal type and
          // reference portal type
          valid_key_list = ["portal_type", "reference_portal_type"];

          // TODO: this does not catch errors...!
          // TODO: add fallback in case keys are not specified, standard case!

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

          return Promise.all(list);
        }

        // just extract data, so it's ready to work with
        file_len = my_result.data.total_rows;
        for (k = 0; k < file_len; k += 1) {
          list.push(my_result.data.rows[k].data);
        }

        return list;
      });
    }

    /**
     * Digest a portal type by traversing portal type definitions
     * @method  digestType
     * @param   {Object}  my_storage  Storage to query
     * @param   {String}  my_type     Type to query
     * @returns {Object}  my_storage once all data is retrieved
     */
    storage.digestType = function (my_storage, my_type) {
      var type_list, resolver, query;

      type_list = [];

      function makeReferenceQuery(my_reference_list) {
        return [
          [
            {"portal_type": ["portal_definition"]},
            {"operator": "AND", "reference_portal_type": my_reference_list}
          ]
        ];
      }

      resolver = new Promise(function (resolve) {

        function handler(my_pass_store, my_query, my_parent_resolve) {
          return storage.query(my_pass_store, my_query)
            .then(function (my_result_list) {
              var i, len, iter, kids, pending_list, pender;

              // kids blockers will go in here
              pending_list = [];

              for (i = 0, len = my_result_list.length; i < len; i += 1) {
                iter = my_result_list[i];
                kids = iter.child_portal_type_list;

                // update type_list
                type_list.push(iter.reference_portal_type);
                // there are kids, so call handler on them
                if (kids !== null) {
                  pender = new Promise(function (pending_resolve) {
                    handler(my_storage, makeReferenceQuery(kids), pending_resolve);
                  });
                  pending_list.push(pender);
                }
              }

              // once child "branches" are resolved, resolve this one, too
              return Promise.all(pending_list)
                .then(function () {
                  my_parent_resolve(type_list);
                });
            });
        }

        // start with first call
        return handler(my_storage, makeReferenceQuery([my_type]), resolve);
      });

      return resolver
        .then(function (my_type_list) {

          // TODO: can this be done easier?
          query = [
            [
              {"portal_type": ["portal_fields"]},
              {"operator": "AND", "reference_portal_type": my_type_list}
            ],
            [{"operator": "OR"}],
            [
              {"portal_type": ["portal_actions"]},
              {"operator": "AND", "reference_portal_type": my_type_list}
            ]
          ];

          return storage.query(my_storage, query);
        });
    }

    /**
     * Recover or create a storage
     * @method  recoverStorage
     * @param   {Object}  my_http_response    http response object
     * @returns {Object}  generated storage
     */
    storage.recoverStorage = function (my_http_response) {
      var portal_type = my_http_response._links.fallback.name;

      // need a flux
      return storage.createStorage("flux")
        .then(function (my_storage) {
          return storage.digestType(my_storage, portal_type);
        })
        .then(function (my_ready_flux) {
          // TODO: need to be ready here!
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

    return storage;
  });

}(window, document, JSON, atob));
