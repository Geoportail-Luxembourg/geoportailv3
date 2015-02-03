# -*- coding: utf-8 -*-

from pyramid.config import Configurator
from pyramid.settings import asbool
from c2cgeoportal import locale_negotiator, \
    add_interface, INTERFACE_TYPE_NGEO_CATALOGUE, \
    set_user_validator
from c2cgeoportal.resources import FAModels
from c2cgeoportal.lib.authentication import create_authentication
from geoportailv3.resources import Root
from geoportailv3.views.authentication import ldap_user_validator
import ldap

def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    config = Configurator(
        root_factory=Root, settings=settings,
        locale_negotiator=locale_negotiator,
        authentication_policy=create_authentication(settings)
    )

    config.add_settings({'srid': 2169})

    config.include('c2cgeoportal')
    config.include('pyramid_closure')
    config.include('pyramid_ldap')

    """Config the ldap connection.
    """
    config.ldap_setup(
        config.get_settings()['ldap_url'],
        config.get_settings()['ldap_bind'],
        config.get_settings()['ldap_passwd'],
    )
    
    config.ldap_set_login_query(
        config.get_settings()['ldap_base_dn'],
        filter_tmpl='(login=%(login)s)',
        scope = ldap.SCOPE_SUBTREE,
        )
    set_user_validator(config, ldap_user_validator)

    config.add_translation_dirs('geoportailv3:locale/')

    if asbool(config.get_settings().get('enable_admin_interface')):
        config.formalchemy_admin(
            'admin', package='geoportailv3',
            view='fa.jquery.pyramid.ModelView', factory=FAModels
        )

    config.add_route('checker_all', '/checker_all')

    # scan view decorator for adding routes
    config.scan()

    # add the main static view
    config.add_static_view(
        'proj', 'geoportailv3:static',
        cache_max_age=int(config.get_settings()["default_max_age"])
    )

    # add the interfaces
    add_interface(config, interface_type=INTERFACE_TYPE_NGEO_CATALOGUE)

    # static views for js resources in node_modules and for closure
    settings = config.get_settings()
    config.add_static_view('node_modules', settings.get('node_modules_path'))
    config.add_static_view('closure', settings.get('closure_library_path'))

    config.add_route('wms', '/wms')
    return config.make_wsgi_app()
