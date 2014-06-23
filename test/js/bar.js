declare("bar", ["baz"], function (module_list) {
  return {
    "sub_module": module_list[0],
    "test_value": true
  };
});