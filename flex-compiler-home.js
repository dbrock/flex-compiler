#!/usr/bin/env node

var fs = require("fs")

module.exports = process.env.FLEX_HOME || process.env.FLEX4_HOME ||
  process.env.FLEX3_HOME || "/usr/local/flex"

if (!fs.existsSync(module.exports)) {
  console.error(module.exports + ": directory does not exist")
  process.exit(1)
}

require("./define-main.js")(module, function (args) {
  console.log(module.exports)
})
