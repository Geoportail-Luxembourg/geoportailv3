FROM camptocamp/geomapfish-build-dev:2.3.5.3
LABEL maintainer Camptocamp "info@camptocamp.com"

WORKDIR /app

COPY requirements.txt /app
RUN pip install --disable-pip-version-check --no-cache-dir --no-deps -r requirements.txt

COPY package.json /app
RUN npm install --no-optional && \
  npm cache clear

RUN \
  node_modules/.bin/svg2ttf node_modules/ngeo/contribs/gmf/fonts/gmf-icons.svg \
    node_modules/ngeo/contribs/gmf/fonts/gmf-icons.ttf && \
  node_modules/.bin/ttf2eot node_modules/ngeo/contribs/gmf/fonts/gmf-icons.ttf \
    node_modules/ngeo/contribs/gmf/fonts/gmf-icons.eot && \
  node_modules/.bin/ttf2woff node_modules/ngeo/contribs/gmf/fonts/gmf-icons.ttf \
    node_modules/ngeo/contribs/gmf/fonts/gmf-icons.woff

RUN \
  mkdir --parents /opt/angular-locale && \
  for LANG in en fr de it en-ch fr-ch de-ch it-ch; \
  do \
    curl --output /opt/angular-locale/angular-locale_$LANG.js https://raw.githubusercontent.com/angular/angular.js/v`grep '"angular"' /usr/lib/node_modules/ngeo/package.json | cut --delimiter \" --fields 4 | tr --delete '\r\n'`/src/ngLocale/angular-locale_$LANG.js; \
  done && \
  adduser www-data root

#ENV NODE_PATH=/usr/lib/node_modules \
#    LOG_LEVEL=INFO \
#    GUNICORN_ACCESS_LOG_LEVEL=INFO \
#    C2CGEOPORTAL_LOG_LEVEL=WARN \
#    PGHOST=db \
#    PGHOST_SLAVE=db \
#    PGPORT=5432 \
#    PGUSER=www-data \
#    PGPASSWORD=www-data \
#    PGDATABASE=geomapfish \
#    PGSCHEMA=main \
#    PGSCHEMA_STATIC=main_static \
#    TINYOWS_URL=http://tinyows/ \
#    MAPSERVER_URL=http://mapserver/ \
#    PRINT_URL=http://print:8080/print/

COPY . /app

ENV INTERFACES=main

RUN pykwalify --data-file config.yaml --schema-file CONST_config-schema.yaml

RUN INTERFACE=main NODE_ENV=production node_modules/.bin/webpack --mode=production --debug

RUN \
    ls -1 geoportailv3_geoportal/static-ngeo/build/*.html|while read file; do mv ${file} ${file}.tmpl; done && \
    ls -1 geoportailv3_geoportal/static-ngeo/build/*.css|while read file; do mv ${file} ${file}.tmpl; done

# For webpack-dev server
RUN mv webpack.apps.js webpack.apps.js.tmpl

ARG GIT_HASH

RUN pip install --disable-pip-version-check --no-cache-dir --editable=/app/ && \
    python -m compileall -q /app/geoportailv3_geoportal -x /app/geoportailv3_geoportal/static.* && \
    c2cwsgiutils_genversion.py $GIT_HASH

ENTRYPOINT [ "/usr/bin/eval-templates" ]
CMD ["c2cwsgiutils_run"]
