#!/usr/bin/env node

var log = require("./log.js")
var net = require("net")
var socket_name = require("./flex-compiler-server.js").socket

module.exports = function (command, callback) {
  log("Sending command to server: " + command)

  var socket = net.connect(socket_name, function () {
    require("slurp-stream")(socket, callback)
    socket.end(command + "\n")
  })
}

module.exports.check = function (callback) {
  log.detail("Checking whether compiler server is avaliable...")

  var socket = net.connect(socket_name, function () {
    log.detail("Server is available.")
    callback(true)
    socket.end()
  }).on("error", function () {
    log.detail("Server is not available.")
    callback(false)
    socket.end()
  })
}

require("./define-main.js")(module, function (args) {
  var check

  log.parse_argv(args)

  if (args.length && /^-c|--check$/.test(args[0])) {
    args.shift(), check = true
  }

  if (check) {
    module.exports.check(function (server_available) {
      process.exit(server_available ? 0 : 1)
    })
  } else {
    // XXX: This will fail when quoting is needed.
    module.exports(args.join(" "), function (error, result) {
      if (error) {
        throw error
      } else if (result) {
        console.log(require("flex-simplify-error")(result))
      }
    })
  }
})
