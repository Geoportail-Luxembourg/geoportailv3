#!/bin/bash
if [ -z "$GUNICORN_PARAMS" ]
then
    GUNICORN_PARAMS="-b :8080 --worker-class gthread --threads 10 --workers 5"
fi

_term() {
    echo "Caught SIGTERM signal!"
    kill -TERM "$child" 2>/dev/null
    wait "$child"
    exit 1
}

_int() {
    echo "Caught SIGINT signal!"
    kill -INT "$child" 2>/dev/null
    wait "$child"
    exit 1
}

trap _term SIGTERM
trap _int SIGINT

while true
do
    lux_gunicorn $GUNICORN_PARAMS c2cwsgiutils.wsgi_app:application &
    child=$!
    wait "$child"
    exit_status=$?
    if [ $exit_status -eq 0 ]
    then
        exit 0
    fi
    echo "gunicorn exited with an error ($exit_status), restarting in 1s"
    sleep 1
done
