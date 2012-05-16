#!/usr/bin/env node

var fs = require("fs")
var log = require("./log.js")
var path = require("path")

fs.readdirSync(__dirname).forEach(function (filename) {
  var match = filename.match(/^flex-compiler-(.+)\.js$/)

  if (match) {
    exports[match[1].replace(/-/g, "_")] = require("./" + filename)
  }
})

exports.run = function (args, callback) {
  exports.client.check(function (server_available) {
    if (server_available) {
      exports.client.run(args, callback)
    } else {
      console.warn("\
Consider running `flex-compiler-server` for better performance.")
      exports.shell.run(args, callback)
    }
  })
}

require("./define-main.js")(module, function (args) {
  var program_name = path.basename(require("optimist").argv.$0)

  log.parse_argv(args)

  if (program_name === "mxmlc" || program_name === "compc") {
    args.unshift(program_name)
  }

  exports.run(args, function (ok, output) {
    process.stdout.write(output)
    process.exit(ok ? 0 : 1)
  })
})
