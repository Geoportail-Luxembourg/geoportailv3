FROM camptocamp/geomapfish-tools:2.5.0.139 as builder

ENV LANGUAGES="en fr de lb"
ENV VARS_FILE=vars.yaml
ENV CONFIG_VARS sqlalchemy.url sqlalchemy.pool_recycle sqlalchemy.pool_size sqlalchemy.max_overflow \
    sqlalchemy.use_batch_mode sqlalchemy_slave.url sqlalchemy_slave.pool_recycle sqlalchemy_slave.pool_size \
    sqlalchemy_slave.max_overflow sqlalchemy_slave.use_batch_mode schema schema_static enable_admin_interface \
    default_locale_name servers layers available_locale_names cache admin_interface getitfixed functionalities \
    raster shortener hide_capabilities tinyowsproxy resourceproxy print_url print_get_redirect \
    checker check_collector default_max_age package srid \
    reset_password fulltextsearch global_headers headers authorized_referers hooks stats db_chooser \
    dbsessions urllogin host_forward_host smtp c2c.base_path welcome_email \
    lingua_extractor interfaces_config interfaces devserver_url api authentication intranet metrics pdfreport \
    arcgis_token

# Custom config vars
ENV CONFIG_VARS ${CONFIG_VARS} \
    authorized_ips \
    default_mymaps_role \
    elastic \
    exclude_theme_layer_search \
    excluded_themes_from_search \
    https_proxy \
    ldap \
    lidar \
    mailer \
    modify_notification \
    referrer \
    reverse_geocode \
    routing \
    sync_ms_path \
    anf age age_crues casipo pag pds

COPY . /tmp/config/
RUN mkdir -p /tmp/config/geoportal/geoportailv3_geoportal/static

RUN \
    for lang in ${LANGUAGES}; \
    do \
        node /usr/bin/compile-catalog \
            /opt/c2cgeoportal/geoportal/c2cgeoportal_geoportal/locale/${lang}/LC_MESSAGES/ngeo.po \
            /opt/c2cgeoportal/geoportal/c2cgeoportal_geoportal/locale/${lang}/LC_MESSAGES/gmf.po \
            /tmp/config/geoportal/geoportailv3_geoportal/locale/${lang}/LC_MESSAGES/geoportailv3_geoportal-client.po \
            /tmp/config/geoportal/geoportailv3_geoportal/locale/${lang}/LC_MESSAGES/geoportailv3_geoportal-tooltips.po \
            /tmp/config/geoportal/geoportailv3_geoportal/locale/${lang}/LC_MESSAGES/geoportailv3_geoportal-legends.po \
            /tmp/config/geoportal/geoportailv3_geoportal/locale/${lang}/LC_MESSAGES/geoportailv4_geoportal-client.po \
            > /tmp/config/geoportal/geoportailv3_geoportal/static/${lang}.json; \
    done && \
    rm -rf /tmp/config/geoportal/geoportailv3_geoportal/locale

RUN \
    cd /tmp/config/geoportal/ && \
    c2c-template --vars ${VARS_FILE} \
        --get-config geoportailv3_geoportal/config.yaml \
        ${CONFIG_VARS} && \
    pykwalify --data-file geoportailv3_geoportal/config.yaml \
        --schema-file CONST_config-schema.yaml && \
    rm CONST_* vars.yaml

###############################################################################

FROM camptocamp/geomapfish-config:2.5.0.139

ARG PGSCHEMA
ENV PGSCHEMA=$PGSCHEMA

COPY --from=builder /tmp/config/ /tmp/config/

RUN \
    if [ -e /tmp/config/mapserver ]; then mv /tmp/config/mapserver /etc/; fi && \
    if [ -e /tmp/config/tilegeneration ]; then mv /tmp/config/tilegeneration /etc/; fi && \
    if [ -e /tmp/config/qgisserver ]; then mv /tmp/config/qgisserver /etc/qgisserver; fi && \
    mkdir --parent /usr/local/tomcat/webapps/ROOT/ && \
    if [ -e /tmp/config/print ]; then mv /tmp/config/print/print-apps /usr/local/tomcat/webapps/ROOT/; fi && \
    mv /tmp/config/geoportal/geoportailv3_geoportal/ /etc/geomapfish/ && \
    chmod g+w -R /usr/local/tomcat/webapps && \
    adduser www-data root && \
    sed 's#bind :80#bind *:443 ssl crt /etc/haproxy_dev/localhost.pem#g' /etc/haproxy/haproxy.cfg.tmpl \
        > /etc/haproxy_dev/haproxy.cfg.tmpl && \
    echo '    http-request set-header X-Forwarded-Proto https' >> /etc/haproxy_dev/haproxy.cfg.tmpl

VOLUME /etc/geomapfish \
    /etc/mapserver \
    /etc/qgisserver \
    /etc/tilegeneration \
    /usr/local/tomcat/webapps/ROOT/print-apps \
    /etc/gunicorn \
    /etc/haproxy_dev \
    /etc/haproxy
