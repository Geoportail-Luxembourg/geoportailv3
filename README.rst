geoportailv3 project
===================

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

For the print to work, you wil need
* ``jdk`` (java-1.7.0-openjdk-devel)
* ``tomcat``

Make sure ``pg_config`` (from the ``postgresql-devel``) is in your ``PATH``.

Checkout
--------

.. code:: bash

   git clone git@github.com:Geoportail-Luxembourg/geoportailv3.git

Build
-----

.. code:: bash

  cd geoportailv3

  make -f <user>.mk build

.. Feel free to add project-specific things.
