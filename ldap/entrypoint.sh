#!/usr/bin/env bash
ulimit -n 8192
set -e

first_run=true

if [[ -f "/var/lib/ldap/__db.001" ]]; then
    first_run=false
fi

if [[ "$first_run" == "true" ]]; then
    if [[ -d "/etc/ldap/prepopulate" ]]; then
        for file in `ls /etc/ldap/prepopulate/*.ldif`; do
            echo "Prepopulate $file"
            slapadd -f /etc/ldap/slapd.conf -l "$file"
        done
    fi
fi

chown -R openldap:openldap /var/lib/ldap/ /var/run/slapd/ /etc/ldap/slapd.d /etc/ldap/slapd.conf

exec "$@"
