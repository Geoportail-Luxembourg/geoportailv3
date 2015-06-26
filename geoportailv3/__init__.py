# -*- coding: utf-8 -*-

from pyramid.config import Configurator
from c2cgeoportal import locale_negotiator, \
    add_interface, INTERFACE_TYPE_NGEO_CATALOGUE, \
    set_user_validator
from c2cgeoportal.lib.authentication import create_authentication
from geoportailv3.resources import Root
from geoportailv3.views.authentication import ldap_user_validator, \
    get_user_from_request
from pyramid.renderers import JSON
from decimal import Decimal

from geoportailv3.adapters import datetime_adapter, decimal_adapter

import datetime
import ldap
import sqlalchemy
import sqlahelper


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    config = Configurator(
        root_factory=Root, settings=settings,
        locale_negotiator=locale_negotiator,
        authentication_policy=create_authentication(settings)
    )

    # overwrite print routes
    config.add_route(
        "lux_printproxy_report_create",
        "/printproxy/report.{format}",
        request_method="POST"
    )
    config.add_route(
        "lux_printproxy_report_get",
        "/printproxy/report/{ref}",
        request_method="GET"
    )
    config.add_route(
        "lux_printproxy_report_cancel",
        "/printproxy/cancel/{ref}",
        request_method="DELETE"
    )

    config.include('c2cgeoportal')
    config.include('pyramid_closure')

    ldap_settings = config.get_settings()['ldap']
    if ldap_settings:
        config.include('pyramid_ldap')

        """Config the ldap connection.
        """

        config.ldap_setup(
            ldap_settings['url'],
            ldap_settings['bind'],
            ldap_settings['passwd'],
        )

        config.ldap_set_login_query(
            ldap_settings['base_dn'],
            filter_tmpl='(login=%(login)s)',
            scope=ldap.SCOPE_SUBTREE,
            )

        config.set_request_property(
            get_user_from_request,
            name='user',
            reify=True
        )

        set_user_validator(config, ldap_user_validator)

    config.add_translation_dirs('geoportailv3:locale/')

    # initialize database
    engines = config.get_settings()['sqlalchemy_engines']
    if engines:
        for engine in engines:
            sqlahelper.add_engine(
                sqlalchemy.create_engine(engines[engine]), name=engine)

    json_renderer = JSON()

    json_renderer.add_adapter(datetime.datetime, datetime_adapter)
    json_renderer.add_adapter(Decimal, decimal_adapter)
    config.add_renderer('json', json_renderer)

    # scan view decorator for adding routes
    config.scan()

    # add the interfaces
    add_interface(config, interface_type=INTERFACE_TYPE_NGEO_CATALOGUE)

    config.add_route('getuserinfo', '/getuserinfo')
    config.add_route('wms', '/ogcproxywms')
    config.add_route('qr', '/qr')
    config.add_route('getfeatureinfo', '/getfeatureinfo')
    config.add_route('getpoitemplate', '/getpoitemplate')
    config.add_route('getremotetemplate', '/getremotetemplate')
    config.add_route('isthemeprivate', '/isthemeprivate')
    return config.make_wsgi_app()
