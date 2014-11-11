/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global window, document, declare */
(function (window, document) {
  "use strict";

  /* ====================================================================== */
  /*                              CREATOR                                   */
  /* ====================================================================== */

  /* ====================================================================== */
  /*                          Utility Functions                             */
  /* ====================================================================== */

  // TODO: all methods must be on the object, so they are available, no?

  /**
   * =========================================================================
   *                          EXPOSED METHODS
   * =========================================================================
   */
  declare("creator", [{
    "name": 'jio',
    "src": '../../lib/jio/jio.js',
    "shim": true
  }, {
    "name": 'util',
    "src": '../../src/clapp.util.js'
  }], function (jio, util) {
    var creator = {};

    /**
     * Save a storage tree structure recursively
     * @method  saveStorageTree
     * @param   {String}  my_reference_id   Parent reference
     * @param   {Object}  my_spec           Storage specification
     * @param   {Object}  my_store          Storage module
     * @param   {Integer} my_count          Counter for recursive levels
     * @param   {String}  my_parent_id      Parent reference
     * @returns {Object}  Storage Tree
     */
    creator.saveStorageTree = function (my_reference_id, my_spec, my_store,
                                      my_count, my_parent_id) {
      var count, parent, self;

      self = this;
      count = my_count || 0;
      parent = my_parent_id || my_reference_id;

      // storage has sub_storage or list of storages, create handler first!
      if (my_spec.storage_list || my_spec.sub_storage) {
        return my_store.post({
          "portal_type": 'storage_handler',
          "reference": my_reference_id,
          "level": count,
          "parent": parent,
          "type": my_spec.type
        }).then(function (my_handler_dict) {
          var i, len, list, ops, sub_spec;

          // at this point sub_storage can safely be wrapped in array
          // NOTE: indices are done here to make first step generic
          list = my_spec.storage_list || [my_spec.sub_storage];
          for (i = 0, ops = [], len = list.length; i < len; i += 1) {
            sub_spec = list[i];
            sub_spec.indices = my_spec.indices || null;
            ops[i] = self.saveStorageTree(
              my_reference_id,
              sub_spec,
              my_store,
              count + 1,
              my_handler_dict._id
            );
          }
          return Promise.all(ops);
        });
      }

      // No sub_storage/storag_list => plain storage object
      return self.saveStorage(
        'storage_definition',
        my_reference_id,
        my_spec,
        my_store,
        count,
        parent
      );
    }

   /**
    * Save a storage and associated indices
    * @method    saveStorage
    * @param     {String}    my_type       Type of storage
    * @param     {String}    my_reference  Reference for association
    * @param     {Object}    my_spec       Storage definition
    * @param     {Object}    my_storage    Current storage
    * @param     {Integer}   my_count      Recursive level counter
    * @param     {String}    my_parent     Parent element reference
    * @returns   {Promise}
    */
    creator.saveStorage = function (my_type, my_reference, my_spec,
                                    my_storage, my_count, my_parent) {
      var self;

      self = this;
      return my_storage.get({
        "_id": my_type + '_module'
      }).then(function (my_module_definition) {
        var obj;

        obj = self.generateDoc(my_module_definition, my_spec);
        obj.portal_type = my_type;
        obj.parent = my_parent || my_reference;
        obj.reference = my_reference;
        obj.level = my_count;

        return my_storage.post(obj);
      }).then(function (my_new_storage_object) {
        var store_indices, i, len, index_list;

        store_indices = [];
        index_list = my_spec.inidices || [];

        for (i = 0, len = index_list.length; i < len; i += 1) {
          store_indices[i] = self.saveStorage(
            'storage_index',
            my_reference,
            {
              'index_field_list': index_list[i],
              'storage_reference': my_parent
            },
            my_storage,
            my_count
          );
        }
        return Promise.all(store_indices);
      });
    };

    /**
     * Build the storage location object based on information stored in flux
     * @method  assembleStorageLocation
     * @param   {Object}    my_storage    Storage to query
     * @returns {Object}    Storage Tree dict
     */
    creator.assembleStorageLocation = function (my_storage) {
      var reference_id, self;

      self = this;
      return my_storage.allDocs({
        "query": 'portal_type: "storage_location"'
      }).then(function (my_constructor_list) {
        var response;

        // NOTE: assume one location, so one constructor only!
        response = my_constructor_list.response.data.rows[0];
        reference_id = response._id;

        return my_storage.allDocs({
          "query": 'reference: "' + reference_id + '"',
          "include_docs": true
        });
      }).then(function (my_element_list) {
        var response;

        response = my_element_list.response.data.rows;
        return self.buildTreeDict(response, reference_id);
      });
    };

    /**
     * Recursively build location dict
     * @method  buildTreeDict
     * @param   {Array}   my_element_list List of elements to build
     * @param   {String}  my_parent   Reference to parent element
     * @param   {Integer} my_count    Counter for recursive levels
     * @returns {Object}  Storage tree
     */
    creator.buildTreeDict = function (my_element_list, my_parent, my_count) {
      var i, j, len, count, element, next_list, dict, next, next_len, plus,
        id, indices, self;

      self = this;
      next_list = [];
      count = my_count || 0;
      dict = {};
      len = my_element_list.length;

      // find current element (there should only be one node at all times)
      for (i = 0; i < len; i += 1) {
        element = my_element_list[i];

        if (element.level === count && element.parent === my_parent) {
          dict = self.buildStorageDict(dict, element);
        }
      }

      id = dict._id;
      plus = count + 1;

      // separate loop, because can't be sure first element is declared first
      for (j = 0; j < len; j += 1) {
        next = my_element_list[j];
        if (next.level === plus && next.parent === id) {
          next_list.push(next);
        }
      }

      next_len = next_list.length;

      // handle sub_storage or storage_list (will also run for length = 0)
      if (next_len === 1) {
        dict.sub_storage = self.buildTreeDict(my_element_list, id, plus);
        indices = dict.indices || [];
        for (l = 0, indices_len = indices.length; l < indices_len; l += 1) {
          dict.indices = dict.indices || [];
          dict.indices.push(self.buildStorageDict({}, indices[l]));
        }
      } else {
        for (k = 0; k < next_len; k += 1) {
          dict.storage_list = dict.storage_list || [];
          dict.storage_list.push(
            self.buildTreeDict(my_element_list, id, plus)
          );
        }
      }

      return dict;
    };

    /**
    * Build a dict object (filtering out parameters used internally)
    * @method  buildStorageDict
    * @param   {Object}  my_current_dict   Current storage object
    * @param   {Object}  my_element        Parameter to add to current_dict
    * @returns {Object}  updated dict
    */
    creator.buildStorageDict = function (my_current_dict, my_element) {
      var param;

      for (param in my_element) {
        if (my_element.hasOwnProperty(param)) {
          switch (param) {
            case 'portal_type':
            case 'reference':
            case 'level':
            case 'parent':
              break;
            default:
            my_current_dict[param] = my_element[param];
              break;
          }
        }
      }
      return obj;
    };

    /**
     * Recover or create a storage location
     * @method  recoverStorage
     * @param   {Object}    my_http_response    http response object
     * @returns {Object}  generated storage
     */
    creator.recoverStorage = function (my_http_response) {
      var locator, flux;

      // there is neither a url nor current storage, so it has to be made
      // start by creating flux and fetching "find" fallback
      return this.createStorage("flux")
        .then(function (my_storage) {
          flux = my_storage;
          return flux.get({"_id": my_http_response._links.find.href});
        })
        .then(
          function (my_locator_module) {
            return my_locator_module.data;
          },
          function (my_locator_error) {
            console.log("GOTCHA");
            // ok, so this whole process should not be here, because normally
            // we will have a storage, so, in case we don't we call storage
            // fallback, which gets module and does magic?

            // default = fetch from disk, save, continue
            if (my_locator_error.status === 400) {
              return request([{ "name": 'storage_locator',
                "src": '../../src/clapp.storage_locator_module.js'
              }])
              .spread(function (my_locator_module) {
                locator = my_locator_module;
                return flux.post(my_locator_module);
              })
              .then(function () {
                return locator;
              });
            }
            throw my_locator_error;
        }).then(function (my_locator_module) {
          console.log("DADA!!!");
          console.log("I have a locator module, now what?");
          console.log(my_locator_module);
        });
    };

    /**
     * Try to resolve storage location from URL and create location
     * @method  resolveLocation
     * @param   {String}  my_url_param  URL parameter retrieved
     * @returns {Object}  generated storage
     */
    creator.resolveLocation = function (my_url_param) {
      var flux, spec, self;

      self = this;
      try {
        spec = JSON.parse(util.decode(atob(my_url_param)));
        flux = self.createStorage("flux");

        return flux.post({
          "portal_type": 'storage_location'
        }).then(function (my_location) {
          return self.saveStorageTree(my_location._id, spec, flux);
        }).then(function () {
          return self.assembleStorageLocation(flux);
        }).then(function (my_location_configuration) {

          // done with flux
          flux = null;
          return self.createStorage(my_location_configuration);
        });

      } catch (ex) {
        return undefined;
      }
    };


    return creator;
  });

}(window, document));
