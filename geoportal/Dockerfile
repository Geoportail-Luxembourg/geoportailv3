FROM camptocamp/geomapfish-tools:2.5.0.77 as builder
LABEL maintainer Camptocamp "info@camptocamp.com"

# new packages according to upgrade in progress
RUN \
  # . /etc/os-release && \
  # echo "deb https://deb.nodesource.com/node_12.x ${VERSION_CODENAME} main" > /etc/apt/sources.list.d/nodesource.list && \
  # curl --silent https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - && \
  apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install --assume-yes --no-install-recommends \
    wget openjdk-8-jdk \
    slapd ldap-utils \
    mutt \
    gettext libxml2-utils \
    nodejs \
    vim \
    ghostscript \
    libgs-dev \
    imagemagick && \
  apt-get purge python3-pip python3-setuptools python3-wheel --assume-yes
  # && \
  # apt-get clean && \
  # rm -rf /var/lib/apt/lists/*

RUN sed -i 's/rights="none" pattern="PDF"/rights="read" pattern="PDF"/g' /etc/ImageMagick-6/policy.xml


WORKDIR /app
# RUN cp -r /usr/lib/node_modules/ngeo/dist .
COPY webpack.*.js Makefile CONST_Makefile ls.js /app/
COPY geoportailv3_geoportal/static-ngeo /app/geoportailv3_geoportal/static-ngeo
COPY package.json /app

RUN \
    npm-packages --src=package.json --dst=/tmp/npm-packages && \
    npm install --no-optional --global --unsafe-perm --no-package-lock `cat /tmp/npm-packages` && \
    npm cache clear --force

# RUN mv dist /usr/lib/node_modules/ngeo/
# RUN mkdir -p /usr/lib/node_modules/ngeo/dist
# RUN cp dist/vendor-manifest.json /usr/lib/node_modules/ngeo/dist
# RUN rm -r dist

RUN NODE_ENV=development CI=true make apps
# RUN cp /etc/static-ngeo/vendor-manifest.json node_modules/ngeo/dist/

COPY . /app

# jsapi generation
RUN mkdir /opt/apiv3
WORKDIR /opt/apiv3
RUN mkdir -p /opt/apiv3/.build/externs
RUN wget -O /opt/apiv3/.build/externs/angular-1.6.js https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/angular-1.6.js
RUN wget -O /opt/apiv3/.build/externs/angular-1.6-q_templated.js https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/angular-1.6-q_templated.js
RUN wget -O /opt/apiv3/.build/externs/angular-1.6-http-promise_templated.js https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/angular-1.6-http-promise_templated.js
RUN wget -O /opt/apiv3/.build/externs/jquery-1.9.js https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/jquery-1.9.js
COPY ./jsapi/package.json /opt/apiv3/
RUN npm install --no-optional && npm cache clear --force
ADD ./jsapi /opt/apiv3/jsapi
RUN /opt/apiv3/jsapi/rebuild_api.sh

WORKDIR /app

# RUN make checks
RUN make build
# For webpack-dev server
RUN mv webpack.apps.js webpack.apps.js.tmpl

RUN mkdir -p /etc/static-ngeo/build
RUN ./generate_i18n.sh

RUN pykwalify --data-file config.yaml --schema-file CONST_config-schema.yaml

RUN \
    ls -1 /etc/static-ngeo/build/*.html|while read file; do mv ${file} ${file}.tmpl; done && \
    ls -1 /etc/static-ngeo/build/*.css|while read file; do mv ${file} ${file}.tmpl; done


COPY luxembourg_requirements.txt /tmp/
RUN pip install setuptools
RUN pip install --disable-pip-version-check --no-cache-dir --requirement /tmp/luxembourg_requirements.txt

ENTRYPOINT [ "/usr/bin/eval-templates" ]
CMD [ "webpack-dev-server", "--mode=development", "--debug", "--watch", "--progress", "--no-inline" ]

###############################################################################

FROM camptocamp/geomapfish:2.5 as runner

COPY luxembourg_requirements.txt /tmp/
RUN pip install --disable-pip-version-check --no-cache-dir --requirement /tmp/luxembourg_requirements.txt

WORKDIR /app
COPY . /app
COPY --from=builder /app/geoportailv3_geoportal/locale/ /app/geoportailv3_geoportal/locale/
COPY --from=builder /usr/lib/node_modules/ngeo/dist/* /etc/static-ngeo/
COPY --from=builder /etc/static-ngeo/* /etc/static-ngeo/
COPY --from=builder /app/alembic.ini /app/alembic.yaml ./
RUN chmod go+w /etc/static-ngeo/ \
    /app/geoportailv3_geoportal/locale/ \
    /app/geoportailv3_geoportal/locale/*/LC_MESSAGES/geoportailv3_geoportal-client.po

RUN pip install --disable-pip-version-check --no-cache-dir --editable=/app/ && \
    python3 -m compileall -q /usr/local/lib/python3.7 \
        -x '/usr/local/lib/python3.7/dist-packages/(pydevd|ptvsd|pipenv)/' && \
    python3 -m compileall -q /app/geoportailv3_geoportal -x /app/geoportailv3_geoportal/static.*

## lux part
COPY package.json /app
# RUN \
#     npm-packages --src=package.json --dst=/tmp/npm-packages && \
#     npm --no-optional --global --unsafe-perm --no-package-lock install `cat /tmp/npm-packages` && \
#     npm cache clear --force
# # RUN npm install --prefix /usr/lib --no-optional && npm cache clear --force
COPY --from=builder /usr/lib/node_modules /usr/lib


COPY ./ng_locale_downloader.sh /app
RUN \
  mkdir --parents /opt/angular-locale && \
  for LANG in en de fr lb; \
  do \
    ./ng_locale_downloader.sh $LANG; \
  done && \
  adduser www-data root


RUN mkdir -p /app/geoportailv3_geoportal
# RUN mkdir /app/node_modules/ngeo/dist/
# RUN mkdir -p /usr/lib/node_modules/ngeo/dist/
# # RUN cp /etc/static-ngeo/vendor-manifest.json node_modules/ngeo/dist/
# COPY --from=builder /usr/lib/node_modules/ngeo/dist/vendor-manifest.json /usr/lib/node_modules/ngeo/dist
COPY ./geoportailv3_geoportal/static-ngeo/ /app/geoportailv3_geoportal/static-ngeo/
COPY ./webpack.apps.js ./webpack.config.js /app/
# RUN cp -r node_modules/* /usr/lib/node_modules
# RUN cp -r node_modules/.bin /usr/lib/node_modules
# # RUN cp -r node_modules/@* /usr/lib/node_modules
# RUN rm -r node_modules
# RUN INTERFACE=main NO_DEV_SERVER=TRUE NODE_ENV=development /usr/lib/node_modules/.bin/webpack --mode=development --debug
#RUN INTERFACE=main NODE_ENV=production node_modules/.bin/webpack --mode=production --debug

# RUN mkdir -p /app/geoportailv3_geoportal
# COPY ./geoportailv3_geoportal/static-ngeo/ /etc/static-ngeo/
# COPY ./webpack.apps.js ./webpack.config.js /app/
# RUN cd /etc/static-ngeo && ln -s /app/node_modules
# RUN cp node_modules/\@fortawesome/fontawesome-free/webfonts/* /etc/static-ngeo/webfonts/
# #RUN INTERFACE=main NO_DEV_SERVER=TRUE NODE_ENV=development node_modules/.bin/webpack --mode=development --debug
# RUN INTERFACE=main NODE_ENV=production node_modules/.bin/webpack --mode=production --debug
# RUN mkdir -p /etc/static-ngeo/build

# no idea why this will not work
# COPY ./bin/* /usr/bin/     # has custom eval-templates and alembic launcher

# RUN mkdir /etc/static-ngeo/build

# RUN ./generate_i18n.sh

# RUN \
#     ls -1 /etc/static-ngeo/build/*.html|while read file; do mv ${file} ${file}.tmpl; done && \
#     ls -1 /etc/static-ngeo/build/*.css|while read file; do mv ${file} ${file}.tmpl; done

# # For webpack-dev server
# RUN mv webpack.apps.js webpack.apps.js.tmpl
### end lux part

COPY setup.py /app/
RUN \
  python3 setup.py install && \
  # for mypy
  touch /usr/local/lib/python3.7/dist-packages/zope/__init__.py && \
  touch /usr/local/lib/python3.7/dist-packages/c2c/__init__.py && \
  rm --recursive --force /tmp/* /var/tmp/* /root/.cache/*

ARG GIT_HASH
RUN c2cwsgiutils_genversion.py ${GIT_HASH}

ARG PGSCHEMA
ENV PGSCHEMA=${PGSCHEMA}

RUN cp bin/eval-templates /usr/bin

RUN chmod go+w /app  # to enable eval-templates to write into the folder

# patch c2cgeoportal in case of void urls:
RUN sed -i -e "s/    return add_spliturl_params/    if not url:\n        url = ''\n    return add_spliturl_params/" \
        /opt/c2cgeoportal/geoportal/c2cgeoportal_geoportal/lib/__init__.py


ENTRYPOINT [ "/usr/bin/eval-templates" ]
CMD ["c2cwsgiutils_run"]

ENV VISIBLE_ENTRY_POINT=/ \
    AUTHTKT_TIMEOUT=86400 \
    AUTHTKT_REISSUE_TIME=9000 \
    AUTHTKT_MAXAGE=86400 \
    AUTHTKT_COOKIENAME=auth_tkt \
    AUTHTKT_HTTP_ONLY=True \
    AUTHTKT_SECURE=True \
    AUTHTKT_SAMESITE=Lax \
    BASICAUTH=False \
    LOG_LEVEL=INFO \
    C2CGEOPORTAL_LOG_LEVEL=INFO \
    C2CWSGIUTILS_LOG_LEVEL=INFO \
    GUNICORN_LOG_LEVEL=INFO \
    SQL_LOG_LEVEL=WARN \
    DOGPILECACHE_LOG_LEVEL=INFO \
    OTHER_LOG_LEVEL=WARN
