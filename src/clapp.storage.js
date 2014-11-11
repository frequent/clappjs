/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, document, declare, atob, JSON */
(function (window, document, JSON, atob) {
  "use strict";

  /* ====================================================================== */
  /*                              STORAGE                                   */
  /* ====================================================================== */

  /* ====================================================================== */
  /*                          Utility Functions                             */
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
     * When no storage is available, this will fetch the appropriate module
     * and help setting up storage
     * @method  setupStorage
     * @param   {String}    my_url_param      URL parameter if available
     * @param   {Object}    my_hate_response  HTTP response object
     * @returns {Object}    generated storage
     */
    storage.setupStorage = function (my_url_param, my_hate_response) {
      return request([{
        "name": 'creator',
        "src": '../../src/clapp.creator.js'
      }])
      .spread(function (my_creator_module) {
        storage = util.extend(storage, my_creator_module);

        return storage.resolveLocation(my_url_param) ||
          storage.recoverStorage(my_hate_response)
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

    return storage;
  });

}(window, document, JSON, atob));
