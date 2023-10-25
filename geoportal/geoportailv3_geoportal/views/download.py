# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.httpexceptions import HTTPUnauthorized
from geoportailv3_geoportal.portail import MesurageDownload, SketchDownload
from geoportailv3_geoportal.models import LuxDownloadUrl, LuxMeasurementDirectory
from geoportailv3_geoportal.models import LuxMeasurementLoginCommune
from c2cgeoportal_commons.models import DBSession

from sqlalchemy import func

import logging
import mimetypes
import geoportailv3_geoportal.PF
import urllib.request
import tempfile
import subprocess
import os
import transaction
import json
from PyPDF2 import PdfFileReader

log = logging.getLogger(__name__)


class Download(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='download')
    def download_generic(self):
        id = self.request.params.get('id', None)
        filename = self.request.params.get('filename', None)
        if id is None or filename is None:
            return HTTPBadRequest()
        entry = DBSession.query(LuxDownloadUrl).filter(
                    LuxDownloadUrl.id == id).first()
        if entry is not None:
            if entry.protected and self.request.user is None:
                return HTTPUnauthorized()
            url = entry.url + filename
            try:
                data = urllib.request.urlopen(url, None, 1800)
            except Exception as e:
                log.exception(e)
                data = None
                log.debug(url)
            mimetypes.init()
            type = "application/octet-stream"
            mimetype = mimetypes.guess_type(url)
            if mimetype[0] is not None:
                type = mimetype[0]
            headers = {"Content-Type": type,
                       "Content-Disposition": "attachment; filename=\""
                       + str(filename) + "\""}
            if data is not None:
                return Response(data.read(), headers=headers)
        return HTTPBadRequest()

    def download_sketch_by_id(self):
        id = self.request.params.get('id', None)
        timeout = 15
        ng_url = "https://arcgis-portal.public.lu/server/rest/services/Cadastre/TOPO_NG_POINTS_PUBLIC/MapServer/0/"
        url1 = ng_url + "%(id)s/attachments?f=pjson" %{'id': id}
        pdf_id = None
        pdf_name = None
        try:
            f = urllib.request.urlopen(url1, None, timeout)
            data = f.read()
            attachmentInfos = json.loads(data)["attachmentInfos"]
            for info in attachmentInfos:
                if info["contentType"] == "application/pdf":
                    pdf_id = info["id"]
                    pdf_name = info["name"]
        except:
            print (url1)
            return HTTPBadRequest()
        if pdf_name is None or pdf_id is None:
            print (url1)
            return HTTPBadRequest()
        url2 = ng_url + "%(id)s/attachments/%(pdf_id)s" %{'id': id, 'pdf_id': pdf_id}

        try:
            f = urllib.request.urlopen(url2, None, timeout)
            data = f.read()
        except:
            print (url2)
            return HTTPBadRequest()

        headers = {"Content-Type": "application/pdf",
                   "Content-Disposition": "attachment; filename=\"%(pdf_name)s.pdf\"" %{'pdf_name': pdf_name}}

        return Response(data, headers=headers)

    @view_config(route_name='download_sketch')
    def download_sketch(self):
        type = self.request.params.get('type', None)
        if type == 'new':
            return self.download_sketch_by_id()

        filename = self.request.params.get('name', None)
        if filename is None:
            return HTTPBadRequest()

        dirname = "/publication/CRAL_PDF"

        sketch_filepath = "%s/%s.pdf" % (dirname, filename)
        if os.path.dirname(sketch_filepath) != dirname:
            return HTTPBadRequest()

        f = None
        try:
            f = open(sketch_filepath, 'rb')
        except:
            try:
                sketch_filepath = "%s/%s.PDF" % (dirname, filename)
                f = open(sketch_filepath, 'rb')
            except:
                f = None

        if f is None:
                return HTTPBadRequest()

        self._log_download_sketch_stats(filename, dirname)

        headers = {"Content-Type": "application/pdf",
                   "Content-Disposition": "attachment; filename=\"" +
                   str(filename) + ".pdf\""}

        return Response(f.read(), headers=headers)

    def _is_download_authorized(self, town_code, user, referer):
        if referer is not None:
            if "bodfeature" in referer and "search4naila" in referer:
                return True
            if "weboffice" in referer:
                return True
            if "weboffice_um" in referer:
                return True

        if (town_code is None or user is None or user.username is None):
            return False

        if (DBSession.query(LuxMeasurementLoginCommune).
                filter(func.lower(LuxMeasurementLoginCommune.login) ==
                       func.lower(func.geov3.getMainAccount(user.username))).
                filter(LuxMeasurementLoginCommune.num_commune ==
                       str(town_code)).count() > 0):
            return True

        if (DBSession.query(LuxMeasurementLoginCommune).
                filter(func.lower(LuxMeasurementLoginCommune.login) ==
                       func.lower(user.username)).
                filter(LuxMeasurementLoginCommune.num_commune ==
                       str(town_code)).count() > 0):
            return True

        return False

    @view_config(route_name='download_measurement')
    def download_measurement(self):
        if self.request.user is None and self.request.referer is None:
            return HTTPUnauthorized()
        document_id = self.request.params.get("document_id", None)
        townname = self.request.params.get("dirName", None)
        filename = self.request.params.get("filename", None)
        if document_id is not None:
            base_url = os.environ["API-ARCHIMET-URL"]
            api_key = os.environ["API-ARCHIMET-KEY"]
            hdr = {'api-key': api_key}

            url = f"{base_url}/document/{document_id}/"
            req = urllib.request.Request(url, headers=hdr)
            response = urllib.request.urlopen(req)
            cur_doc = json.loads(response.read())
            dossier_id = cur_doc['dossier_id']
            url = f"{base_url}/dossiers/{dossier_id}/"
            req = urllib.request.Request(url, headers=hdr)
            response = urllib.request.urlopen(req)
            cur_dossier = json.loads(response.read())
            if not self._is_download_authorized(
                cur_dossier['commune_cadastrale']['directive_id'],
                self.request.user, self.request.referer):
                return HTTPUnauthorized()

            url = f"{base_url}/document/file/{document_id}/?document_format=pdf"
            req = urllib.request.Request(url, headers=hdr)
            response = urllib.request.urlopen(req)
            headers = {"Content-Type": "application/pdf",
                   "Content-Disposition": "attachment; filename=\"%s\""
                   % (str(filename))}
            return Response(response.read(), headers=response.headers)
        
        if filename is None or townname is None:
            return HTTPBadRequest("parameters are missing")

        pf = geoportailv3_geoportal.PF.PF()

        if not pf._is_download_authorized(
                townname, self.request.user, self.request.referer):
            return HTTPUnauthorized()
        cur_record = DBSession.query(LuxMeasurementDirectory).\
            filter(LuxMeasurementDirectory.name == townname).first()
        if cur_record is None:
            return HTTPBadRequest("Invalid Town name")
        measurement_filepath = "%s/%s" % (cur_record.path, filename)

        f = open(measurement_filepath, 'rb')

        parcel = self.request.params.get("parcel", "UNKNOWN")

        self._log_download_measurement_stats(filename, townname, parcel)
        headers = {"Content-Type": "application/pdf",
                   "Content-Disposition": "attachment; filename=\"%s\""
                   % (str(filename))}

        return Response(f.read(), headers=headers)

    def preview_measurement(self):
        base_url = os.environ["API-ARCHIMET-URL"]
        api_key = os.environ["API-ARCHIMET-KEY"]
        document_id = self.request.params.get("document_id", None)
        url = f"{base_url}/document/preview/{document_id}/?variant=public"
        hdr = {'api-key': api_key}
        req = urllib.request.Request(url, headers=hdr)
        response = urllib.request.urlopen(req)

        headers = {"Content-Type": "image/png"}
        return Response(response.read(), headers=headers)

    @view_config(route_name='preview_measurement')
    def view_measurement(self):
        base_url = os.environ["API-ARCHIMET-URL"]
        api_key = os.environ["API-ARCHIMET-KEY"]
        document_id = self.request.params.get("document_id", None)
        if self.request.user is None and self.request.referer is None and document_id is None:
            return self.preview_measurement()
        hdr = {'api-key': api_key}
        url = f"{base_url}/document/{document_id}/"
        req = urllib.request.Request(url, headers=hdr)
        response = urllib.request.urlopen(req)
        cur_doc = json.loads(response.read())
        dossier_id = cur_doc['dossier_id']
        url = f"{base_url}/dossiers/{dossier_id}/"
        req = urllib.request.Request(url, headers=hdr)
        response = urllib.request.urlopen(req)
        cur_dossier = json.loads(response.read())
        if not self._is_download_authorized(
            cur_dossier['commune_cadastrale']['directive_id'],
            self.request.user, self.request.referer):
            return self.preview_measurement()

        url = f"{base_url}/document/preview/{document_id}/"
        req = urllib.request.Request(url, headers=hdr)
        response = urllib.request.urlopen(req)

        headers = {"Content-Type": "image/png"}
        return Response(response.read(), headers=headers)

    def _log_download_sketch_stats(self, filename, town):
        sketch_download = SketchDownload()
        if self.request.user is not None:
            sketch_download.login = self.request.user.username
        else:
            sketch_download.login = None
        sketch_download.application = self.request.host
        sketch_download.filename = filename
        sketch_download.directory = town

        DBSession.add(sketch_download)
        transaction.commit()

    def _log_download_measurement_stats(self, filename, town, parcel):
        mesurage_download = MesurageDownload()
        if self.request.user is None:
            mesurage_download.login = 'weboffice'
        else:
            mesurage_download.login = self.request.user.username

        mesurage_download.application = self.request.host
        mesurage_download.filename = filename
        mesurage_download.commune = town
        mesurage_download.parcelle = parcel

        DBSession.add(mesurage_download)
        transaction.commit()

    @view_config(route_name='rapport_forage_virtuel')
    def rapport_forage_virtuel(self):
        x = self.request.params.get('x', None)
        y = self.request.params.get('y', None)
        email = self.request.params.get('email', None)

        if x is None or x is None or email is None:
            return HTTPBadRequest()

        buffer_distance = 200;
        xmin = str(round(float(x) - buffer_distance, 0))
        ymin = str(round(float(y) - buffer_distance, 0))
        xmax = str(round(float(x) + buffer_distance, 0))
        ymax = str(round(float(y) + buffer_distance, 0))
        url_with_token = os.environ["URL_FME_FORAGE_VIRTUEL"] 
        url = f"{url_with_token}&coord_X={x}&coord_Y={y}&xmin={xmin}&ymin={ymin}&xmax={xmax}&ymax={ymax}&client_mail={email}&opt_servicemode=async"
        try:
            log.error(url)
            response = urllib.request.urlopen(url, None, 360)
            log.error(url)
            if response is not None:
                return Response(response.read(), headers=response.headers)
        except Exception as e:
            log.exception(e)
            log.error(url)
        return HTTPBadRequest()
