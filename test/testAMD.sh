#!/bin/bash

mkdir test/lib
cp zousan-plus-min.js* test/lib

# Grab requirejs library
cp node_modules/requirejs/require.js test/lib

# Tarsy testing library
cp node_modules/tarsy/src/tarsy.js test/lib