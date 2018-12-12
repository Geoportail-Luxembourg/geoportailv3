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

COPY ./ng_locale_downloader.sh /app
RUN \
  mkdir --parents /opt/angular-locale && \
  for LANG in en de fr lb; \
  do \
    ./ng_locale_downloader.sh $LANG; \
  done && \
  adduser www-data root


RUN mkdir -p /app/geoportailv3_geoportal
COPY ./geoportailv3_geoportal/static-ngeo/ /app/geoportailv3_geoportal/static-ngeo/
COPY ./webpack.apps.js ./webpack.config.js /app/
#RUN INTERFACE=main NODE_ENV=development node_modules/.bin/webpack --mode=development --debug
RUN INTERFACE=main NODE_ENV=production node_modules/.bin/webpack --mode=production --debug

COPY . /app

RUN pykwalify --data-file config.yaml --schema-file CONST_config-schema.yaml

RUN \
    ls -1 geoportailv3_geoportal/static-ngeo/build/*.html|while read file; do mv ${file} ${file}.tmpl; done && \
    ls -1 geoportailv3_geoportal/static-ngeo/build/*.css|while read file; do mv ${file} ${file}.tmpl; done

# For webpack-dev server
RUN mv webpack.apps.js webpack.apps.js.tmpl

ARG GIT_HASH

RUN \
    pip install --disable-pip-version-check --no-cache-dir --editable=/app/c2cgeoportal/commons && \
    pip install --disable-pip-version-check --no-cache-dir --editable=/app/c2cgeoportal/geoportal && \
    pip install --disable-pip-version-check --no-cache-dir --editable=/app/c2cgeoportal/admin

RUN pip install --disable-pip-version-check --no-cache-dir --editable=/app/ && \
    python -m compileall -q /app/geoportailv3_geoportal -x /app/geoportailv3_geoportal/static.* && \
    c2cwsgiutils_genversion.py $GIT_HASH

ENTRYPOINT [ "/usr/bin/eval-templates" ]
CMD ["c2cwsgiutils_run"]
