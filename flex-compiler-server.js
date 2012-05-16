#!/usr/bin/env node

var log = require("./log.js")

exports.socket = "/tmp/flex-compiler-server.socket"

exports.createServer = function () {
  var net = require("net")
  var on_stream_line = require("on-stream-line")

  var shell = require("./flex-compiler-shell.js")()
  var server = new net.Server

  server.on("connection", function (socket) {
    socket.on("error", function (error) {
      log(error.stack)
    })

    on_stream_line(socket, function (line) {
      var args = JSON.parse(line)

      shell.run(args.shift(), args, function (ok, output) {
        socket.write(output)
        socket.end((ok ? "ok" : "not ok") + "\n")
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
