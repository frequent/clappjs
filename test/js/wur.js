declare("wur", ["baz"], function (module_list) {
  return {
    "name": "wur",
    "sub_module": module_list[0],
    "test_value": true
  };
});