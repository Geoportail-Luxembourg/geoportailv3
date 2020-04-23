FROM camptocamp/c2cwsgiutils:2
LABEL maintainer Camptocamp "info@camptocamp.com"
ARG HTTP_PROXY_URL
ENV http_proxy $HTTP_PROXY_URL
ARG HTTPS_PROXY_URL
ENV https_proxy $HTTPS_PROXY_URL

# Install Debian packages
RUN \
  . /etc/os-release && \
  apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install --assume-yes --no-install-recommends \
    wget openjdk-8-jdk \
    slapd ldap-utils \
    mutt \
    gettext libxml2-utils \
  && \
  apt-get purge python3-pip python3-setuptools python3-wheel --assume-yes && \
  echo "deb https://deb.nodesource.com/node_10.x ${VERSION_CODENAME} main" > /etc/apt/sources.list.d/nodesource.list && \
  curl --silent https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - && \
  apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install --assume-yes --no-install-recommends \
    nodejs && \
  apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install --assume-yes --no-install-recommends \
    ghostscript \
    libgs-dev \
    imagemagick && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

RUN sed -i 's/rights="none" pattern="PDF"/rights="read" pattern="PDF"/g' /etc/ImageMagick-6/policy.xml

WORKDIR /app

# Install python dependencies
RUN \
  curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
  python3 get-pip.py pip==19.0.3 wheel==0.33.1 setuptools==40.8.0

COPY upstream_requirements.txt /app/
RUN pip install --disable-pip-version-check --no-cache-dir --requirement upstream_requirements.txt

COPY luxembourg_requirements.txt /app/
RUN pip install --disable-pip-version-check --no-cache-dir --requirement luxembourg_requirements.txt

COPY setup.py /app/
RUN \
  python3 setup.py install && \
  # for mypy
  touch /usr/local/lib/python3.6/dist-packages/zope/__init__.py && \
  touch /usr/local/lib/python3.6/dist-packages/c2c/__init__.py && \
  rm --recursive --force /tmp/* /var/tmp/* /root/.cache/*


COPY bin/* /usr/bin/

RUN mkdir -p /app/geoportailv3_geoportal/admin
COPY geoportailv3_geoportal/admin/package.json /app/geoportailv3_geoportal/admin
RUN cd /app/geoportailv3_geoportal/admin && npm install --global && npm cache clear --force

COPY package.json /app
RUN npm install --no-optional && npm cache clear --force


# jsapi generation
RUN mkdir /app/apiv3
WORKDIR /app/apiv3
RUN mkdir -p /app/apiv3/.build/externs
RUN wget -O /app/apiv3/.build/externs/angular-1.6.js https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/angular-1.6.js


RUN wget -O /app/apiv3/.build/externs/angular-1.6-q_templated.js https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/angular-1.6-q_templated.js


RUN wget -O /app/apiv3/.build/externs/angular-1.6-http-promise_templated.js https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/angular-1.6-http-promise_templated.js


RUN wget -O /app/apiv3/.build/externs/jquery-1.9.js https://raw.githubusercontent.com/google/closure-compiler/master/contrib/externs/jquery-1.9.js
COPY ./jsapi/package.json /app/apiv3/
RUN npm install --no-optional && npm cache clear --force

WORKDIR /app

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

RUN cd /app/geoportailv3_geoportal/static-ngeo && ln -s ../../node_modules

RUN ./generate_i18n.sh

RUN pykwalify --data-file config.yaml --schema-file CONST_config-schema.yaml

RUN \
    ls -1 geoportailv3_geoportal/static-ngeo/build/*.html|while read file; do mv ${file} ${file}.tmpl; done && \
    ls -1 geoportailv3_geoportal/static-ngeo/build/*.css|while read file; do mv ${file} ${file}.tmpl; done

# For webpack-dev server
RUN mv webpack.apps.js webpack.apps.js.tmpl

ARG GIT_HASH

RUN pip install --disable-pip-version-check --no-cache-dir --editable=/app/ && \
    python -m compileall -q /app/geoportailv3_geoportal -x /app/geoportailv3_geoportal/static.* && \
    c2cwsgiutils_genversion.py $GIT_HASH

COPY ./tools/ /app/tools
RUN ln -s . geoportal

WORKDIR /app/apiv3
ADD ./jsapi /app/apiv3/jsapi
RUN /app/apiv3/jsapi/rebuild_api.sh
WORKDIR /app
ENTRYPOINT ["/usr/bin/eval-templates" ]
CMD ["c2cwsgiutils_run"]
