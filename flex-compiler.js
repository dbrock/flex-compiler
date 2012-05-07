fs.readdirSync(".").forEach(function (filename) {
  var match = filename.match(/^flex-compiler-(.+)\.js$/)

  if (match) {
    exports[match[1].replace(/-/g, "_")] = require("./" + filename)
  }
})
