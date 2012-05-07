#!/usr/bin/env node

var path = require("path")

module.exports = process.env.FLEX_HOME || process.env.FLEX4_HOME ||
  process.env.FLEX3_HOME || "/usr/local/flex"

if (!path.existsSync(module.exports)) {
  console.error(module.exports + ": directory does not exist")
  process.exit(1)
}

if (module === require.main) {
  console.log(module.exports)
}
