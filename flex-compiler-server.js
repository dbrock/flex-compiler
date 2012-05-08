#!/usr/bin/env node

var log = require("./log.js")

exports.socket = "/tmp/flex-compiler-server.socket"

exports.createServer = function () {
  var net = require("net")
  var on_stream_line = require("on-stream-line")

  var shell = require("./flex-compiler-shell.js")()
  var server = new net.Server

  server.on("connection", function (socket) {
    on_stream_line(socket, function (line) {
      var args = JSON.parse(line)

      shell.run_command(args.shift(), args, function (lines) {
        if (lines.length) {
          socket.write(lines.join("\n") + "\n")
        }

        socket.end()
      })
    })
  })

  return server
}

require("./define-main.js")(module, function (args) {
  log.parse_argv(args)
  exports.createServer().listen(exports.socket)
  console.log("Listening to %s.", exports.socket)
})
