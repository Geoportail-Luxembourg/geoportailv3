# -*- coding: utf-8 -*-

try:
    from setuptools import setup, find_packages
except ImportError:
    from ez_setup import use_setuptools
    use_setuptools()
    from setuptools import setup, find_packages

setup(
    name='geoportailv3',
    version='1.0',
    description='geoportailv3, a c2cgeoportal project',
    author='camptocamp',
    author_email='info@camptocamp.com',
    url='http://www.camptocamp.com/geospatial-solutions',
    install_requires=[
        'c2cgeoportal',
        'elasticsearch',
        'python-ldap',
        'pyramid_ldap',
        'qrcode==5.1',
        "weasyprint==0.23",
        "PyPDF2==1.24",
        "turbomail",
        "webtest"
    ],
    packages=find_packages(exclude=['ez_setup']),
    include_package_data=True,
    message_extractors={'geoportailv3': [
        ('static/**', 'ignore', None),
        ('**.py', 'python', None),
        ('templates/**', 'mako', {'input_encoding': 'utf-8'})]},
    zip_safe=False,
    entry_points={
        'paste.app_factory': [
            'main = geoportailv3:main',
        ],
        'console_scripts': [
            'create_db = geoportailv3.scripts.create_db:main',
            'db2es = geoportailv3.scripts.db2es:main',
            'layers2es = geoportailv3.scripts.layers2es:main',
            'tooltips2pot = geoportailv3.scripts.tooltips2pot:main',
        ],
    },
)
