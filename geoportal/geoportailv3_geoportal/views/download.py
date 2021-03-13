# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.httpexceptions import HTTPUnauthorized
from geoportailv3_geoportal.portail import MesurageDownload, SketchDownload
from geoportailv3_geoportal.models import LuxDownloadUrl, LuxMeasurementDirectory
from c2cgeoportal_commons.models import DBSession
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
        ng_url = os.environ["NG_URL"]

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

    @view_config(route_name='download_measurement')
    def download_measurement(self):
        if self.request.user is None and self.request.referer is None:
            return HTTPUnauthorized()

        townname = self.request.params.get("dirName", None)
        filename = self.request.params.get("filename", None)

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

        measurement_filepath = "%s/%s/%s" % (cur_record.path_mo, filename.split('_')[1], filename)

        f = open(measurement_filepath, 'rb')

        parcel = self.request.params.get("parcel", "UNKNOWN")

        self._log_download_measurement_stats(filename, townname, parcel)
        headers = {"Content-Type": "application/pdf",
                   "Content-Disposition": "attachment; filename=\"%s\""
                   % (str(filename))}

        return Response(f.read(), headers=headers)

    @view_config(route_name='preview_measurement')
    def preview_measurement(self):
        towncode = self.request.params.get("code", None)
        filename = self.request.params.get("filename", None)
        cur_record = DBSession.query(LuxMeasurementDirectory).\
            filter(LuxMeasurementDirectory.town_code == int(towncode)).first()
        if cur_record is None:
            return HTTPBadRequest("Invalid Town name")
        measurement_filepath = "%s/%s" % (cur_record.path, filename)
        input1 = PdfFileReader(open(measurement_filepath, 'rb'))
        factor = 1.5
        page0 = input1.getPage(0)
        width = int(int(page0.mediaBox[2]) / factor)
        height = int(int(page0.mediaBox[3]) / factor)
        (fd, tempfilename) = tempfile.mkstemp(".png")
        try:
            subprocess.call(["/usr/bin/convert", "-sample",
                             str(width) + "x" + str(height),
                             measurement_filepath, tempfilename])
            tfile = open(tempfilename, "rb")
            data = tfile.read()
        finally:
            os.close(fd)
            os.remove(tempfilename)
        headers = {"Content-Type": "image/png"}
        return Response(data, headers=headers)

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
