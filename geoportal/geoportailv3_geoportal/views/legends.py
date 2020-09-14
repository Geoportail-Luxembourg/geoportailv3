# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from c2cgeoportal_commons.models import DBSession
from geoportailv3_geoportal.models import LuxLayerInternalWMS
from c2cgeoportal_commons.models.main import OGCServer
from pyramid.renderers import render
from pyramid.i18n import get_localizer, TranslationStringFactory
from io import StringIO
from bs4 import BeautifulSoup
import weasyprint
import urllib.request
import httplib2
import json

import logging

_ = TranslationStringFactory("geoportailv3_geoportal-legends")
log = logging.getLogger(__name__)

class Legends(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='get_png')
    def get_png(self):
        css = weasyprint.CSS(
            string="img {max-height: 450px}"
        )

        lang = self.request.params.get("lang")
        name = self.request.params.get("name")

        url = \
            "https://wiki.geoportail.lu/doku.php?" \
            "id=%s:legend:%s&do=export_html" % \
            (lang, name)

        legend_buffer = StringIO()
        weasyprint.HTML(url, media_type="screen").write_png(
            legend_buffer,
            stylesheets=[css]
        )

        headers = {"Content-Type": "image/png"}

        return Response(legend_buffer.getvalue(), headers=headers)

    @view_config(route_name='get_html')
    def get_html(self):
        lang = self.request.params.get("lang")
        name = self.request.params.get("name")
        id = self.request.params.get("id", "")
        if lang == 'lb':
            lang = 'lu'

        if id != "":
            internal_wms = DBSession.query(LuxLayerInternalWMS).filter(
                LuxLayerInternalWMS.id == id).first()
            if internal_wms is not None:
                ogc_server_id = internal_wms.ogc_server_id
                ogc_server = DBSession.query(OGCServer).filter(OGCServer.id == ogc_server_id).first()
                # ogc_server = DBSession.query(OGCServer).filter(
                #     OGCServer.id == LuxLayerInternalWMS.ogc_server_id,
                #     LuxLayerInternalWMS.id == id).first()
                log.info('ogc_server type: %s, url: %s, id: %s, name: %s' %(ogc_server.type, ogc_server.url, ogc_server_id, ogc_server.name))

            if internal_wms is not None and ogc_server.type == 'arcgis':
                log.info('found arcgis layer')

                legend = TranslationStringFactory("geoportailv3_geoportal-legends")
                server = TranslationStringFactory("geoportailv3_geoportal-server")

                full_url = internal_wms.rest_url + '/legend?f=pjson'
                if 'dpi' in self.request.params:
                    full_url += "&dpi=" + self.request.params["dpi"]

                f = urllib.request.urlopen(httplib2.iri2uri(full_url), None, 15)
                data = json.load(f)
                log.info('data keys: %s' % data.keys())
                log.info('data keys: %s' % len(data['layers']))
                log.info('data keys: %s' % [(l['layerName'], l['layerId']) for l in data['layers']])
                html_legend = ''

                active_layers = internal_wms.layers.split(',')
                localizer = self.request.localizer
                context = {
                    "data": data,
                    "active_layers": active_layers,
                    "wms_layer": internal_wms.layer,
                    "_l": lambda s: localizer.translate(legend(s)),
                }
                headers = {"Content-Type": "text/html; charset=utf-8"}
                html_legend = render('geoportailv3_geoportal:templates/legends.html', context)
                return Response(html_legend, headers=headers)

        url = \
            "https://wiki.geoportail.lu/doku.php?" \
            "id=%s:legend:%s&do=export_html" % \
            (lang, name)

        log.info('info here')
        log.info('url: %s' % url)
        f = urllib.request.urlopen(httplib2.iri2uri(url), None, 15)
        data = f.read()
        log.info('data head: %s' % data[:50])
        data = data.replace(
            b"/lib/exe/fetch.php",
            b"https://wiki.geoportail.lu/lib/exe/fetch.php")
        data = data.replace(
            b"src=\"img/",
            b"src=\"https://wiki.geoportail.lu/img/")
        data = data.replace(
            b"/lib/exe/detail.php",
            b"https://wiki.geoportail.lu/lib/exe/detail.php")

        soup = BeautifulSoup(data, "lxml")
        a_tags = soup.find_all("a")
        for a_tag in a_tags:
            if a_tag.get('class') is not None and\
               'media' in a_tag.get('class'):
                a_tag['target'] = '_blank'
        img_tags = soup.find_all("img")
        for img_tag in img_tags:
            if img_tag.get('style') is None:
                img_tag['style'] = 'max-width:290px;'

        res = soup.find("div", {"class": "dokuwiki export"})

        if res is not None:
            data = res.encode_contents()
        else:
            data = ""

        headers = {"Content-Type": f.info()['Content-Type']}

        return Response(data, headers=headers)
