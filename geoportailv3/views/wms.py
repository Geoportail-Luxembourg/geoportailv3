from pyramid.view import view_config
from geoportailv3.models import LuxLayerInternalWMS
from c2cgeoportal.models import DBSession
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadGateway
import logging
import urllib2

log = logging.getLogger(__name__)


class Wms(object):

    def __init__(self, request):
        self.request = request
        if request.environ.get("REMOTE_USER"):
            self.user = request.environ.get("REMOTE_USER")
        else:
            self.user = None

    @view_config(route_name='wms')
    def internal_proxy_wms(self):
        layers = self.request.params.get('LAYERS', '')
        layers = layers.split(',')

        # TODO: Multiple layers could be requested with a single request
        # Today the first layer win.
        layer = layers[0]

        internal_wms = DBSession.query(LuxLayerInternalWMS).filter(
            LuxLayerInternalWMS.layer == layer).one()

        remote_host = internal_wms.url

        param_wms = ""
        for param in self.request.params:
            if param.lower() == "styles" and \
               remote_host.lower().find("styles") > -1:
                continue

            if param.lower() != 'layers':
                param_wms = param_wms + param + "=" + \
                    self.request.params.get(param, '') + "&"
            else:
                param_wms = param_wms + param + "=" + internal_wms.layers + "&"

        # TODO : Specific action when user is logged in ?
        # Forward authorization to the remote host
        # check sso
        if self.user:
            pass

        url = ""
        t = "transparent=true"
        if remote_host.lower().find(t) > -1 and param_wms.lower().find(t) > -1:
            remote_host = remote_host.replace(t, "")

        if remote_host.find("?") == -1:
            remote_host = remote_host + "?"

        separator = ""
        if remote_host[:-1] != "?" and remote_host[:-1] != "&":
            separator = "&"

        url = remote_host + separator + param_wms[:-1]

        try:
            f = urllib2.urlopen(url)
            data = f.read()
        except:
            log.error(url)
            return HTTPBadGateway()

        headers = {}
        headers['content-type'] = f.info()['Content-Type']

        return Response(data, headers=headers)
