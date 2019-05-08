FROM ubuntu:18.04

ARG HTTP_PROXY_URL
ENV http_proxy $HTTP_PROXY_URL
ARG HTTPS_PROXY_URL
ENV https_proxy $HTTPS_PROXY_URL

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y slapd ldap-utils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY . /

EXPOSE 389

VOLUME /var/lib/ldap

ENTRYPOINT ["/entrypoint.sh"]

CMD ["slapd", "-d", "32768", "-u", "openldap", "-g", "openldap", "-f", "/etc/ldap/slapd.conf"]
