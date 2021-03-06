/*jslint indent: 2, maxlen: 80, nomen: true, todo: true */
/*global console, declare, request */
(function (console, declare, request) {
  "use strict";

  /* ====================================================================== */
  /*                              STORAGE                                   */
  /* ====================================================================== */

  /* ====================================================================== */
  /*                       Helpers Functions (stay private)                 */
  /* ====================================================================== */

  /**
   * @description | Retrieve all storage types declared in a storage definition
   * @method      | retrieveStorageTypes
   * @param       | {object}, my_storage_definition, Storage definition
   * @param       | {array},  my_type_array,         Array of types found
   * @returns     | {array},  Array of types found
   **/
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
   * @description | Expand storage definition types to full module spec
   * @method      | generateModuleSpec
   * @param       | {array}, my_name_list,    List of modules to load
   * @returns     | {array}, List of modules with full spec
   **/
  function generateModuleSpec(my_name_list) {
    var i, len, item;

    for (i = 0, len = my_name_list.length; i < len; i += 1) {
      item = my_name_list[i];
      my_name_list[i] = {
        "name": item,
        "src": '../../lib/jio/' + item + '.js',
        "shim": true
      };
    }

    return my_name_list;
  }

  /**
   * @description | Build a qury string from parameters passed
   * @description | [
   * @description |   [{"pt": ["foo", "bar"]}, {"op": "AND", "cous": ["123"]}],
   * @description |   [{"op": "NOT"}],
   * @description |   [{...}, {...}]
   * @description | ]
   * @method      | buildQuery
   * @param       | {object}, my_query_dict,    Query parameters
   * @returns     | {string}, query string
   **/
  // TODO: Keep synatx, make generic
  function buildQuery(my_query_dict) {
    var i, j, k, len, block_len, block, section, query;

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
      .replace('( NOT )', ' NOT ', "g");

    return {"query": query};
  }

  /**
   * @description | Build a reference query object which will then be converted
   * @description | into the actual query from storage.query buildQuery call. 
   * @description | Method is necessary, because URL will just contain a 
   * @description | key=[module] and this method constructs the query object 
   * @description | necessary to look for objects defining this module
   * @method      | buildReferenceQueryObject
   * @param       | {array},  my_portal_type_list,  portal types list to query
   * @param       | {array},  my_reference_list,    list of values to query
   * @param       | {string}, my_key,               key to query values for
   * @returns     | query object
   **/
  // TODO: redo the section of assembling queries, keep syntax, make generic
  function buildReferenceQueryObject(my_portal_type_list, my_reference_list,
    my_key) {
    var i, len, obj, query_object;

    query_object = [];
    for (i = 0, len = my_portal_type_list.length; i < len; i += 1) {
      if (i > 0) {
        query_object.push([{"operator": "OR"}]);
      }
      obj = {"operator": "AND"};
      obj[my_key] = my_reference_list;
      query_object.push([{"portal_type": [my_portal_type_list[i]]}, obj]);
    }

    return query_object;
  }

  /**
   * @description | Retrieve keys from a query dict
   * @method      | getQueryKeys
   * @param       | {array},   my_mock_query_list,    Query raw syntax
   * @returns     | {array},   key_list
   **/
  // TODO: make generic
  function getQueryKeys(my_query_list) {
    var i, i_len, j, j_len, param, key_list, query_dict, query_element;

    for (i = 0, i_len = my_query_list.length; i < i_len; i += 1) {
      key_list = key_list || [];
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
    * @description | Convert digestType response into a usable format, output:
    * @description | {
    * @description |   "type_tree": {"pt": "foo", "child_type": [{...}]},
    * @description |   "type_list": [
    * @description |     {"pt": "foo", "field_list": [...], "action_list": []},
    * @description |     {...}
    * @description |   ],
    * @description |   "base_dict: {"string_field": {...}}
    * @description | }
    * @method      | prettifyResponseList
    * @param       | {array},   my_response,    Response generated in digestType
    * @param       | {object},  my_util,        Utilities object
    * @returns     | {object},  response converted into usable format
    */
  function prettifyResponseList(my_response, my_util) {
    var type_tree, type_list, base_dict, string = 'String';

    function loopRecordSet(my_callback) {
      var i, i_len;

      for (i = 0, i_len = my_response.length; i < i_len; i += 1) {
        my_callback(my_response[i]);
      }
    }

    function setNode(my_title, my_child_list) {
      return {"portal_type": my_title, "child_type_list": my_child_list};
    }

    // TODO: redo, too complicated
    function locateOnTree(my_node, my_type, my_subtree) {
      var j, j_len, item, kids, tree = my_subtree || type_tree;

      // initial call
      if (tree === undefined) {
        type_tree = setNode(my_type, my_node.child_portal_type_list);
        return;
      }

      kids = tree.child_type_list || [];
      for (j = 0, j_len = kids.length; j < j_len; j += 1) {
        item = tree.child_type_list[j];
        if (item === my_type) {
          tree.child_type_list[j] =
            setNode(my_type, my_node.child_portal_type_list);
        } else {
          if (my_util.typeOf(item, string) !== true) {
            locateOnTree(my_node, my_type, item);
          }
        }
      }
    }

    // loop to retrieve portal definitions and set list
    // TODO: store actions and fields in list or dict? Best way to store base
    type_list = [];
    base_dict = {};
    loopRecordSet(function (my_record) {
      var reference;
      switch (my_record.portal_type) {
      case "base_fields":
        base_dict[my_record.reference_portal_type] = my_record;
        break;
      case "portal_definition":
        reference = my_record.reference_portal_type;
        locateOnTree(my_record, reference);
        type_list.push({
          "portal_type": reference,
          "action_list": [],
          "field_list": []
        });
        break;
      }
    });

    // can't be sure definitions come in first, so reloop to add fields/actions
    // TODO: not generic! No hardcoding field/actions/bla
    loopRecordSet(function (my_record) {
      var j, j_len, item;

      for (j = 0, j_len = type_list.length; j < j_len; j += 1) {
        item = type_list[j];
        if (my_record.reference_portal_type === item.portal_type) {
          switch (my_record.portal_type) {
          case "portal_field":
            item.field_list.push(my_record);
            break;
          case "portal_action":
            item.action_list.push(my_record);
            break;
          }
        }
      }
    });

    return {
      "type_tree": type_tree,
      "type_list": type_list,
      "base_dict": base_dict
    };
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
  }, {
    "name": 'util',
    "src": '../../src/clapp.util.js'
  }], function (jio, hasher, util) {
    var storage = {};

    /**
     * @description | Fetch and store a file as a module or from disk
     * @method      | fetchFile
     * @param       | {string},    my_name,     Name of file
     * @param       | {object},    my_storage,  Storage to save result to
     * @returns     | {promise},   resolve with retrieved content
     **/
    storage.fetchFile = function (my_name, my_storage) {
      var src, data;

      // load from disk
      function loadFromDisk(my_raw_src) {
        return jio.util.ajax(my_raw_src)
          .then(function (my_response) {
            var i, len, list;

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

      // load as a module
      function loadAsModule(my_spec) {
        return request(my_spec)
          .then(function (my_response) {
            var i, len, list;

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

          // stay with basic syntax to make sure any promise lib works
          .then(undefined, function () {
            return loadFromDisk({"url": my_spec[0].src.slice(0, -3)});
          });
      }

      src = 'data/' + my_name + '.json.js';

      // if built load as module, else from disk
      if (storage.is_built) {
        return loadAsModule([{"name": my_name, "src": src}]);
      }
      return loadFromDisk({"url": src.slice(0, -3)});
    };

    /**
     * @description | Retrieve a defintion from storage, try to load as module 
     * @description | or from file
     * @method      | query
     * @param       | {object},  my_storage,      Storage to query
     * @param       | {string},  my_query_dict,   Query parameters
     * @param       | {object},  my_param_dict,   Request parameters
     * @returns     | {promise}, resolve with query result
     **/
    storage.query = function (my_storage, my_query_dict, my_param_dict) {
      var query;

      query = util.extend(
        buildQuery(my_query_dict),
        my_param_dict || {"include_docs": true}
      );

      // NOTE: storage uses RSVP, so .caught does not work. .fail will, so to
      // make sure the chain does not break use underlying syntax
      return my_storage.allDocs(query)
        .then(function (my_result) {
          var file_len, list, index, i, j, k, len, block_len, block, section,
            src_list, valid_key_list, front, back, param;

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
                  if (section.hasOwnProperty(param)) {
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
              }

              // need to create src_list and unload here, to handle multiple
              // query segments (... AND ...) AND (... OR ...)
              src_list = ["x"].concat(back)
                .join("|" + front + "_").split("|").splice(1, back.length);

              // drop off
              for (k = 0, file_len = src_list.length; k < file_len; k += 1) {
                list.push(storage.fetchFile(src_list[k], my_storage));
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
    };

    /**
     * @description | Digest a portal type by looking up portal_definition of 
     * @description | the requested portal type and subsequent required portal 
     * @description | types to gather all configuration objects required. The 
     * @description | method will traverse for a respective portal type and 
     * @description | collect information on dependent portal types which will 
     * @description | be queried once all required definitions have been loaded
     * @description | (eg. portal definition > portal actions)
     * @method      | digestType
     * @param       | {object},  my_storage,  Storage to query
     * @param       | {string},  my_type,     Type to query
     * @param       | {array},   my_key_list, Values to query
     * @param       | {string},  my_key,      Key for which to query values
     * @param       | {array},   my_digest_response_list, Response returned at end
     * @returns     | {promise}, resolve with my_storage when done
     **/
    // TODO: cleanup, rewrite syntax, so it's understandable
    storage.digestType = function (my_storage, my_value_list,
        my_portal_type_list, my_key, my_digest_response_list) {
      var traversal, digest_response_list,
        key, value_list, portal_type_list,
        next_key, next_value_list, next_portal_type_list;

      // parameters for this digest call
      portal_type_list = my_portal_type_list || ["portal_definition"];
      key = my_key || "reference_portal_type";
      value_list = my_value_list;

      // placeholders for dependency query built during traversal
      next_portal_type_list = [];
      next_value_list = [];

      // final response list
      digest_response_list = my_digest_response_list || [];

      // this is the traversing promise. If a response has kids that need to
      // be queried, the resolve of the parent is passed to the child in a
      // new call to handler. If there are no more kids, the current parent
      // is resolved which resolves all parent promises while traversing up
      traversal = new Promise(function (resolve, reject) {

        function handler(my_pass_store, my_query, my_parent_resolve,
          my_parent_reject) {
          return storage.query(my_pass_store, my_query)
            .then(function (my_response) {
              var i, j, len_i, len_j, deps, iter, kids, pending_list, content;

              function makePender(my_type_list, my_kids, my_key) {
                return new Promise(function (pending_resolve, pending_reject) {
                  handler(
                    my_storage,
                    buildReferenceQueryObject(my_type_list, my_kids, my_key),
                    pending_resolve,
                    pending_reject
                  );
                });
              }

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
                  if (next_value_list.indexOf(iter[next_key]) === -1) {
                    next_value_list.push(iter[next_key]);
                  }
                }

                // kids will trigger recursive handler() calls
                if (kids !== null) {
                  pending_list.push(makePender(portal_type_list, kids, key));
                }
              }

              // once all kids have been loaded, resolve the respective parent
              return Promise.all(pending_list)
                .then(function (my_kids_response_list) {
                  var return_list, l, l_len, list = my_kids_response_list;

                  // merge what kids return
                  // TODO: how to merge n arrays in a single command
                  if (list.length === 0) {
                    return_list = content;
                  } else {
                    return_list = content;
                    for (l = 0, l_len = list.length; l < l_len; l += 1) {
                      return_list = return_list.concat(list[l][3]);
                    }
                  }

                  my_parent_resolve([
                    next_value_list,
                    next_portal_type_list,
                    next_key, return_list
                  ]);
                });
            })
            // Catch errors and empty queries resulting in 404 in fallback
            // queries. Note, that jio depends on RSVP, which uses "fail" vs
            // bluebird "caught/catch". Use base promise syntax to make sure
            // the chain does not break!
            // TODO: it should not be necessary to catch here!!!
            .then(undefined, function (my_error) {
              my_parent_reject(my_error);
            });
        }

        // start loading definitions: first call to handler, pass both resolve
        // and reject, so errors can be caught, also pass global response array
        // to hold results of this recursive call to handler
        return handler(
          my_storage,
          buildReferenceQueryObject(portal_type_list, value_list, key),
          resolve,
          reject
        );
      });

      // start:
      return traversal

        // done, resolving the last promise returns follow up call parameters
        .then(function (my_new_digest_parameter_list) {
          var param_list;

          // add storage and update global result list (4th parameter)
          param_list = [my_storage].concat(my_new_digest_parameter_list);
          param_list[4] = digest_response_list.concat(param_list[4]);

          // we are not done if next_key (portal_type) contains something
          if (param_list[3] !== undefined) {
            return storage.digestType.apply(null, param_list);
          }

          // all loaded, generate response and pass back to main loop
          return prettifyResponseList(param_list[4], util);
        });
    };

    /**
     * @description | Create a new storage. If nothing is specified it will be 
     * @description | on memory. Note that all storage (js) files requested will
     * @description | be fetched based on the defined spec before creating and 
     * @description | returning the storage.
     * @method      | createStorage
     * @param       | {string},    my_name,   Name of the storage
     * @param       | {object},    my_config, Storage configuration
     * @returns     | {promise},   resolve with generated storage
     **/
    storage.createStorage = function (my_name, my_config) {
      var spec;

      // spec is either passed or fallback to memory
      spec = my_config || {
        "type": 'local',
        "mode": 'memory',
        "username": my_name,
        "application_name": my_name
      };

      // load all storages as modules plus their dependencies
      return request(generateModuleSpec(retrieveStorageTypes(spec)))
        .then(function () {
          var new_store = jio.createJIO(spec);
          return new_store;
        });
    };

    /**
     * @description | Retrieve data from storage (structural and data)
     * @method      | retrieveData
     * @param       | {object},  my_store,            storage to access
     * @param       | {object},  my_http_response,    http response object
     * @returns     | {promise}, resolve with structural info and data for render
     **/
    storage.retrieveData = function (my_store, my_http_response) {
      var portal_type = hasher.getUrlQueryParam(
        "key",
        my_http_response._links.fallback.href
      );

      return storage.digestType(my_store, [portal_type])
        .then(function () {
          console.log("et viola");
        });
    };

    return storage;
  });

}(console, declare, request));
