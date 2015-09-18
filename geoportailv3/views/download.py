# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.httpexceptions import HTTPUnauthorized
from geoportailv3.portail import MesurageDownload, SketchDownload
from geoportailv3.portail import PortailSession
import logging
import geoportailv3.PF

log = logging.getLogger(__name__)


class Download(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='download_sketch')
    def download_sketch(self):

        if self.request.user is None:
            return HTTPUnauthorized()
        filename = self.request.params.get('name', None)
        if filename is None:
            return HTTPBadRequest()

        dirname = "/sketch"

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

        dirname = self.request.params.get("dirName", None)
        filename = self.request.params.get("filename", None)
        in_directory = self.request.params.get("inDirectory", None)

        if filename is None or dirname is None:
            return HTTPBadRequest("parameters are missing")

        pf = geoportailv3.PF.PF()

        if not pf._is_download_authorized(
                dirname, self.request.user, self.request.referer):
            return HTTPUnauthorized()

        measurement_filepath = "%s/%s" % (dirname, filename)
        if (in_directory is not None and len(in_directory) > 0):
            measurement_filepath = "%s/%s" % (in_directory,
                                              measurement_filepath)

        f = open("/mesurage/pdf/"+measurement_filepath, 'r')

        parcel = self.request.params.get("parcel", "UNKNOWN")

        self._log_download_measurement_stats(filename, dirname, parcel)
        headers = {"Content-Type": "application/pdf",
                   "Content-Disposition": "attachment; filename=\"%s.pdf\""
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
