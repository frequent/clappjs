declare(
  "xyz",
  [{"name": "baz", "src": "js-test-files/baz.js"}],
  function (baz) {

    var xyz = {
      "name": "xyz",
      "sub_module": baz,
      "test_value": true
    };

    return xyz;
  }
);