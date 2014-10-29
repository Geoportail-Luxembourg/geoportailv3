# -*- coding: utf-8 -*-

from pyramid.config import Configurator
from pyramid.settings import asbool
from c2cgeoportal import locale_negotiator
from c2cgeoportal.resources import FAModels
from c2cgeoportal.lib.authentication import create_authentication
from geoportailv3.resources import Root

def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    config = Configurator(root_factory=Root, settings=settings,
            locale_negotiator=locale_negotiator,
            authentication_policy=create_authentication(settings))

    config.add_settings({'srid': 2169})

    config.include('c2cgeoportal')

    config.add_translation_dirs('geoportailv3:locale/')

    if asbool(config.get_settings().get('enable_admin_interface')):
        config.formalchemy_admin('admin', package='geoportailv3',
                view='fa.jquery.pyramid.ModelView', factory=FAModels)

    config.add_route('checker_all', '/checker_all')

    # scan view decorator for adding routes
    config.scan()

    # add the main static view
    config.add_static_view('proj', 'geoportailv3:static',
        cache_max_age=int(config.get_settings()["default_max_age"])
    )

    # mobile views and routes
    config.add_route('mobile_index_dev', '/mobile_dev/')
    config.add_view('c2cgeoportal.views.entry.Entry',
                    attr='mobile',
                    renderer='geoportailv3:static/mobile/index.html',
                    route_name='mobile_index_dev')
    config.add_route('mobile_config_dev', '/mobile_dev/config.js')
    config.add_view('c2cgeoportal.views.entry.Entry',
                    attr='mobileconfig',
                    renderer='geoportailv3:static/mobile/config.js',
                    route_name='mobile_config_dev')
    config.add_static_view('mobile_dev', 'geoportailv3:static/mobile')

    config.add_route('mobile_index_prod', '/mobile/')
    config.add_view('c2cgeoportal.views.entry.Entry',
                    attr='mobile',
                    renderer='geoportailv3:static/mobile/build/production/App/index.html',
                    route_name='mobile_index_prod')
    config.add_route('mobile_config_prod', '/mobile/config.js')
    config.add_view('c2cgeoportal.views.entry.Entry',
                    attr='mobileconfig',
                    renderer='geoportailv3:static/mobile/build/production/App/config.js',
                    route_name='mobile_config_prod')
    config.add_static_view('mobile', 'geoportailv3:static/mobile/build/production/App')

    return config.make_wsgi_app()
