# JS API

This directory contains utility scripts and source files for building and using
the JS API.

## Build JS API (standalone)

From this directory only:

```sh
cd jsapi
nvm use
npm i
npm run build
```

This generates a complete output in `dist/`:

- `dist/apiv4.js`
- `dist/apiv4.css`
- `dist/build/apiv4-full-async.js`
- `dist/fonts/` and `dist/webfonts/`
- `dist/apidoc/`

All custom fonts needed by the build are vendored in `assets/fonts/`.
Node.js version is pinned in `.nvmrc` (18).

## Development (standalone)

Start the dev server from this folder:

```sh
cd jsapi
npm i
npm run start
```

Then open http://localhost:8000/examples/index.html

By default, API/static calls are proxied to `https://apiv4.geoportail.lu`.

Optional local proxy mode (if you run a local backend):

```sh
npm run start-local
```

Other examples are available in the `examples` directory.

## Optional Makefile shortcuts

From this folder:

```sh
make install
make build
make dev
make docker-build
```

The JS API source code should follow the OpenLayers development guidelines.

Note: Some examples in `index.html` use a built version of OpenLayer 6.9.0 which can be found in `vendor/ol/`.
The `ol3_api.js` example ilustrates using OL alongside the Luxembourg JS API using ES6 imports from the node_modules package.
