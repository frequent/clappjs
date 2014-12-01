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
   * Provide default properties vs recreating them on every call
   * @param   {Object}    default_dict    Default properties object
   */
  var default_dict = {
    "default_select_list": [
      'portal_type',
      'base_portal_type',
      'child_portal_type_list'
    ],
    "default_limit": [0,1]
  };

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
   * @method  buildQuery
   * @param   {Object}  my_option_dict    Parameters
   * @returns {String}  query string
   */
  function buildQuery(my_option_dict) {
    var param, query;

    function buildString(my_param, my_value) {
      switch (my_param) {
        case "base":
          return '(base_portal_type: "' +
            my_value.join('" OR base_portal_type: "') + '")';
      }
    }

    // start with portal type, remove it in case it was there
    query = 'portal_type: "' +
      (my_option_dict.portal_type || 'portal_type_definition') + '" AND ';
    delete my_option_dict.portal_type;

    // loop over remaining parameters
    for (param in my_option_dict) {
      if (my_option_dict.hasOwnProperty(param)) {
        query += buildString(param, my_option_dict[param]);
      }
    }

    return query;
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
     * @returns {Object}  portal_type_definition
     */
    storage.query = function (my_storage, my_query_dict, my_param_dict) {

      return my_storage.allDocs({
        "query": buildQuery({"base": my_query_dict}),
        "select_list": default_dict.select_list,
        "limit": default_dict.limit
      })
      .then(function (my_result) {
        var i, len, list;

        // wrap chain in a separate method to preserve my_type value
        function fetchFile(my_type) {
          var name, src, data;

          name = 'portal_type_definition' + '_' + my_type;
          src = 'data/' + name + '.json.js';

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

          if (storage.is_built) {
            return loadAsModule([{"name": name, "src": src}]);
          }
          return loadFromDisk({"url": src.slice(0, -3)});
        }

        list = [];

        // fetch definition from storage || embedded JSON (prod) || disk (dev)
        if (my_result.data.total_rows === 0) {
          for (i = 0, len = my_query_dict.length; i < len; i += 1) {
            list.push(fetchFile(my_query_dict[i]));
          }
          return Promise.all(list);
        }

        // just extract data, so it's ready to work with
        for (i = 0, len = my_result.data.total_rows; i < len; i += 1) {
          list.push(my_result.data.rows[i].data);
        }

        return list;
      });
    }

    /**
     * Digest a portal type by traversing portal type definitions and
     * collection field types and base fields and importing all into storage
     * @method  digestType
     * @param   {Object}  my_storage  Storage to query
     * @param   {String}  my_type     Type to query
     * @returns {Object}  my_storage once all data is retrieved
     */
    storage.digestType = function (my_storage, my_type) {
      var type_list, resolver;

      type_list = [];
      resolver = new Promise(function (resolve) {

        function handler(my_pass_store, my_type_list, my_parent_resolve) {
          return storage.query(my_pass_store, my_type_list, {})
            .then(function (my_result_list) {
              var i, len, iter, kids, pending_list, pender;

              // kids blockers will go in here
              pending_list = [];

              for (i = 0, len = my_result_list.length; i < len; i += 1) {
                iter = my_result_list[i];
                kids = iter.child_portal_type_list;

                // update type_list
                type_list.push(iter.base_portal_type);

                // there are kids, so call handler on them
                if (kids) {
                  pender = new Promise(function (pending_resolve) {
                    handler(my_storage, kids, pending_resolve);
                  });
                  pending_list.push(pender);
                }
              }

              // once existing branches are resolved, resolve this one, too
              return Promise.all(pending_list)
                .then(function (response_list) {
                  my_parent_resolve(type_list);
                });
            });
        }

        // start with first call
        return handler(my_storage, [my_type], resolve);
      });

      return resolver
        .then(function (my_type_list) {
          console.log("DONE");
          console.log(my_type_list);
          // type_list includes all params for querying field types
          // TODO: now fetch all fields related to this field type but also
          // test whether the fields could be included in the pt definition?
          // 
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
