from pyramid.view import view_config
from geoportailv3.models import LuxLayerInternalWMS
from c2cgeoportal.models import DBSession, RestrictionArea, Role, Layer
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadGateway, HTTPBadRequest
from pyramid.httpexceptions import HTTPNotFound, HTTPUnauthorized
import logging
import urllib2

log = logging.getLogger(__name__)


class Wms(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='wms')
    def internal_proxy_wms(self):
        layers = self.request.params.get('LAYERS', '')
        layers = layers.split(',')
        if len(layers) == 0:
            return HTTPBadRequest()
        # TODO: Multiple layers could be requested with a single request
        # Today the first layer wins.
        layer = layers[0]

        internal_wms = DBSession.query(LuxLayerInternalWMS).filter(
            LuxLayerInternalWMS.layer == layer).first()
        if internal_wms is None:
            return HTTPNotFound()

        # If the layer is not public and we are not connected then refuse
        if not internal_wms.public and self.request.user is None:
            return HTTPUnauthorized()

        # If the layer is not public and we are connected check the rights
        if not internal_wms.public and self.request.user is not None:
            # Check if the layer has a resctriction area
            restriction = DBSession.query(RestrictionArea).filter(
                RestrictionArea.roles.any(
                    Role.id == self.request.user['role'])).filter(
                RestrictionArea.layers.any(
                    Layer.id == internal_wms.id
                )
                ).first()
            # If not restriction is set then return unauthorized
            if restriction is None or not restriction.readwrite:
                return HTTPUnauthorized()

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
        if self.request.user:
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

        headers = {"Content-Type": f.info()['Content-Type']}

        return Response(data, headers=headers)
