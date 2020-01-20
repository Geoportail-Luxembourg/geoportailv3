# -*- coding: utf-8 -*-

# Copyright (c) 2011-2015, Camptocamp SA
# All rights reserved.

# Redistribution and use in source and
# binary forms, with or without
# modification, are permitted provided
# that the following conditions are met:

# 1.    Redistributions of source code must
#       retain the above copyright notice, this
#       list of conditions and the following disclaimer.
# 2.    Redistributions in binary form mustg
#       reproduce the above copyright notice,
#       this list of conditions and theg
#       following disclaimer in the documentation
#       and/or other materials provided
#       with the distribution.

# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT
# HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES,
# INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND
# FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE
# COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
# EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
# OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND
# ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.

# The views and conclusions contained in the
# software and documentation are those
# of the authors and should not be interpreted
# as representing official policies,
# either expressed or implied, of the FreeBSD Project.

import os
import json
import logging
import re
import random
import urllib.parse
import urllib.request
from io import BytesIO
from datetime import datetime
from json import dumps, loads

from pyramid.i18n import get_localizer, TranslationStringFactory
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPUnauthorized, HTTPInternalServerError
from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import Response

from PyPDF2 import PdfFileMerger
import weasyprint

from c2cgeoportal_commons.models import DBSession
from c2cgeoportal_commons.models.main import RestrictionArea, Role, Layer, LayerWMTS
from c2cgeoportal_geoportal.views.printproxy import PrintProxy
from c2cgeoportal_geoportal.lib.caching import NO_CACHE, get_region
from geoportailv3_geoportal.models import LuxPrintJob, LuxPrintServers, \
    LuxLayerInternalWMS, LuxLayerExternalWMS

_ = TranslationStringFactory("geoportailv3_geoportal-server")
log = logging.getLogger(__name__)
cache_region = get_region()


class LuxPrintProxy(PrintProxy):
    @view_config(route_name="lux_get_thumbnail")
    def lux_get_thumbnail(self):
        layer_id = self.request.params.get('layerid', 359)
        internal_wms = DBSession.query(LuxLayerInternalWMS).filter(
            LuxLayerInternalWMS.id == layer_id).first()
        center = [684675.0594454071,6379501.028468124]
        scale = 77166.59993240683
        spec = None
        if internal_wms is not None:
            base_url = "https://wmsproxy.geoportail.lu/ogcproxywms"
            spec = {"attributes":{"map":{"dpi":127,"rotation":0,"center":center,"projection":"EPSG:3857","scale":scale,"layers":[{"baseURL":base_url,"imageFormat":"image/png","layers":[internal_wms.layer],"customParams":{"TRANSPARENT":True,"MAP_RESOLUTION":127},"type":"wms","opacity":1,"useNativeAngle":True}]}},"format":"png","layout":"thumbnail"}
        else :
            external_wms = DBSession.query(LuxLayerExternalWMS).filter(
                LuxLayerExternalWMS.id == layer_id).first()
            if external_wms is not None:
                base_url = "https://ws.geoportail.lu/mymaps"
                category_id = external_wms.category_id
                spec = {"attributes":{"map":{"dpi":127,"rotation":0,"center":center,"projection":"EPSG:3857","scale":scale,"layers":[{"baseURL": base_url,"imageFormat":"image/png","layers":["category"],"customParams":{"TRANSPARENT":True,"category_id": category_id,"MAP_RESOLUTION":127},"type":"wms","opacity":1,"useNativeAngle":True}]}},"format":"png","layout":"thumbnail"}
            else:
                layer_wmts = DBSession.query(LayerWMTS).filter(
                    LayerWMTS.id == layer_id).first()
                if layer_wmts is not None:
                    image_type = layer_wmts.image_type
                    image_ext = layer_wmts.image_type.split("/")[1]
                    spec = {"attributes":{"map":{"dpi":127,"rotation":0,"center":center,"projection":"EPSG:3857","scale":scale,"layers":[{"baseURL":"https://wmts3.geoportail.lu/mapproxy_4_v3/wmts/{Layer}/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}."+image_ext,"dimensions":[],"dimensionParams":{},"imageFormat": image_type,"layer":layer_wmts.layer,"matrices":[{"identifier":"13","scaleDenominator":68247.34668321429,"tileSize":[256,256],"topLeftCorner":[-20037508.342789244,20037508.342789244],"matrixSize":[8191,8191]},{"identifier":"14","scaleDenominator":34123.673341607144,"tileSize":[256,256],"topLeftCorner":[-20037508.342789244,20037508.342789244],"matrixSize":[16383,16383]},{"identifier":"15","scaleDenominator":17061.836670785713,"tileSize":[256,256],"topLeftCorner":[-20037508.342789244,20037508.342789244],"matrixSize":[32767,32767]},{"identifier":"16","scaleDenominator":8530.918335392857,"tileSize":[256,256],"topLeftCorner":[-20037508.342789244,20037508.342789244],"matrixSize":[65535,65535]},{"identifier":"17","scaleDenominator":4265.459167714285,"tileSize":[256,256],"topLeftCorner":[-20037508.342789244,20037508.342789244],"matrixSize":[131071,131071]},{"identifier":"18","scaleDenominator":2132.7295838500004,"tileSize":[256,256],"topLeftCorner":[-20037508.342789244,20037508.342789244],"matrixSize":[262143,262143]},{"identifier":"19","scaleDenominator":1066.3647919250002,"tileSize":[256,256],"topLeftCorner":[-20037508.342789244,20037508.342789244],"matrixSize":[524287,524287]},{"identifier":"20","scaleDenominator":533.1823959625001,"tileSize":[256,256],"topLeftCorner":[-20037508.342789244,20037508.342789244],"matrixSize":[1048575,1048575]},{"identifier":"21","scaleDenominator":266.59119798125005,"tileSize":[256,256],"topLeftCorner":[-20037508.342789244,20037508.342789244],"matrixSize":[2097151,2097151]}],"matrixSet":"GLOBAL_WEBMERCATOR_4_V3","opacity":1,"requestEncoding":"REST","style":"default","type":"WMTS","version":"1.0.0"}]}},"format":"png","layout":"thumbnail"}
        if spec is None:
            return HTTPNotFound()

        for map_layer in spec["attributes"]["map"]["layers"]:
            if "baseURL" in map_layer and\
               "ogcproxywms" in map_layer["baseURL"]:
                token = self.config["authtkt_secret"]
                if "customParams" in map_layer:
                    map_layer["customParams"]["GP_TOKEN"] = token
                else:
                    map_layer["customParams"] = {"GP_TOKEN": token}
                if self.request.user and\
                   self.request.user.ogc_role is not None and\
                   self.request.user.ogc_role != -1:
                    if "customParams" in map_layer:
                        map_layer["customParams"]["roleOGC"] =\
                            str(self.request.user.ogc_role)
                    else:
                        map_layer["customParams"] =\
                            {"roleOGC": str(self.request.user.ogc_role)}

                for layer in map_layer["layers"]:
                    internal_wms = DBSession.query(LuxLayerInternalWMS).filter(
                        LuxLayerInternalWMS.layer == layer).first()
                    if internal_wms is not None and\
                       not self._is_authorized(internal_wms):
                            return HTTPUnauthorized()

        print_servers = DBSession.query(LuxPrintServers).all()
        print_urls = [print_server.url for print_server in print_servers]
        urllib.request.getproxies = lambda: {}
        valid_print_urls = []
        if print_urls is not None and len(print_urls) > 0:
            for url in print_urls:
                try:
                    test_url = url.replace("/print/geoportailv3", "")
                    urllib.request.urlopen(test_url)
                    valid_print_urls.append(url)
                except Exception as e:
                    log.exception(e)
                    log.error("Print server not available : " + url)
            print_url = valid_print_urls[random.randint(0, len(valid_print_urls) - 1)]
        else:
            print_url = self.config["print_url"]
        resp, content = self._proxy("%s/buildreport.png" % (print_url), params="", method="POST", body=str.encode(dumps(spec)), headers={"Referer": "http://print.geoportail.lu/"})
        resp["content-disposition"] = "filename=%s.png" % (str(layer_id))

        return self._build_response(
            resp, content, NO_CACHE, "print"
        )

    @view_config(route_name="lux_printproxy_report_create")
    def lux_report_create(self):
        token = self.config["authtkt_secret"]
        print_servers = DBSession.query(LuxPrintServers).all()
        if os.environ.get('FAKE_PRINT_URLS'):
            print_urls = os.environ.get('FAKE_PRINT_URLS').split(',')
        else:
            print_urls = [print_server.url for print_server in print_servers]
        urllib.request.getproxies = lambda: {}
        valid_print_urls = []
        if print_urls is not None and len(print_urls) > 0:
            for url in print_urls:
                try:
                    test_url = url.replace("/print/geoportailv3", "")
                    urllib.request.urlopen(test_url)
                    valid_print_urls.append(url)
                except Exception as e:
                    log.exception(e)
                    log.error("Print server not available : " + url)
            print_url = valid_print_urls[random.randint(0,
                                         len(valid_print_urls) - 1)]
        else:
            print_url = self.config["print_url"]

        spec = json.loads(self.request.body.decode("utf-8").replace(".app.geoportail", ".geoportail"))
        for map_layer in spec["attributes"]["map"]["layers"]:
            if "baseURL" in map_layer and\
               "ogcproxywms" in map_layer["baseURL"]:
                if "customParams" in map_layer:
                    map_layer["customParams"]["GP_TOKEN"] = token
                else:
                    map_layer["customParams"] = {"GP_TOKEN": token}
                if self.request.user and\
                   self.request.user.ogc_role is not None and\
                   self.request.user.ogc_role != -1:
                    if "customParams" in map_layer:
                        map_layer["customParams"]["roleOGC"] =\
                            str(self.request.user.ogc_role)
                    else:
                        map_layer["customParams"] =\
                            {"roleOGC": str(self.request.user.ogc_role)}

                for layer in map_layer["layers"]:
                    internal_wms = DBSession.query(LuxLayerInternalWMS).filter(
                        LuxLayerInternalWMS.layer == layer).first()
                    if internal_wms is not None and\
                       not self._is_authorized(internal_wms):
                            return HTTPUnauthorized()
        if "longUrl" in spec["attributes"]:
            opener = urllib.request.build_opener(urllib.request.HTTPHandler())
            data = urllib.parse.urlencode({"url": spec["attributes"]["longUrl"]})
            content = opener.open(
                "https://map.geoportail.lu/short/create",
                data=data.encode('utf-8')).read()
            shortner = json.loads(content)
            spec["attributes"]["url"] = shortner["short_url"]
            spec["attributes"]["qrimage"] =\
                "https://map.geoportail.lu/main/wsgi/qr?url=" + \
                spec["attributes"]["url"]

        job = LuxPrintJob()
        job.spec = json.dumps(spec)
        self.request.body = str.encode(job.spec)

        resp, content = self._proxy("%s/report.%s" % (
            print_url,
            self.request.matchdict.get("format")
        ))
        job.id = json.loads(content)["ref"]
        job.print_url = print_url
        job.creation = datetime.now()
        DBSession.add(job)

        return self._build_response(
            resp, content, False, "print"
        )

    @view_config(route_name="lux_printproxy_status")
    def lux_status(self):
        ref = self.request.matchdict.get("ref")
        job = DBSession.query(LuxPrintJob).get(ref)

        try:
            return self._proxy_response(
                "print",
                "%s/status/%s.json" % (
                    job.print_url,
                    ref
                ),
            )
        except Exception as e:
            log.exception(e)
            job.is_error = True
            return HTTPInternalServerError()

    def _is_authorized(self, internal_wms):
        if internal_wms.public:
            return True
        if self.request.user is None:
            return False
        else:
            restriction = DBSession.query(RestrictionArea).filter(
                RestrictionArea.roles.any(
                    Role.id == self.request.user.role.id)).filter(
                        RestrictionArea.layers.any(
                            Layer.id == internal_wms.id
                        )
                    ).first()
            # If not restriction is set then return unauthorized
            if restriction is None:
                return False
        return True

    @view_config(route_name="lux_printproxy_report_cancel")
    def lux_cancel(self):
        ref = self.request.matchdict.get("ref")
        job = DBSession.query(LuxPrintJob).get(ref)
        print_url = job.print_url
        DBSession.query(LuxPrintJob).filter(
            LuxPrintJob.id == ref
        ).delete()
        return self._proxy_response(
            "print",
            "%s/cancel/%s" % (
                print_url,
                ref
            ),
        )

    def _create_legend_from_image(self, url, title, access_constraints):
        css = weasyprint.CSS(
            string="img {max-height: 800px}"
        )

        log.info("Get legend from URL:\n%s." % url)

        legend_buffer = BytesIO()
        html_access_constraints = ""
        if access_constraints is not None and\
           len(access_constraints) > 0:
            h2_title = _("Access constraints")
            localizer = get_localizer(self.request)
            trans_h2_title = localizer.translate(h2_title)
            html_access_constraints = """<h2>%(h2_title)s</h2>
            <i>%(access_constraints)s</i>""" % {
                'access_constraints': access_constraints,
                'h2_title': trans_h2_title}

        html = """<html><head><title>%(title)s</title></head>
        <body><h1>%(title)s</h1>
        <img src='%(url)s'/><br>
        %(html_access_constraints)s
        </body></html>""" % {
            'url': url,
            'title': title,
            'html_access_constraints': html_access_constraints}

        weasyprint.HTML(string=html).write_pdf(
            legend_buffer,
            stylesheets=[css]
        )
        return legend_buffer

    @cache_region.cache_on_arguments()
    def _get_legend(self, name, lang):
        css = weasyprint.CSS(
            string="img {max-height: 800px}"
        )

        url = \
            "http://wiki.geoportail.lu/doku.php?" \
            "id=%s:legend:%s&do=export_html" % \
            (lang, name)
        log.info("Get legend from URL:\n%s." % url)

        legend_buffer = BytesIO()
        weasyprint.HTML(url).write_pdf(
            legend_buffer,
            stylesheets=[css]
        )
        return legend_buffer

    @view_config(route_name="lux_printproxy_report_get")
    def lux_report_get(self):
        ref = self.request.matchdict.get("ref")
        job = DBSession.query(LuxPrintJob).get(ref)
        if job is None:
            return HTTPNotFound()
        try:
            resp, content = self._proxy("%s/report/%s" % (
                job.print_url, ref
            ))

            attributes = json.loads(job.spec)["attributes"]
            is_pdf = json.loads(job.spec)["format"] == "pdf"
            print_title = attributes.get("name")
            if print_title is None or len(print_title) == 0:
                print_title = "map_geoportal_lu"
            print_title = re.sub(r" ", "_", print_title)
            print_title = re.sub(r"[^a-zA-Z0-9\-\_]", "", print_title)

            if is_pdf and "firstPagesUrls" in attributes and\
                    attributes["firstPagesUrls"] is not None and\
                    len(attributes["firstPagesUrls"]) > 0:
                attributes["firstPagesUrls"].reverse()
                for pageUrl in attributes["firstPagesUrls"]:
                    try:
                        merger = PdfFileMerger(strict=False)
                        if pageUrl['type'].lower() == 'pdf':
                            opener = urllib.request.build_opener(
                                urllib.request.HTTPHandler())
                            pdf_content = opener.open(pageUrl['url']).read()
                            merger.append(BytesIO(pdf_content))
                        else:
                            first_page = BytesIO()
                            weasyprint.HTML(pageUrl['url']).write_pdf(
                                first_page
                            )
                            merger.append(first_page)
                        merger.append(BytesIO(content))
                        content = BytesIO()
                        merger.write(content)
                        content = content.getvalue()
                    except Exception as e:
                        log.exception(e)

            if is_pdf and "legend" in attributes and\
                    attributes["legend"] is not None:
                merger = PdfFileMerger(strict=False)
                merger.append(BytesIO(content))

                lang = attributes.get("lang")

                for item in attributes["legend"]:
                    if "legendUrl" in item and item["legendUrl"] is not None:
                        legend_title = ""
                        if "legendTitle" in item and\
                           item["legendTitle"] is not None:
                            legend_title = item["legendTitle"]
                        access_constraints = ""
                        if "accessConstraints" in item and\
                           item["accessConstraints"] is not None:
                            access_constraints = item["accessConstraints"]
                        merger.append(
                            self._create_legend_from_image(
                                item["legendUrl"],
                                legend_title,
                                access_constraints))
                    elif "name" in item and item["name"] is not None:
                        merger.append(self._get_legend(item["name"], lang))

                content = BytesIO()
                merger.write(content)
                content = content.getvalue()

            if is_pdf and "queryResults" in attributes and\
                    attributes["queryResults"] is not None:
                css = weasyprint.CSS(
                    string=".ng-hide {display: none !important;} " +
                           ".no-print {display: none !important;} " +
                           "body {font-size: 60%;} " +
                           ".route-details-step { font-family: " +
                           "Arial,sans-serif; font-size: 14px; " +
                           "line-height: 20px; border-bottom: 1px " +
                           "solid #8394A0; padding: 10px 10px 10px 30px; " +
                           "margin: 0 -12px 0 0; position: relative;} " +
                           ".route-info-title {font-size: 18px; " +
                           "line-height: 19px; font-weight: 700;} " +
                           ".route-general-info-container {display: " +
                           "table; width: 100%;} " +
                           ".route-single-info {display: table-cell; " +
                           "width: auto;} " +
                           ".route-info-general-data {font-size: 18px; " +
                           "font-weight: 700; line-height: 22px; " +
                           "padding-top: 10px;} " +
                           ".route-info-data {color: #8394A0;} " +
                           ".route-instruction-data {font-size: 16px; " +
                           "line-height: 19px; display: inline-block; " +
                           "margin: 0 10px 0 0;} " +
                           ".route-instruction {margin-bottom: 10px;" +
                           "position: relative;} " +
                           ".icon-Direction {position: absolute; top: 0;" +
                           "right: 100%; margin-right: 6px;} " +
                           ".icon-Direction:before {font-family: " +
                           "apart-geoportail!important;content: '\e903';" +
                           "font-size: 6px;color:'#000';} " +
                           ".south {transform: rotate(90deg);} " +
                           ".north {transform: rotate(270deg);} " +
                           ".west {transform: rotate(180deg);} " +
                           ".east {transform: rotate(0deg);} " +
                           ".n-e {transform: rotate(315deg);} " +
                           ".n-w {transform: rotate(225deg);} " +
                           ".s-w {transform: rotate(135deg);} " +
                           ".s-e {transform: rotate(45deg);} "
                )
                merger = PdfFileMerger(strict=False)
                merger.append(BytesIO(content))
                query_results = BytesIO()
                weasyprint.HTML(string=attributes["queryResults"]).write_pdf(
                    query_results,
                    stylesheets=[css]
                )
                merger.append(query_results)

                content = BytesIO()
                merger.write(content)
                content = content.getvalue()

            DBSession.delete(job)
            if is_pdf:
                resp["content-disposition"] =\
                    "attachment; filename=%s.pdf" % (str(print_title))
            else:
                resp["content-disposition"] =\
                    "attachment; filename=%s.png" % (str(print_title))

            return self._build_response(
                resp, content, NO_CACHE, "print"
            )
        except Exception as e:
            log.exception(e)
            log.error("reference is : " + ref)
            if job is not None:
                job.is_error = True
            return HTTPInternalServerError()
