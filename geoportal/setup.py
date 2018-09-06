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
        'pyocclient==0.2',
        'suds-jurko==0.6',
        'ipaddr==2.2.0',
        'elasticsearch',
        'ldap3==2.5.1',
        'pyramid_ldap3==0.3.2',
        'qrcode==5.1',
        'bleach==2.1.4',
        'html5lib==1.0.1',
        'weasyprint==v0.42.3',
        'PyPDF2==1.24',
        'marrow.mailer',
        'webtest',
        'beautifulsoup4==4.5.1'
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
