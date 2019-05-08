FROM debian:stretch
LABEL maintainer Camptocamp "info@camptocamp.com"
ARG HTTP_PROXY_URL
ENV http_proxy $HTTP_PROXY_URL
ARG HTTPS_PROXY_URL
ENV https_proxy $HTTPS_PROXY_URL

RUN \
  apt-get update && \
  apt-get install --assume-yes --no-install-recommends gettext-base python3 && \
  apt-get clean && \
  rm --recursive --force /var/lib/apt/lists/*

COPY . /tmp/config/

RUN mv /tmp/config/bin/* /usr/bin/ && \
    mkdir --parent /usr/local/tomcat/webapps/ROOT/ && \
    if [ -e /tmp/config/print ]; then mv /tmp/config/print/print-apps /usr/local/tomcat/webapps/ROOT/; fi && \
    chmod g+w -R /etc /usr/local/tomcat/webapps && \
    adduser www-data root

VOLUME \
    /usr/local/tomcat/webapps/ROOT/print-apps

ENTRYPOINT [ "/usr/bin/entrypoint" ]
