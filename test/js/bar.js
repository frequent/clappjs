declare("bar", ["baz", "bum"], function (baz, bum) {
  return {
    "name": "bar",
    "sub_module_1": baz,
    "sub_module_2": bum,
    "test_value": true
  };
});