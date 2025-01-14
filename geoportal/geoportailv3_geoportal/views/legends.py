# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from c2cgeoportal_commons.models import DBSession
from c2cgeoportal_commons.models.main import TreeItem
from geoportailv3_geoportal.models import LuxLayerInternalWMS
from pyramid.renderers import render
from pyramid.i18n import TranslationStringFactory
from io import BytesIO
from bs4 import BeautifulSoup
import weasyprint
import urllib.request
import httplib2
import json

from geoportailv3_geoportal.lib.esri_authentication import ESRITokenException
from geoportailv3_geoportal.lib.esri_authentication import get_arcgis_token, read_request_with_token

import logging

log = logging.getLogger(__name__)


class Legends(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='get_png')
    def get_png(self):
        css = [
            weasyprint.CSS(string="img {max-height: 450px;}"),
            weasyprint.CSS(string='@page {margin:0;}')
        ]
        lang = self.request.params.get("lang")
        name = self.request.params.get("name")

        if 'id' in self.request.params:
            # use ESRI rest mechanism
            path = self.request.route_url('get_html')
            url = path + '?' + urllib.parse.urlencode(self.request.params)
        else:
            url = \
                  "https://wiki.geoportail.lu/doku.php?" \
                  "id=%s:legend:%s&do=export_html" % \
                  (lang, urllib.parse.quote(name))

        legend_buffer = BytesIO()
        weasyprint.HTML(url, media_type="screen").write_png(
            legend_buffer,
            stylesheets=css
        )

        headers = {"Content-Type": "image/png"}

        return Response(legend_buffer.getvalue(), headers=headers)

    @view_config(route_name='get_html')
    def get_html(self):
        lang = self.request.params.get("lang")
        name = self.request.params.get("name")
        id = self.request.params.get("id", "")
        legend_title = self.request.params.get("legend_title")
        if len(id) == 0 and (name is None or len(name) == 0):
            return Response('')
        if lang == 'lb':
            lang = 'lu'
        try: 
            int(id)
        except ValueError:
            id = ""
        # for an ESRI legend service the layer id is given, whereas the getDoku service
        # depends on the name parameter
        if id != "":
            has_rest_url = False
            treeitem = DBSession.query(TreeItem).filter(TreeItem.id == id).first()
            if isinstance(treeitem, LuxLayerInternalWMS):
                internal_wms = treeitem
                has_rest_url = (internal_wms is not None and internal_wms.rest_url is not None
                                and internal_wms.rest_url != '')
            else:
                has_rest_url = False

            metadatas = treeitem.get_metadatas('legend_name')
            # use ESRI rest service if no legend_name metadata defined
            if len(metadatas) == 0:
                html_legend = ''
                # use rest service if rest_url is defined
                # otherwise return empty legend (no legend available for this layer)
                if has_rest_url:
                    log.info('found arcgis legend')

                    legend = TranslationStringFactory("geoportailv3_geoportal-legends")
                    client = TranslationStringFactory("geoportailv3_geoportal-client")

                    query_params = {'f': 'pjson'}
                    full_url = internal_wms.rest_url + '/legend?f=pjson'
                    if 'dpi' in self.request.params:
                        query_params['dpi'] = self.request.params["dpi"]

                    if internal_wms.use_auth:
                        auth_token = get_arcgis_token(self.request, log, service_url=full_url)
                        if 'token' in auth_token:
                            query_params["token"] = auth_token['token']

                    full_url = internal_wms.rest_url + '/legend?' + urllib.parse.urlencode(query_params)
                    log.info(full_url)
                    try:
                        url_request = urllib.request.Request(full_url)
                        result = read_request_with_token(url_request, self.request, log)
                        content = result.data
                    except ESRITokenException as e:
                        raise e
                    except Exception as e:
                        log.exception(e)
                        log.error(full_url)
                        return []
                    # f = urllib.request.urlopen(httplib2.iri2uri(full_url), None, 15)
                    data = json.loads(content)

                    active_layers = internal_wms.layers.split(',')
                    localizer = self.request.localizer
                    context = {
                        "data": data,
                        "active_layers": active_layers,
                        "wms_layer": internal_wms.layer,
                        "_l": lambda s: localizer.translate(legend(s)),
                        "_c": lambda s: localizer.translate(client(s)),
                        "legend_title": legend_title
                    }

                    html_legend = render('geoportailv3_geoportal:templates/legends.html', context)
                headers = {"Content-Type": "text/html; charset=utf-8"}
                return Response(html_legend, headers=headers)

            else:
                log.info(f'Found metadata for layer -- legend_name: {metadatas[0].value} -> using doku server')
        if name is None:
            return Response("")
        try:
            url = \
                "https://wiki.geoportail.lu/doku.php?" \
                "id=%s:legend:%s&do=export_html" % \
                (lang, urllib.parse.quote(name))

            f = urllib.request.urlopen(httplib2.iri2uri(url), None, 15)
            data = f.read()
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
        except Exception as e:
            log.exception(e)
            return Response("")

        if res is not None:
            data = res.encode_contents()
        else:
            data = ""

        headers = {"Content-Type": f.info()['Content-Type']}

        return Response(data, headers=headers)
