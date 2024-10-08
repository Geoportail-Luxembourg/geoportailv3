# JS API

This directory contains utility scripts and source files for building and using
the JS API.

## Build JS API

```sh
make rebuild-js-api
```

## Development

The JS API comes with examples along with a handy server to make it easier for
the JS API developers.

Launch the following commands:

Start the local composition:
```
make run
```

In another console, start the dev server:
```
cd geoportal/jsapi/
npm i
npm run start
```
And open http://localhost:8000/examples/index.html
Other examples are available, see full list in the `examples` directory.

The JS API source code should follow the OpenLayers development guidelines.

Note: Some examples in `index.html` use a built version of OpenLayer 6.9.0 which can be found in `vendor/ol/`.
The `ol3_api.js` example ilustrates using OL alongside the Luxembourg JS API using ES6 imports from the node_modules package.
