from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest, HTTPNotAcceptable
from io import BytesIO
import logging
import qrcode
import re

log = logging.getLogger(__name__)


class Qr(object):

    def __init__(self, request):
        self.request = request
        self.regex = re.compile('''^http[s]{0,1}://.*
                                [127.0.0.1|localhost
                                |g-o.lu|geoportal.lu
                                |geoportail.lu]{1}.*$''', re.VERBOSE)

    @view_config(route_name='qr')
    def getqrcode(self):
        url = self.request.params.get('url', '')
        if len(url) == 0:
            return HTTPBadRequest()
        if not self.regex.match(url):
            return HTTPNotAcceptable(
                "not a valid url for this QR code generator")
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=3,
            border=0
        )
        qr.add_data(url)
        qr.make(fit=True)
        im = qr.make_image()
        output = BytesIO()
        im.save(output)
        headers = {"Content-Type": 'image/png'}
        return Response(output.getvalue(), headers=headers)
