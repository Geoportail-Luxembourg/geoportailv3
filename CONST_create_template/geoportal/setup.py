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
        'c2cgeoportal_geoportal',
        'c2cgeoportal_admin',
    ],
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    entry_points={
        'paste.app_factory': [
            'main = geoportailv3_geoportal:main',
        ],
        'console_scripts': [
        ],
    },
)
