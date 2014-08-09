declare("wur", ["baz"], function (baz) {

  var wur = {
    "name": "wur",
    "sub_module": baz,
    "test_value": true
  };

  return wur;
});