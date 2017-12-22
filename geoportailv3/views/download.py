# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.httpexceptions import HTTPUnauthorized
from geoportailv3.portail import MesurageDownload, SketchDownload
from geoportailv3.portail import PortailSession
from geoportailv3.models import LuxDownloadUrl, LuxMeasurementDirectory
from c2cgeoportal.models import DBSession
import logging
import mimetypes
import geoportailv3.PF
import urllib2

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
                data = urllib2.urlopen(url, None, 1800)
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

    @view_config(route_name='download_sketch')
    def download_sketch(self):

        if self.request.user is None:
            return HTTPUnauthorized()
        filename = self.request.params.get('name', None)
        if filename is None:
            return HTTPBadRequest()

        dirname = "/publication/CRAL_PDF"

        sketch_filepath = "%s/%s.pdf" % (dirname, filename)
        f = None
        try:
            f = open(sketch_filepath, 'r')
        except:
            try:
                sketch_filepath = "%s/%s.PDF" % (dirname, filename)
                f = open(sketch_filepath, 'r')
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

        pf = geoportailv3.PF.PF()

        if not pf._is_download_authorized(
                townname, self.request.user, self.request.referer):
            return HTTPUnauthorized()
        cur_record = DBSession.query(LuxMeasurementDirectory).\
            filter(LuxMeasurementDirectory.name == townname).first()
        if cur_record is None:
            return HTTPBadRequest("Invalid Town name")
        measurement_filepath = "%s/%s" % (cur_record.path, filename)

        f = open(measurement_filepath, 'r')

        parcel = self.request.params.get("parcel", "UNKNOWN")

        self._log_download_measurement_stats(filename, townname, parcel)
        headers = {"Content-Type": "application/pdf",
                   "Content-Disposition": "attachment; filename=\"%s\""
                   % (str(filename))}

        return Response(f.read(), headers=headers)

    def _log_download_sketch_stats(self, filename, town):
        sketch_download = SketchDownload()
        sketch_download.login = self.request.user.username
        sketch_download.application = self.request.host
        sketch_download.filename = filename
        sketch_download.directory = town

        PortailSession.add(sketch_download)
        PortailSession.commit()

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

        PortailSession.add(mesurage_download)
        PortailSession.commit()
