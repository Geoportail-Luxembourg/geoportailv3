geoportailv3 project
===================
[![Build Status](https://travis-ci.org/Geoportail-Luxembourg/geoportailv3.svg?branch=master)](https://travis-ci.org/Geoportail-Luxembourg/geoportailv3)

geoportailv3 is the implementation of the v3 of the map viewer of the luxembourgish geoportal.


Read the `Documentation <http://docs.camptocamp.net/c2cgeoportal/>`_

System-level dependencies
-------------------------

The following must be installed on the system:

* ``git``
* ``npm``
* ``gettext``

Checkout
--------

```bash
git clone git@github.com:Geoportail-Luxembourg/geoportailv3.git
```

Build
-----

```bash
cd geoportailv3
cp .env-default .env
# Do some change in .env if needed
make build
```

Local run and development
-------------------------

To some extent, it is possible to simulate the services needed by the
application using git@github.com:camptocamp/luxembourg_dev_db.git
Clone that repository and there run: `make`.
In order to work with a database dump, simply put the sql file there before running `make`.

To start the composition use: `make run` and open http://localhost:8080.
Alternatively, to start the dev composition use: `make dev` and open http://localhost:8080/dev/main.html.

Until the migration is finished, the database must be fixed by doing: `make fix-db`.


Ldap configuration
------------------

User management is handled by the LDAP, both in production and on the local machine during developments.
The LDAP access is configured with the LDAP\_\* environment variables. See .env,
.env-default, docker-compose.yaml and geoportal/config.yaml.

For local dev the .env file should contain:
```
LDAP_BASE_DN=dc=example,dc=org
LDAP_BIND=cn=admin,dc=example,dc=org
LDAP_PASSWD=admin
LDAP_URL=ldap://ldap:389
LDAP_FILTER_TMPL=(cn=%%(login)s)
DEFAULT_MYMAPS_ROLE=645
```

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

The translation worflow is as follows:
- make update-pots # Replace pot files with new ones using a running composition
- make update-translations # push new pots to transifex
- make pull-translations # retrieve pos from transifex
- # commit updated po files
- make build # build image using updated po files


Automatic deployement
---------------------

3D demo: https://3d-demo.geoportail.lu/
3D dev: https://3d-test.geoportail.lu/
