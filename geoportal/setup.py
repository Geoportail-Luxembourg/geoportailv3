#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from setuptools import setup, find_packages

setup(
    name='geoportailv3_geoportal',
    version='1.0',
    description='geoportailv3, a c2cgeoportal project',
    author='geoportailv3',
    author_email='info@geoportailv3.com',
    url='http://www.geoportailv3.com/',
    install_requires=[
    ],
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    entry_points={
        'paste.app_factory': [
            'main = geoportailv3_geoportal:main',
        ],
        'console_scripts': [
          'finalize23DataAdaptations = geoportailv3_geoportal.scripts.finalize_c2c_23_data_adaptations:main',
          'create_db = geoportailv3_geoportal.scripts.create_db:main',
          'db2es = geoportailv3_geoportal.scripts.db2es:main',
          'layers2es = geoportailv3_geoportal.scripts.layers2es:main',
          'lux_gunicorn = geoportailv3_geoportal.scripts.lux_gunicorn:main',
        ],
        "lingua.extractors": [
            "luxembourg-tooltips = geoportailv3_geoportal.lib.lingua_extractor:LuxembourgTooltipsExtractor",
            "luxembourg-legends = geoportailv3_geoportal.lib.lingua_extractor:LuxembourgESRILegendExtractor",
        ],
    },
)
