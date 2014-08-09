declare("ghi", ["baz"], function (baz) {

  var ghi = {
    "name": "ghi",
    "sub_module": baz,
    "test_value": true
  };

  return ghi;
});