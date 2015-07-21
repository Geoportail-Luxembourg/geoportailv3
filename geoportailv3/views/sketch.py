from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.httpexceptions import HTTPUnauthorized
import logging

log = logging.getLogger(__name__)


class Sketch(object):

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

        sketch_filepath = dirname+"/"+filename+".pdf"
        f = None
        try:
            f = open(sketch_filepath, 'r')
        except:
            try:
                sketch_filepath = dirname+"/"+filename+".PDF"
                f = open(sketch_filepath, 'r')
            except:
                f = None

        if f is None:
                return HTTPBadRequest()

        self._log_download_stats(filename, dirname)

        headers = {"Content-Type": "application/pdf",
                   "Content-Disposition": "attachment; filename=\"" +
                   str(filename) + ".pdf\""}

        return Response(f.read(), headers=headers)

    def _log_download_stats(self, filename, townname):
        pass
        # sketchDownload = SketchDownload()
        # sketchDownload.user_login = self.user
        # sketchDownload.application = str(request.environ.get('SERVER_NAME'))
        # sketchDownload.filename = filename
        # sketchDownload.directory = townName
        # Session.add(sketchDownload)
        # Session.commit()
