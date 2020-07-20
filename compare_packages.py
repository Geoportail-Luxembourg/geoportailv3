#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# This script compares the npm packages version in the Luxembourg
# project with the ones in ngeo.
# Make sure to call "npm i" in the geoportal directory before running the script.

import json

with open('./geoportal/package.json') as json_file:
    lux_deps = json.load(json_file)['devDependencies']
    with open('./geoportal/node_modules/ngeo/package.json') as ngeo_file:
      ngeo_deps = json.load(ngeo_file)['devDependencies']
      for name, version in lux_deps.items():
        if name in ngeo_deps:
          ngeo_version = ngeo_deps[name]
          if ngeo_version != version:
            print(name, version, '->', ngeo_version)
