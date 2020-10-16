from ipaddr import IPv4Network
from pyramid.view import view_config
from geoportailv3_geoportal.models import LuxLayerInternalWMS, LuxPredefinedWms
from c2cgeoportal_commons.models import DBSession
from c2cgeoportal_commons.models.main import RestrictionArea, Role, Layer
from c2cgeoportal_geoportal.lib import get_url2
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadGateway, HTTPBadRequest
from pyramid.httpexceptions import HTTPNotFound, HTTPUnauthorized
import logging
import urllib.request
import urllib.parse
import socket
import base64
import os
import json
from datetime import datetime

log = logging.getLogger(__name__)


class Wms(object):

    def __init__(self, request):
        self.request = request

    def _check_token(self, token):
        config = self.request.registry.settings
        if config["authtkt_secret"] == token:
            return True
        return False

    def _check_ip(self, client_ip):
        client_ip = IPv4Network(client_ip).ip
        config = self.request.registry.settings
        if "authorized_ips" in config:
            if config["authorized_ips"] is not None:
                authorized_ips = config["authorized_ips"].split(",")
                for authorized_ip in authorized_ips:
                    a_ip = IPv4Network(authorized_ip.strip())
                    if (client_ip == a_ip.network) or (
                       (client_ip >= a_ip.network) and
                       (client_ip < a_ip.broadcast)):
                        return True
        return False

    def _check_ip_for_httpsproxy(self, url):
        parsedurl = urllib.parse.urlparse(url)
        hostname = parsedurl.netloc.split(":")
        remote_ip = IPv4Network(socket.gethostbyname(hostname[0])).ip
        config = self.request.registry.settings
        if "https_proxy" in config:
            if "unauthorized_ips" in config["https_proxy"]:
                unauthorized_ips =\
                    config["https_proxy"]["unauthorized_ips"].split(",")
                for unauthorized_ip in unauthorized_ips:
                    a_ip = IPv4Network(unauthorized_ip.strip())
                    if (remote_ip == a_ip.network) or (
                       (remote_ip >= a_ip.network) and
                       (remote_ip < a_ip.broadcast)):
                        if "authorized_hosts" in config["https_proxy"]:
                            authorized_hosts =\
                                config["https_proxy"]["authorized_hosts"].\
                                split(",")
                            for authorized_host in authorized_hosts:
                                if hostname[0].lstrip().rstrip().lower() ==\
                                   authorized_host.lstrip().rstrip().lower():
                                    return True
                        return False
        return True

    @view_config(route_name='wmspoi')
    def wmspoi(self):
        remote_host = os.environ["poi_server"]
        param_wms = ''
        for param in self.request.params:
            if param.lower() != 'id_collection':
                param_wms = param_wms + param + '=' + \
                    self.request.params.get(param, '') + '&'
            else:
                public = ''
                if self.request.params.get('is_public', 'true').lower() == \
                   'true':
                    public = 'public/'
                remote_host = remote_host + "map=/home/mapserv/" + public + \
                    self.request.params.get(param, '') + "/generic.map"
        url = ""
        if remote_host[:-1] == '?':
            url = remote_host + param_wms[:-1]
        else:
            url = remote_host + "&" + param_wms[:-1]
        try:
            f = urllib.request.urlopen(url)
            data = f.read()
        except Exception as e:
            log.exception(e)
            log.error(url)

        headers = {"Content-Type": f.info()['Content-Type']}
        return Response(data, headers=headers)

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
        # or from a connected user or uses the right token
        if not internal_wms.public and self.request.user is None:
            remote_addr = str(self.request.environ.get(
                'HTTP_X_FORWARDED_FOR', self.request.environ['REMOTE_ADDR']))

            if not self._check_token(self.request.params.get('GP_TOKEN')) and \
               not self._check_ip(remote_addr.split(",")[0]):
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

        param_wms = ""
        arcgis_headers = None
        if internal_wms.ogc_server.type == 'arcgis':

            # deactivated code for debug purpose
            if False:
                return Response('this is another hires layer\n',
                                headers={"Content-Type": "text/plain"})

            param_dict = {
                'map_resolution': 'dpi',
                'transparent': 'transparent',
                'bbox': 'bbox',
            }
            for param in self.request.params:
                if param.lower() in param_dict:
                    param_wms = param_wms + param_dict[param.lower()] + "=" + \
                                urllib.parse.quote(
                                self.request.params.get(param, '').encode('utf-8')
                                ) + "&"
                elif param.lower() == 'crs':
                    crs = self.request.params.get(param, '')
                    # strip EPSG: tag from mapserver to make it understandable for arcgis
                    if "EPSG:" in crs:
                        crs = crs[5:]
                    param_wms = param_wms + "imageSR=" + \
                                urllib.parse.quote(crs.encode('utf-8')
                                ) + "&" \
                                + "bboxSR=" + \
                                urllib.parse.quote(crs.encode('utf-8')
                                ) + "&"
                elif param.lower() == 'layers':
                    param_wms = param_wms + param + "=" + \
                                urllib.parse.quote(('show:' +
                                internal_wms.layers).encode('utf-8')
                                ) + "&"
                elif param.lower() == 'format':
                    param_wms = param_wms + param + "=" + \
                                urllib.parse.quote(
                                    self.request.params.get(param, '')
                                    .split('/')[-1].encode('utf-8')
                                ) + "&"
                else:
                    pass

            kw = {k.lower(): v for (k, v) in self.request.params.items()
                  if k.lower() in ('width', 'height')}
            log.info(kw)

            param_wms = param_wms + "size=" + \
                        urllib.parse.quote(
                            (kw.get('width', '')
                             + ','
                             + kw.get('height', '')).encode('utf-8')
                        ) + "&f=image&"

            remote_host = internal_wms.rest_url + "/export"
            if internal_wms.use_auth:
                try:
                    log.info('check token')
                    auth_token = self.request.session['auth_token']
                    log.info('token exists')
                    assert datetime.fromtimestamp(float(auth_token['expires'])/1000 - 30) > datetime.now()
                    log.info('token still valid')
                except Exception as e:
                    log.info(e)
                    log.info('token invalid')
                    # renew token if it expires in the next 30s
#                 if datetime.fromtimestamp(float(self.auth_token.get('expires', 0))/1000 - 30) <= datetime.now():
                    config = self.request.registry.settings
                    token_data = {
                        'f': 'json',
                        'username': config["arcgis_token_username"],
                        'password': config["arcgis_token_password"],
                        'referer': 'x',
                        'expiration': 1
                    }
                    encoded_token_data = urllib.parse.urlencode(token_data).encode()
                    token_url = urllib.parse.urljoin(internal_wms.rest_url + '/', 'generateToken')
                    url_request = urllib.request.Request(token_url, data=encoded_token_data)
                    try:
                        log.info(f"Get token from: {url_request.full_url}")
                        rep = urllib.request.urlopen(url_request, timeout=15)
                        auth_token = json.load(rep)
                        if 'error' in auth_token:
                            log.info(f"Failed getting token from: {url_request.full_url} - "
                                     f"server answered {auth_token['error']}")
                            auth_token = {}
                        else:
                            log.info("Success: token valid until "
                                     f"{datetime.fromtimestamp(float(auth_token.get('expires', 0))/1000)}")
                    except Exception as e:
                        log.info(f"Failed getting token from: {url_request.full_url}")
                        auth_token = {}
                        log.exception(e)
                        log.error(url_request)
                        return HTTPBadGateway()
                    self.request.session['auth_token'] = auth_token

                if 'token' in auth_token:
                    arcgis_headers = ('X-Esri-Authorization', 'Bearer ' + auth_token['token'])

        else:
            remote_host = internal_wms.url

        idx_arobase = remote_host.find("@")
        base64user = None
        if idx_arobase > -1:
            idx1 = remote_host.find("://") + 3
            idx2 = remote_host.find(":", idx1)
            remote_user = remote_host[idx1:idx2]
            remote_password = remote_host[idx2 + 1:idx_arobase]
            remote_host = remote_host.replace(
                remote_host[idx1:idx_arobase+1], "")
            base64user = base64.b64encode(
                "%s:%s" % (remote_user, remote_password)).replace("\n", "")

        if param_wms == "":
            for param in self.request.params:
                if param.lower() == "styles" and \
                   remote_host.lower().find("styles") > -1:
                    continue

                if param.lower() != 'layers':
                    param_wms = param_wms + param + "=" + \
                                urllib.parse.quote(
                                    self.request.params.get(param, '').encode('utf-8')
                                ) + "&"
                else:
                    param_wms = param_wms + param + "=" + \
                                urllib.parse.quote(internal_wms.layers.encode('utf-8')) + "&"

        # TODO : Specific action when user is logged in ?
        # Forward authorization to the remote host
        # check sso
        if self.request.user and hasattr(self.request.user, 'ogc_role') and \
           self.request.user.ogc_role is not None and \
           self.request.user.ogc_role != -1:
            param_wms += "roleOGC=%s&" % str(self.request.user.ogc_role)

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
        timeout = 15
        url_request = urllib.request.Request(url)
        if base64user is not None:
            url_request.add_header("Authorization", "Basic %s" % base64user)
        if arcgis_headers is not None:
            url_request.add_header(*arcgis_headers)
        try:
            f = urllib.request.urlopen(url_request, None, timeout)
            data = f.read()
        except:
            try:
                # Retry to get the result
                f = urllib.request.urlopen(url_request, None, timeout)
                data = f.read()
            except Exception as e:
                log.exception(e)
                log.error(url)
                return HTTPBadGateway()

        headers = {"Content-Type": f.info()['Content-Type']}

        return Response(data, headers=headers)

    @view_config(route_name='predefined_wms', renderer='json')
    def predefined_wms(self):
        predefined_wms = DBSession.query(LuxPredefinedWms).all()
        return [{'url': wms.url,
                 'label': wms.label} for wms in predefined_wms]

    @view_config(route_name='https_proxy')
    def proxy(self):

        url = self.request.params.get("url", "")

        if not url.lower().startswith("http://"):
            log.error("This service can only request HTTP protocol")
            return HTTPBadGateway()

        if not self._check_ip_for_httpsproxy(url):
            log.error("Try to access an unathorized network")
            log.error(url)
            return HTTPUnauthorized()

        params_dict = {}
        for key in self.request.params.keys():
            if not (key == "url"):
                params_dict[key] = self.request.params.get(key)
        params = urllib.parse.urlencode(params_dict)
        separator = "?"
        if "?" in url:
            separator = "&"
        url = url + separator + params

        timeout = 15
        try:
            f = urllib.request.urlopen(url, None, timeout)
            data = f.read()
        except:
            try:
                # Retry to get the result
                f = urllib.request.urlopen(url, None, timeout)
                data = f.read()
            except Exception as e:
                log.exception(e)
                log.error(url)
                return HTTPBadGateway()

        headers = {"Content-Type": f.info()['Content-Type']}

        return Response(data, headers=headers)
