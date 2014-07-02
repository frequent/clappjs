declare("xyz", ["baz"], function (module_list) {
  return {
    "name": "xyz",
    "sub_module": module_list[0],
    "test_value": true
  };
});