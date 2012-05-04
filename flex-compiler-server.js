#!/usr/bin/env node

var log = require("./log.js")

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

if (require.main === module) {
  log.verbose = process.argv[2] === "--verbose"
  exports.createServer().listen(exports.socket)
  console.log("Listening to %s.", exports.socket)
}
