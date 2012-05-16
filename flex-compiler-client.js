#!/usr/bin/env node

var filter_output = require("./filter-output.js")
var log = require("./log.js")
var net = require("net")
var socket_name = require("./flex-compiler-server.js").socket

module.exports = exports = function (command, callback) {
  command = JSON.stringify(command)

  log("Sending command to server: " + command)

  var socket = net.connect(socket_name, function () {
    require("slurp-stream")(socket, callback)
    socket.write(command + "\n")
  })
}

exports.check = function (callback) {
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

exports.run = function (args, callback) {
  exports(args, function (error, result) {
    if (error) {
      throw error
    } else {
      var match = result.match(/([\s\S]*(?:^|\n))((?:not )?ok)\n$/)

      if (match) {
        callback(match[2] === "ok", filter_output(match[1]))
      } else {
        process.stderr.write(result)
        console.error("\
flex-compiler-client: internal error: missing `ok` / `not ok` from server")
        process.exit(-1)
      }
    }
  })
}

require("./define-main.js")(module, function (args) {
  var check

  log.parse_argv(args)

  if (args.length && /^-c|--check$/.test(args[0])) {
    args.shift(), check = true
  }

  if (check) {
    exports.check(function (available) {
      process.exit(available ? 0 : 1)
    })
  } else {
    exports.run(args, function (ok, output) {
      process.stdout.write(output)
      process.exit(ok ? 0 : 1)
    })
  }
})
