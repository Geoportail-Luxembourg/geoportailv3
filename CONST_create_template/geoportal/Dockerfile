FROM camptocamp/geomapfish-tools:2.5.0.139 as builder
LABEL maintainer Camptocamp "info@camptocamp.com"

WORKDIR /app
COPY webpack.*.js Makefile CONST_Makefile /app/
COPY geoportailv3_geoportal/static-ngeo /app/geoportailv3_geoportal/static-ngeo
RUN make apps

COPY . /app

RUN make checks
RUN make build
RUN mv webpack.apps.js webpack.apps.js.tmpl

ENTRYPOINT [ "/usr/bin/eval-templates" ]
CMD [ "webpack-dev-server", "--mode=development", "--debug", "--watch", "--no-inline" ]

###############################################################################

FROM camptocamp/geomapfish:2.5 as runner

COPY requirements.txt /tmp/requirements.txt
RUN \
  python3 -m pip install --disable-pip-version-check --no-cache-dir --requirement=/tmp/requirements.txt && \
  rm --recursive --force /tmp/* /var/tmp/* /root/.cache/*

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

ARG GIT_HASH
RUN c2cwsgiutils_genversion.py ${GIT_HASH}

ARG PGSCHEMA
ENV PGSCHEMA=${PGSCHEMA}

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
