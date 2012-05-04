#!/bin/bash

if flex-compiler-client; then
  exec flex-compiler-client "$@"
else
  exec flex-compiler-shell "$@"
fi | simplify-flex-error
