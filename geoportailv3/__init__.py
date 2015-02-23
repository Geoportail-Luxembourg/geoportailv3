# -*- coding: utf-8 -*-

from pyramid.config import Configurator
from c2cgeoportal import locale_negotiator, \
    add_interface, INTERFACE_TYPE_NGEO_CATALOGUE, \
    set_user_validator
from c2cgeoportal.lib.authentication import create_authentication
from geoportailv3.resources import Root
from geoportailv3.views.authentication import ldap_user_validator, \
    get_user_from_request
import ldap


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    config = Configurator(
        root_factory=Root, settings=settings,
        locale_negotiator=locale_negotiator,
        authentication_policy=create_authentication(settings)
    )

    config.include('c2cgeoportal')
    config.include('pyramid_closure')
    config.include('pyramid_ldap')

    """Config the ldap connection.
    """
    ldap_settings = config.get_settings()['ldap']

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

    config.set_request_property(get_user_from_request, name='user', reify=True)

    set_user_validator(config, ldap_user_validator)

    config.add_translation_dirs('geoportailv3:locale/')

    # scan view decorator for adding routes
    config.scan()

    # add the interfaces
    add_interface(config, interface_type=INTERFACE_TYPE_NGEO_CATALOGUE)

    config.add_route('getuserinfo', '/getuserinfo')
    config.add_route('wms', '/wms')
    return config.make_wsgi_app()
