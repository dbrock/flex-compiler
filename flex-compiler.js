#!/usr/bin/env node

var fs = require("fs")
var log = require("./log.js")
var main = require("main")
var path = require("path")

fs.readdirSync(__dirname).forEach(function (filename) {
  var match = filename.match(/^flex-compiler-(.+)\.js$/)

  if (match) {
    exports[match[1].replace(/-/g, "_")] = require("./" + filename)
  }
})

main.define(module, function (args) {
  var program_name = path.basename(process.argv[1])

  log.parse_argv(args)

  if (program_name === "mxmlc" || program_name === "compc") {
    args.unshift(program_name)
  }

  exports.client.check(function (server_available) {
    if (server_available) {
      exports.client.__main__(args)
    } else {
      exports.shell.__main__(args)
    }
  })
})
