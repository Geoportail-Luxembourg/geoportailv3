import {fromRollup} from '@web/dev-server-rollup';
import rollupCommonjs from '@rollup/plugin-commonjs';
import proxy from 'koa-proxies';

const commonjs = fromRollup(rollupCommonjs);
const proxyTarget = process.env.API_PROXY_TARGET || 'https://apiv4.geoportail.lu';

export default {
  // Redirect API/static calls to a remote API endpoint (default) or local stack.
  // Example local usage:
  // API_PROXY_TARGET=http://localhost:8080 npm run start
  port: 8000,
  middleware: [
    async (ctx, next) => {
      if (ctx.path === '/favicon.ico') {
        ctx.status = 204;
        return;
      }
      await next();
    },
    proxy(['/static-ngeo/', '/mymaps/', '/geocode/', '/profile.json', '/printproxy', /^\/fulltextsearch?/], {
      target: proxyTarget,
      changeOrigin: true,
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
