import {fromRollup} from '@web/dev-server-rollup';
import rollupCommonjs from '@rollup/plugin-commonjs';
import proxy from 'koa-proxies';

const commonjs = fromRollup(rollupCommonjs);

export default {
  //redirect to use apiv4loader, static ressources and APIs from docker compo
  port: 8000,
  middleware: [
    proxy(['/apiv4loader.js', '/static-ngeo/', '/mymaps/', '/geocode/', /^\/fulltextsearch?/], {
      target: 'http://localhost:8080/',
    }),
  ],
  plugins: [
    commonjs({
      include: [
        // the commonjs plugin is slow, list the required packages explicitly:
        '**/node_modules/mapbox-gl/dist/*',
      ]
    })
  ]
};
