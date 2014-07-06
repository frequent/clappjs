declare("xyz", ["baz"], function (baz) {
  return {
    "name": "xyz",
    "sub_module": baz,
    "test_value": true
  };
});