# -*- coding: utf-8 -*-

import httplib2shim
httplib2shim.patch()
import distutils.core
from pyramid.config import Configurator
from pyramid.events import NewRequest
from c2cgeoportal_geoportal import locale_negotiator, add_interface, \
    INTERFACE_TYPE_NGEO, INTERFACE_TYPE_NGEO_CATALOGUE, set_user_validator
# from c2cgeoportal_geoportal.lib.authentication import create_authentication
from geoportailv3_geoportal.resources import Root

from geoportal.geoportailv3_geoportal.lib.lux_authentication import create_authentication

from pyramid.renderers import JSON
from pyramid_mako import add_mako_renderer

from decimal import Decimal
from marrow.mailer import Mailer
# from pyramid.events import NewRequest
from geoportailv3_geoportal.adapters import datetime_adapter, decimal_adapter

import datetime
import json
import ldap3 as ldap
import os
import sentry_sdk

from sentry_sdk.integrations.pyramid import PyramidIntegration

mailer = None

def add_cors_headers_response_callback(event):
    def cors_headers(request, response):
        response.headers.update({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS',
            'Access-Control-Allow-Headers': 'Origin, ' +
            'Content-Type, Accept, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '1728000',
        })
    event.request.add_response_callback(cors_headers)


def locale_negotiator(request):
    lang = request.params.get("lang")
    if "/printproxy/report/" in request.path:
        from geoportailv3_geoportal.models import LuxPrintJob
        from c2cgeoportal_commons.models import DBSession
        # Language is stored in the database
        ref = request.path.split("/printproxy/report/")[1]
        if ref is not None:
            job = DBSession.query(LuxPrintJob).get(ref)
            if job is not None:
                if "lang" in json.loads(job.spec)["attributes"]:
                    lang = json.loads(job.spec)["attributes"]["lang"]

    if lang is None:
        return request.accept_language.best_match(
            request.registry.settings.get("available_locale_names"))
    return lang


def main(global_config, **settings):
    del global_config  # Unused

    if len(os.environ.get('SENTRY_URL', '')) > 0:
        sentry_sdk.init(
            dsn=os.environ.get('SENTRY_URL', ''),
            integrations=[PyramidIntegration()]
        )

    """
    This function returns a Pyramid WSGI application.
    """
    config = Configurator(
        root_factory=Root, settings=settings,
        locale_negotiator=locale_negotiator,
        authentication_policy=create_authentication(settings)
    )
    if os.environ.get('ALLOW_CORS', '0') == '1':
        config.add_subscriber(add_cors_headers_response_callback, NewRequest)

    if os.environ.get('DEBUG_TOOLBAR', '0') == '1':
        config.get_settings()['debugtoolbar.hosts'] = ['0.0.0.0/0']
        config.include('pyramid_debugtoolbar')

    # Workaround to not have the error: distutils.errors.DistutilsArgError: no commands supplied
    distutils.core._setup_stop_after = 'config'

    config.add_route(
        "lux_get_thumbnail",
        "/printproxy/thumbnail",
        request_method="GET"
    )
    # overwrite print routes
    config.add_route(
        "lux_printproxy_report_create",
        "/printproxy/report.{format}",
        request_method="POST"
    )
    config.add_route(
        "lux_printproxy_status",
        "/printproxy/status/{ref}.json",
        request_method="GET"
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

    config.include('c2cgeoportal_geoportal')
    distutils.core._setup_stop_after = None

    add_mako_renderer(config, '.appcache')

    config.add_translation_dirs('geoportailv3_geoportal:locale/')

    add_interface(config, 'main', INTERFACE_TYPE_NGEO_CATALOGUE, default=True)

    # ping routes
    config.add_route(
        "ping",
        "/ping"
    )

    # mymaps routes
    config.add_route(
        "mymaps",
        "/mymaps",
        request_method="HEAD"
    )
    config.add_route(
        "mymaps_image",
        "/",
        request_method="HEAD"
    )
    config.add_route(
        "mymaps_get_full_mymaps",
        "mymaps/get_full_mymaps",
        request_method="GET"
    )
    config.add_route(
        "mymaps_getcategories",
        "mymaps/categories",
        request_method="GET"
    )
    config.add_route(
        "mymaps_getallcategories",
        "mymaps/allcategories",
        request_method="GET"
    )

    config.add_route(
        "generate_symbol_file",
        "/mymaps/generate_symbol_file",
        request_method="GET"
    )

    config.add_route(
        "mymaps_getpublicmaps",
        "/mymaps/public_maps",
        request_method="GET"
    )
    config.add_route(
        "mymaps_getpublicategories",
        "/mymaps/public_categories",
        request_method="GET"
    )
    config.add_route(
        "mymaps_getmaps",
        "/mymaps/maps",
        request_method="GET"
    )
    config.add_route(
        "mymaps_features",
        "/mymaps/features/{map_id}",
        request_method="GET"
    )
    config.add_route(
        "mymaps_map_info",
        "/mymaps/map_info/{map_id}",
        request_method="GET"
    )

    config.add_route(
        "predefined_wms",
        "/predefined_wms",
        request_method="GET"
    )

    config.add_route(
        "mymaps_create",
        "/mymaps/create",
        request_method="POST"
    )
    config.add_route(
        "mymaps_rate",
        "/mymaps/rate/{map_id}"
    )
    config.add_route(
        "mymaps_update",
        "/mymaps/update/{map_id}",
        request_method="PUT"
    )
    config.add_route(
        "mymaps_map",
        "/mymaps/map/{map_id}",
        request_method="GET"
    )
    config.add_route(
        "mymaps_comment",
        "/mymaps/comment/{map_id}",
        request_method="POST"
    )
    config.add_route(
        "mymaps_upload_image",
        "/mymaps/upload_image",
        request_method="POST"
    )
    config.add_route(
        "mymaps_upload_symbol",
        "/mymaps/upload_symbol",
        request_method="POST"
    )
    config.add_route(
        "mymaps_get_image",
        "/mymaps/images/{filename}",
        request_method="GET"
    )
    config.add_route(
        "mymaps_get_symbol",
        "/mymaps/symbol/{symbol_id}",
        request_method="GET"
    )
    config.add_route(
        "mymaps_users_categories",
        "/mymaps/get_users_categories",
        request_method="GET"
    )
    config.add_route(
        "mymaps_get_symbols",
        "/mymaps/symbols",
        request_method="GET"
    )
    config.add_route(
        "mymaps_delete",
        "/mymaps/delete/{map_id}",
        request_method="DELETE"
    )
    config.add_route(
        "mymaps_delete_all_features",
        "/mymaps/delete_all_features/{map_id}",
        request_method="DELETE"
    )
    config.add_route(
        "mymaps_delete_feature",
        "/mymaps/delete_feature/{feature_id}",
        request_method="DELETE"
    )
    config.add_route(
        "mymaps_save_feature",
        "/mymaps/save_feature/{map_id}",
        request_method="POST"
    )
    config.add_route(
        "mymaps_save_features",
        "/mymaps/save_features/{map_id}",
        request_method="POST"
    )
    config.add_route(
        "mymaps_save_order",
        "/mymaps/save_order/{map_id}",
        request_method="POST"
    )
    config.add_route(
        "mymaps_save_offline",
        "/mymaps/save_offline",
        request_method="POST"
    )
    config.add_route(
        "mymaps_copy",
        "/mymaps/copy/{map_id}",
        request_method="POST"
    )
    config.add_route(
        "exportgpxkml",
        "/mymaps/exportgpxkml",
        request_method="POST"
    )
    config.add_route(
        "get_arrow_color",
        "/mymaps/getarrow"
    )
    config.add_route(
        "getroute",
        "/mymaps/getroute"
    )
    config.add_route(
        "getremoteroute",
        "/router/getroute"
    )
    # geocoder routes
    config.add_route(
        "reverse_geocode",
        "/geocode/reverse"
    )
    config.add_route(
        "geocode",
        "/geocode/search"
    )
    config.add_route(
        "feedback",
        "/feedback"
    )
    config.add_route(
        "feedbackanf",
        "/feedbackanf"
    )
    config.add_route(
        "feedbackcrues",
        "/feedbackcrues"
    )
    config.add_route(
        "feedbackage",
        "/feedbackage"
    )
    # pag routes
    config.add_route(
        "pag_url",
        "/pag"
    )
    # pag routes
    config.add_route(
        "pag_report",
        "/pag/report/{oid}.pdf"
    )
    # pag routes
    config.add_route(
        "casipo_url",
        "/casipo"
    )
    # pag routes
    config.add_route(
        "casipo_report",
        "/casipo/report/{oid}.pdf"
    )
    # pds routes
    config.add_route(
        "pds_url",
        "/pds"
    )
    # pag routes
    config.add_route(
        "pds_report",
        "/pds/report/{oid}.pdf"
    )
    config.add_route(
        "pag_files",
        "/pag/files/{_file}"
    )
    config.add_route(
        "get_png",
        "/legends/get"
    )
    config.add_route(
        "get_html",
        "/legends/get_html"
    )
    config.add_route(
        "get_metadata",
        "/getMetadata"
    )
    # full text search routes
    config.add_route("fulltextsearch", "/fulltextsearch")

    # layer search routes
    config.add_route("layersearch", "/layersearch")

    # cms search routes
    config.add_route("cmssearch", "/cmssearch")

    # jsapi routes
    config.add_route(
        'jsapiloader',
        '/apiv3loader.js'
    )
    config.add_route(
        'jsapiexample',
        '/api-example'
    )
    config.add_route(
        'jsapilayers',
        '/jsapilayers'
    )
    config.add_route(
        'jsapilayersfull',
        '/jsapilayersfull'
    )
    config.add_route(
        'jsapithemesfull',
        '/jsapithemesfull'
    )

    config.add_route("echocsv", "/profile/echocsv", request_method="POST")
    config.add_route('getuserinfo', '/getuserinfo')
    config.add_route('wms', '/ogcproxywms')
    config.add_route('wmspoi', '/wmspoi')
    config.add_route('https_proxy', '/httpsproxy')
    config.add_route('download_sketch', '/downloadsketch')
    config.add_route('download', '/download')
    config.add_route('download_measurement', '/downloadmeasurement')
    config.add_route('preview_measurement', '/previewmeasurement')
    config.add_route('qr', '/qr')
    config.add_route('getfeatureinfo', '/getfeatureinfo')
    config.add_route('getpoitemplate', '/getpoitemplate')
    config.add_route('getremotetemplate', '/getremotetemplate')
    config.add_route('isthemeprivate', '/isthemeprivate')
    config.add_route('download_resource', '/downloadresource')
    config.add_route('upload_vt_style', '/uploadvtstyle')
    config.add_route('delete_vt_style', '/deletevtstyle')
    config.add_static_view('proj/{version}', path='geoportailv3_geoportal:jsapi/')
    
    # Appcache manifest
    config.add_route(
        'appcache',
        '/geoportailv3.appcache'
    )
    # ldap
    from geoportailv3_geoportal.views.authentication import ldap_user_validator, \
        get_user_from_request
    ldap_settings = config.get_settings()['ldap']
    if ldap_settings:
        config.include('pyramid_ldap3')

        """Config the ldap connection.
        """

        config.ldap_setup(
            ldap_settings['url'],
            ldap_settings['bind'],
            ldap_settings['passwd'],
            use_pool=False,  # avoid errors like LDAPMaximumRetriesError and LDAPResponseTimeoutError
        )

        ldap_settings['filter_tmpl'] = ldap_settings['filter_tmpl'].replace('%%', '%')
        config.ldap_set_login_query(
            ldap_settings['base_dn'],
            filter_tmpl=ldap_settings['filter_tmpl'],
            scope=ldap.SUBTREE,
            )

        config.set_request_property(
            get_user_from_request,
            name='user',
            reify=True
        )

        set_user_validator(config, ldap_user_validator)

    # json
    json_renderer = JSON()
    json_renderer.add_adapter(datetime.date, datetime_adapter)
    json_renderer.add_adapter(datetime.datetime, datetime_adapter)
    json_renderer.add_adapter(Decimal, decimal_adapter)
    config.add_renderer('json', json_renderer)

    # mailer
    mail_config = config.get_settings()['mailer'].copy()
    maildir = os.environ.get('MAILER_DIRECTORY', None)
    if maildir:
        # To deliver emails to a directory (for local dev)
        mail_config['transport.use'] = 'maildir'
        mail_config['transport.directory'] = maildir
    global mailer
    mailer = Mailer(mail_config)
    mailer.start()

    # Add custom table in admin interace, that means re-add all normal table

    from c2cgeoform.routes import register_models
    from c2cgeoportal_commons.models.main import (
        Role, LayerWMS, LayerWMTS, Theme, LayerGroup, LayerV1, Interface, OGCServer,
        Functionality, RestrictionArea)
    from c2cgeoportal_commons.models.static import User
    from geoportailv3_geoportal.models import LuxDownloadUrl, \
        LuxMeasurementLoginCommune, LuxMeasurementDirectory, LuxGetfeatureDefinition, \
        LuxPrintServers, LuxPredefinedWms, LuxLayerExternalWMS, LuxLayerInternalWMS

    register_models(config, (
        ('themes', Theme),
        ('layer_groups', LayerGroup),
        # ('layers_wms', LayerWMS), removed we use LuxLayerExternalWMS and LuxLayerInternalWMS instead
        ('layers_wmts', LayerWMTS),
        ('layers_v1', LayerV1),
        ('ogc_servers', OGCServer),
        ('restriction_areas', RestrictionArea),
        ('users', User),
        ('roles', Role),
        ('functionalities', Functionality),
        ('interfaces', Interface),
        ('lux_download_url', LuxDownloadUrl),
        ('lux_measurement_login_commune', LuxMeasurementLoginCommune),
        ('lux_measurement_directory', LuxMeasurementDirectory),
        ('lux_getfeature_definition', LuxGetfeatureDefinition),
        ('lux_print_servers', LuxPrintServers),
        ('lux_predefined_wms', LuxPredefinedWms),
        ('lux_layer_external_wms', LuxLayerExternalWMS),
        ('lux_layer_internal_wms', LuxLayerInternalWMS),
    ), 'admin')

    # scan view decorator for adding routes
    config.scan()

    return config.make_wsgi_app()
