declare(
  "ghi",
  [{"name": "baz", "src": "js-test-files/baz.js"}],
  function (baz) {

    var ghi = {
      "name": "ghi",
      "sub_module": baz,
      "test_value": true
    };

    return ghi;
  }
);