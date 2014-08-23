declare(
  "bar",
  [
    {"name": "baz", "src": "js-test-files/baz.js"},
    {"name": "bum", "src": "js-test-files/bum.js"}
  ],
  function (baz, bum) {

    var bar = {
      "name": "bar",
      "sub_module_1": baz,
      "sub_module_2": bum,
      "test_value": true
    };

    return bar;
  }
);