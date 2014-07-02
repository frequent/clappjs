declare("ghi", ["baz"], function (module_list) {
  return {
    "name": "ghi",
    "sub_module": module_list[0],
    "test_value": true
  };
});