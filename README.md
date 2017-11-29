geoportailv3 project
===================
[![Build Status](https://travis-ci.org/Geoportail-Luxembourg/geoportailv3.svg?branch=master)](https://travis-ci.org/Geoportail-Luxembourg/geoportailv3)

geoportailv3 is the implementation of the v3 of the map viewer of the luxembourgish geoportal.


Read the `Documentation <http://docs.camptocamp.net/c2cgeoportal/>`_

System-level dependencies
-------------------------

The following must be installed on the system:

* ``git``
* ``python-virtualenv``
* ``httpd``
* ``mod_wsgi``
* ``postgresql-devel`` (or ``libpq-dev`` on Debian)
* ``python-devel``
* ``gcc``
* ``npm``
* ``openldap-devel`` (or ``libldap2-dev`` and ``libsasl2-dev`` on Debian)
* ``libjpeg-devel``

For the print to work, you will need
* ``jdk`` (java-1.7.0-openjdk-devel)
* ``tomcat``

For the legend, we will need
* ``libffl-devel``
* ``libxml2-devel``
* ``libxslt-devel``

Make sure ``pg_config`` (from the ``postgresql-devel``) is in your ``PATH``.

Checkout
--------

```bash
git clone git@github.com:Geoportail-Luxembourg/geoportailv3.git
```

Build
-----

```bash
cd geoportailv3
make -f <user>.mk build
```

Local run
---------

To some extent, it is possible to simulate the services needed by the
application using git@github.com:camptocamp/luxembourg_dev_db.git


Automatic deployement
---------------------

3D demo: https://3d-demo.geoportail.lu/
3D dev: https://3d-test.geoportail.lu/
