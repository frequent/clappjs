declare(
  "wur",
  [{"name": "baz", "src": "js-test-files/baz.js"}],
  function (baz) {

    var wur = {
      "name": "wur",
      "sub_module": baz,
      "test_value": true
    };

    return wur;
  }
);