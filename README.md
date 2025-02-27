# geoportailv3 project
[![Build Status](https://travis-ci.org/Geoportail-Luxembourg/geoportailv3.svg?branch=master)](https://travis-ci.org/Geoportail-Luxembourg/geoportailv3)

geoportailv3 is the implementation of the v3 of the map viewer of the luxembourgish geoportal.

Read the `Documentation <http://docs.camptocamp.net/c2cgeoportal/>`_

## System-level dependencies
The following must be installed on the system:

* ``git``
* ``npm``
* ``gettext``

## Checkout
```bash
git clone git@github.com:Geoportail-Luxembourg/geoportailv3.git
```

## Build
```bash
cd geoportailv3
make build
```

## Local run and development

### Run the Database
- Clone https://github.com/camptocamp/luxembourg_dev_db
- Copy the `geov3-light.sql` in the project directory.
- Run `make`

### Run
To start the composition use `make run` and open http://localhost:8080.

### Dev
- Copy `docker-compose.override.sample.yaml` to `docker-compose.override.yaml` to enable webpack server.
- Start the dev composition with `make dev` and open http://localhost:8080/dev/main.html.

### Other ?
Until the migration is finished, the database must be fixed by doing: `make fix-db`.

The local ldap contains a single user: c2c/test1234 with admin rights.
See docker-compose exec geoportal ldapsearch -x -H ldap://ldap -b ou=portail,dc=act,dc=lu -D "login=c2c,ou=portail,dc=act,dc=lu" -w test1234 -LL '\*'

Admin interface can be accessed at http://localhost:8080/admin/.

The print service is available directly at http://localhost:28080/.

Emails are sent to /var/mail/root. The `mutt` application is part of the image
and can be used to visualize sent emails.

To rebuild the JS API inside docker, do:
`make rebuild-js-api`

To open jsapi:
http://localhost:8080/proj/1.0/build/apidoc/examples/

To open jsapi in debug mode:
http://localhost:8080/proj/1.0/build/apidoc/examples/?debug


Ldap configuration
------------------

User management is handled by the LDAP, both in production and on the local machine during developments.
The LDAP access is configured with the LDAP\_\* environment variables. See .env, docker-compose.yaml and geoportal/config.yaml.


DB configuration
----------------
Setup of the database is done via the tools in the repo [lux_dev_db](https://github.com/camptocamp/luxembourg_dev_db) and an additional dump.

You can find [some hints](doc/conf_db.md) about how to configure special features of the luxembourg via the DB.


Debug c2cgeoportal
------------------

Checkout or copy `c2cgeoportal` in `geoportal/c2cgeoportal` and checkout the right branch.
Then `cd geoportal/c2cgeoportal` and build it: `make docker-build` as specified
on the c2cgeoportal server-side development page.

In the `geoportal/Dockerfile` file just before the application pip install add:
```
RUN \
    pip install --disable-pip-version-check --no-cache-dir --editable=/app/c2cgeoportal/commons && \
    pip install --disable-pip-version-check --no-cache-dir --editable=/app/c2cgeoportal/geoportal && \
    pip install --disable-pip-version-check --no-cache-dir --editable=/app/c2cgeoportal/admin
```

In the `geoportal/.dockerignore` file add:
```
!c2cgeoportal/commons
!c2cgeoportal/geoportal
!c2cgeoportal/admin
```

Translations
------------

The translation workflow is as follows:
- make update-pots # Replace pot files with new ones using a running composition
- make update-web-component-translations # extract i18next strings from web component templates to translation files (using a running webpack_dev_server container from docker-compose.override)
- make update-translations # push new pots to transifex
- make pull-translations # retrieve pos from transifex
- #commit updated po files
- make build # build image using updated po files

Updating c2cgeoportal
---------------------

Update version in:
- geoportal/luxembourg_requirements.txt
- replace geoportal/upstream_requirements.txt using the corresponding version
  https://github.com/camptocamp/c2cgeoportal/blob/_C2C_GEOPORTAL_VERSION_/geoportal/requirements.txt
- check the docs / adapt the code
