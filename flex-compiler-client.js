#!/usr/bin/env node

var log = require("./log.js")
var main = require("main")
var net = require("net")
var socket_name = require("./flex-compiler-server.js").socket

module.exports = function (command, stdout) {
  var socket = net.createConnection(socket_name, function () {
    socket.end(command + "\n")
    socket.pipe(stdout)
  })
}

module.exports.check = function (callback) {
  log.detail("Checking whether compiler server is avaliable...")

  net.createConnection(socket_name, function () {
    log.detail("Server is available.")
    callback(true)
  }).on("error", function () {
    log.detail("Server is not available.")
    callback(false)
  })
}

main.define(module, function (args) {
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
    log("Sending command to server: " + args.join(" "))
    module.exports(args.join(" "), process.stdout)
  }
})
