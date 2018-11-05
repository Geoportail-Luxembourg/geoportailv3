# -*- coding: utf-8 -*-

import distutils.core
from pyramid.config import Configurator
from c2cgeoportal_geoportal import locale_negotiator, add_interface, \
    INTERFACE_TYPE_NGEO, INTERFACE_TYPE_NGEO_CATALOGUE, set_user_validator
from c2cgeoportal_geoportal.lib.authentication import create_authentication
from geoportailv3_geoportal.resources import Root

from pyramid.renderers import JSON
from decimal import Decimal
from marrow.mailer import Mailer
# from pyramid.events import NewRequest
from geoportailv3_geoportal.adapters import datetime_adapter, decimal_adapter

import datetime
import json
import ldap3 as ldap


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
        from geoportailv3_geoportal.models import DBSession, LuxPrintJob
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

    """
    This function returns a Pyramid WSGI application.
    """
    config = Configurator(
        root_factory=Root, settings=settings,
        locale_negotiator=locale_negotiator,
        authentication_policy=create_authentication(settings)
    )

    # Workaround to not have the error: distutils.errors.DistutilsArgError: no commands supplied
    distutils.core._setup_stop_after = 'config'
    config.include('c2cgeoportal_geoportal')
    distutils.core._setup_stop_after = None

    config.add_translation_dirs('geoportailv3_geoportal:locale/')

    add_interface(config, 'main', INTERFACE_TYPE_NGEO_CATALOGUE, default=True)

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

    config.add_route("echocsv", "/profile/echocsv", request_method="POST")
    config.add_route('getuserinfo', '/getuserinfo')
    config.add_route('wms', '/ogcproxywms')
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

    # # ldap
    # from geoportailv3_geoportal.views.authentication import ldap_user_validator, \
    #     get_user_from_request
    # ldap_settings = config.get_settings()['ldap']
    # if ldap_settings:
    #     config.include('pyramid_ldap3')

    #     """Config the ldap connection.
    #     """

    #     config.ldap_setup(
    #         ldap_settings['url'],
    #         ldap_settings['bind'],
    #         ldap_settings['passwd'],
    #     )

    #     config.ldap_set_login_query(
    #         ldap_settings['base_dn'],
    #         filter_tmpl='(login=%(login)s)',
    #         scope=ldap.SUBTREE,
    #         )

    #     config.set_request_property(
    #         get_user_from_request,
    #         name='user',
    #         reify=True
    #     )

    #     set_user_validator(config, ldap_user_validator)

    # json
    json_renderer = JSON()
    json_renderer.add_adapter(datetime.date, datetime_adapter)
    json_renderer.add_adapter(datetime.datetime, datetime_adapter)
    json_renderer.add_adapter(Decimal, decimal_adapter)
    config.add_renderer('json', json_renderer)

    # mailer
    mail_config = config.get_settings()['mailer']
    if mail_config:
        mailer = Mailer(mail_config)
        mailer.start()

    # scan view decorator for adding routes
    config.scan()

    return config.make_wsgi_app()
