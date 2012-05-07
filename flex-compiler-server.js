#!/usr/bin/env node

var log = require("./log.js")
var main = require("main")

exports.socket = "/tmp/flex-compiler-server.socket"

exports.createServer = function () {
  var net = require("net")
  var on_stream_line = require("on-stream-line")

  var fcsh = require("./flex-compiler-shell.js")()
  var server = new net.Server

  server.on("connection", function (socket) {
    on_stream_line(socket, function (line) {
      socket.pause()
      fcsh.run_command(line, function (result) {
        socket.end(result.join("\n") + "\n")
      })
    })
  })

  return server
}

main.define(module, function (args) {
  log.parse_argv(args)
  exports.createServer().listen(exports.socket)
  console.log("Listening to %s.", exports.socket)
})
