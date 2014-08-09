declare("xyz", ["baz"], function (baz) {

  var xyz = {
    "name": "xyz",
    "sub_module": baz,
    "test_value": true
  };

  return xyz;
});