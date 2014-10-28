geoportail_v3 project
===================

geoportail_v3 is the implementation of the v3 of the map viewer of the luxembourgish geoportal.


Read the `Documentation <http://docs.camptocamp.net/c2cgeoportal/>`_

Checkout
--------

.. code:: bash

   git clone git@github.com:camptocamp/geoportail_v3.git

Build
-----

.. code:: bash

  cd geoportail_v3

  git submodule update --init

  git submodule foreach git submodule update --init

  python bootstrap.py --version 1.5.2 --distribute --download-base \
        http://pypi.camptocamp.net/distribute-0.6.22_fix-issue-227/ --setup-source \
        http://pypi.camptocamp.net/distribute-0.6.22_fix-issue-227/distribute_setup.py

  ./buildout/bin/buildout -c buildout_<user>.cfg

.. Feel free to add project-specific things.
