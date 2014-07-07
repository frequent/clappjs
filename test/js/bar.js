declare("bar", ["baz", "bum"], function (baz, bum) {

  var bar = {
    "name": "bar",
    "sub_module_1": baz,
    "sub_module_2": bum,
    "test_value": true
  };

  return bar;
});