#!/usr/bin/env node

var log = require("./log.js")
var net = require("net")
var socket_name = require("./flex-compiler-server.js").socket

module.exports = function (command, stdout) {
  var socket = net.createConnection(socket_name, function () {
    socket.end(command + "\n")
    socket.pipe(stdout)
  })
}

module.exports.check = function (callback) {
  var socket = net.createConnection(socket_name, function () {
    callback(true)
  }).on("error", function () {
    callback(false)
  })
}

if (module === require.main) {
  var args = process.argv.slice(2)

  log.verbose = args[0] === "--verbose" && (args.shift(), true)

  if (args.length) {
    log("Sending command to server: " + args.join(" "))
    module.exports(args.join(" "), process.stdout)
  } else {
    log.detail("Checking whether compiler server is avaliable...")
    module.exports.check(function (ok) {
      log.detail(ok ? "Server is available." : "Server is not available.")
      process.exit(ok ? 0 : 1)
    })
  }
}
