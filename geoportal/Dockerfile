FROM camptocamp/geomapfish-tools:2.5.0.139 as builder
LABEL maintainer Camptocamp "info@camptocamp.com"

ARG HTTP_PROXY_URL
ENV http_proxy $HTTP_PROXY_URL
ARG HTTPS_PROXY_URL
ENV https_proxy $HTTPS_PROXY_URL

WORKDIR /app

RUN apt update && apt install openjdk-8-jdk-headless git -y && apt-get dist-upgrade -y
COPY package.json /app
RUN npm set progress=false && \
    npm-packages --src=/app/package.json --dst=/tmp/npm-packages && \
    npm install --no-optional --global --unsafe-perm --no-package-lock `cat /tmp/npm-packages` && \
    npm cache clear --force

COPY webpack.*.js Makefile CONST_Makefile /app/
COPY geoportailv3_geoportal/static-ngeo /app/geoportailv3_geoportal/static-ngeo
RUN rm -rf /usr/lib/node_modules/ngeo
RUN mv /app/geoportailv3_geoportal/static-ngeo/ngeo /usr/lib/node_modules/ngeo

COPY . /app

# jsapi generation
RUN mkdir /etc/apiv3
WORKDIR /etc/apiv3
RUN node --version
RUN mkdir -p /etc/apiv3/.build/externs && mkdir -p /etc/apiv3/build
RUN curl -s https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/angular-1.6.js -o /etc/apiv3/.build/externs/angular-1.6.js && \
    curl -s https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/angular-1.6-q_templated.js -o /etc/apiv3/.build/externs/angular-1.6-q_templated.js && \
    curl -s https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/angular-1.6-http-promise_templated.js -o /etc/apiv3/.build/externs/angular-1.6-http-promise_templated.js && \
    curl -s https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/jquery-1.9.js -o /etc/apiv3/.build/externs/jquery-1.9.js
COPY ./jsapi/package.json /etc/apiv3/
RUN npm install --no-optional && npm cache clear --force
ADD ./jsapi /etc/apiv3/jsapi
RUN /etc/apiv3/jsapi/rebuild_api.sh

WORKDIR /app
# sad fix, to allow webpack's file-loader to find files with query string & hash added
RUN ln -s /usr/lib/node_modules/@fortawesome/fontawesome-free/webfonts/fa-regular-400.eot /usr/lib/node_modules/@fortawesome/fontawesome-free/webfonts/fa-regular-400.eot?#iefix && \
    ln -s /usr/lib/node_modules/@fortawesome/fontawesome-free/webfonts/fa-regular-400.svg /usr/lib/node_modules/@fortawesome/fontawesome-free/webfonts/fa-regular-400.svg#fontawesome && \
    ln -s /usr/lib/node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.eot /usr/lib/node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.eot?#iefix && \
    ln -s /usr/lib/node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.svg /usr/lib/node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.svg#fontawesome


# RUN make checks
RUN make build

RUN make apps
RUN mv webpack.apps.js webpack.apps.js.tmpl
# put Cesium build in static-ngeo
RUN mkdir /etc/static-ngeo/Cesium && cp -r /usr/lib/node_modules/cesium/Build/Cesium/* /etc/static-ngeo/Cesium/
ENTRYPOINT [ "/usr/bin/eval-templates" ]
CMD [ "webpack-dev-server", "--mode=development", "--debug", "--watch", "--progress", "--no-inline" ]

###############################################################################

FROM camptocamp/geomapfish:2.5 as runner

ARG HTTP_PROXY_URL
ENV http_proxy $HTTP_PROXY_URL
ARG HTTPS_PROXY_URL
ENV https_proxy $HTTPS_PROXY_URL
RUN apt update && apt install vim -y
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install --assume-yes --no-install-recommends \
    ghostscript \
    libgs-dev \
    imagemagick && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

RUN sed -i 's/rights="none" pattern="PDF"/rights="read" pattern="PDF"/g' /etc/ImageMagick-6/policy.xml

COPY luxembourg_requirements.txt /tmp/requirements.txt
RUN \
  python3 -m pip install --upgrade pip && \
  python3 -m pip install setuptools==50.3.2 && \
  python3 -m pip install --disable-pip-version-check --no-cache-dir --requirement=/tmp/requirements.txt && \
  rm --recursive --force /tmp/* /var/tmp/* /root/.cache/*

WORKDIR /app
COPY . /app
COPY --chown=www-data:www-data --from=builder /app/geoportailv3_geoportal/locale/ /app/geoportailv3_geoportal/locale/
#COPY --chown=www-data:www-data --from=builder /usr/lib/node_modules/ngeo/dist/* /etc/static-ngeo/
COPY --chown=www-data:www-data --from=builder /etc/static-ngeo/ /etc/static-ngeo/
COPY --chown=www-data:www-data --from=builder /etc/static-ngeo/build/ /etc/static-ngeo/d7c6c320f7be4834954b8bf063492442/build/
COPY --chown=www-data:www-data --from=builder /etc/static-ngeo/build/ /etc/static-ngeo/4742262ea36e4a48827009c4d591e875/build/
COPY --chown=www-data:www-data --from=builder /etc/static-ngeo/build/ /etc/static-ngeo/not_used/build/

#COPY --from=builder /etc/apiv3/* /etc/apiv3/
RUN mkdir -p /app/geoportailv3_geoportal/jsapi/build/
COPY --from=builder /app/geoportailv3_geoportal/jsapi/build/apidoc /app/geoportailv3_geoportal/jsapi/build/apidoc
COPY --chown=www-data:www-data --from=builder /app/alembic.ini /app/alembic.yaml ./

#RUN chmod go+w /etc/static-ngeo/ \
#    /app/geoportailv3_geoportal/locale/ \
#    /app/geoportailv3_geoportal/locale/*/LC_MESSAGES/geoportailv3_geoportal-client.po

RUN pip install --disable-pip-version-check --no-cache-dir --editable=/app/ && \
    python3 -m compileall -q /usr/local/lib/python3.7 \
        -x '/usr/local/lib/python3.7/dist-packages/(pydevd|ptvsd|pipenv)/' && \
    python3 -m compileall -q /app/geoportailv3_geoportal -x /app/geoportailv3_geoportal/static.*

COPY ./bin/eval-templates /usr/bin/

ARG GIT_HASH
RUN c2cwsgiutils_genversion.py ${GIT_HASH}

ARG PGSCHEMA
ENV PGSCHEMA=${PGSCHEMA}

ENTRYPOINT [ "/usr/bin/eval-templates" ]
CMD ["c2cwsgiutils_run"]
RUN ln -s . geoportal
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
