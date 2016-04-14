from ipaddr import IPv4Network
from pyramid.view import view_config
from geoportailv3.models import LuxLayerInternalWMS
from c2cgeoportal.models import DBSession, RestrictionArea, Role, Layer
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadGateway, HTTPBadRequest
from pyramid.httpexceptions import HTTPNotFound, HTTPUnauthorized
import logging
import urllib2
import sys

log = logging.getLogger(__name__)


class Wms(object):

    def __init__(self, request):
        self.request = request

    def _check_ip(self, client_ip):
        client_ip = IPv4Network(client_ip).ip
        config = self.request.registry.settings
        if 'authorized_ips' in config:
            authorized_ips = config["authorized_ips"].split(",")
            for authorized_ip in authorized_ips:
                a_ip = IPv4Network(authorized_ip)
                if (client_ip == a_ip.network) or (
                   (client_ip >= a_ip.network) and
                   (client_ip < a_ip.broadcast)):
                    return True
        return False

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

        # If the layer is not public check if it comes from an authorized url
        # or from a connected user
        if not internal_wms.public and self.request.user is None:
            remote_addr = str(self.request.environ.get(
                'HTTP_X_FORWARDED_FOR', self.request.environ['REMOTE_ADDR']))
            if not self._check_ip(remote_addr.split(",")[0]):
                return HTTPUnauthorized()

        # If the layer is not public and we are connected check the rights
        if not internal_wms.public and self.request.user is not None:
            # Check if the layer has a resctriction area
            restriction = DBSession.query(RestrictionArea).filter(
                RestrictionArea.roles.any(
                    Role.id == self.request.user.role.id)).filter(
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
                    urllib2.quote(
                        self.request.params.get(param, '').encode('utf-8')
                        ) + "&"
            else:
                param_wms = param_wms + param + "=" + \
                    urllib2.quote(internal_wms.layers.encode('utf-8')) + "&"

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
            f = urllib2.urlopen(url, None, 15)
            data = f.read()
        except:
            log.error(sys.exc_info()[0])
            log.error(url)
            return HTTPBadGateway()

        headers = {"Content-Type": f.info()['Content-Type']}

        return Response(data, headers=headers)
