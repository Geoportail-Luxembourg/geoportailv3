from typing import Optional

from ipaddr import IPv4Network
from pyramid.view import view_config
from geoportailv3_geoportal.models import LuxLayerInternalWMS, LuxPredefinedWms
from c2cgeoportal_commons.models import DBSession
from c2cgeoportal_commons.models.main import RestrictionArea, Role, Layer
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

from geoportailv3_geoportal.lib.esri_authentication import ESRITokenException
from geoportailv3_geoportal.lib.esri_authentication import get_arcgis_token, read_request_with_token

log = logging.getLogger(__name__)


class Wms:
    def __init__(self, request):
        self.request = request

    def _check_token(self, token: str) -> bool:
        config = self.request.registry.settings
        return config["authtkt_secret"] == token

    def _check_ip(self, client_ip: str) -> bool:
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

    def _check_ip_for_httpsproxy(self, url: str) -> bool:
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

    def _process_arcgis_server(self, internal_wms: LuxLayerInternalWMS) -> str:
        query_params = {}
        param_dict = {
            'map_resolution': 'dpi',
            'transparent': 'transparent',
            'bbox': 'bbox',
        }
        for param, value in self.request.params.items():
            lparam = param.lower()
            if lparam in param_dict:
                query_params[param_dict[lparam]] = value
            # shall accept both v1.1.1 (srs) and v1.3.0 (crs) format
            elif lparam in ['crs', 'srs']:
                if "EPSG:" in value:
                    crs = value[5:]
                else:
                    crs = value
                query_params["imageSR"] = crs
                query_params["bboxSR"] = crs
            elif lparam == 'layers':
                query_params["layers"] = 'show:' + internal_wms.layers
            elif lparam == 'format':
                query_params["format"] = value.split('/')[-1]
            else:
                pass

        kw = {k.lower(): v for (k, v) in self.request.params.items()
              if k.lower() in ('width', 'height')}

        query_params["size"] = kw.get('width', '') + ',' + kw.get('height', '')

        if internal_wms.use_auth:
            auth_token = get_arcgis_token(self.request, log)
            if 'token' in auth_token:
                query_params["token"] = auth_token['token']

        query_params["f"] = "image"

        return query_params

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
        if remote_host[-1] == '?':
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
        request = self.request.params.get('REQUEST', self.request.params.get('request', ''))
        if request.lower() == 'getcapabilities':
            headers = {"Content-Type": "text/xml"}
            capabilities = """<?xml version="1.0"?>
            <WMT_MS_Capabilities version="1.1.1"></WMT_MS_Capabilities>"""

            return Response(capabilities, headers=headers)

        layers = self.request.params.get('LAYERS', self.request.params.get('layers', ''))
        layers = layers.split(',')
        if len(layers) == 0:
            return HTTPBadRequest()
        if len(layers) > 1:
            log.warning(f"Only the first layer can be requested. Found {len(layers)}. "
                        "Only the first one will be processed.")
        # TODO: Multiple layers could be requested with a single request
        # Today the first layer wins.
        layer = layers[0]

        internal_wms: Optional[LuxLayerInternalWMS] = DBSession.query(LuxLayerInternalWMS).filter(
            LuxLayerInternalWMS.layer == layer).first()
        if internal_wms is None:
            return HTTPNotFound()


        if request.lower() == 'getfeatureinfo':
            from geoportailv3_geoportal.views.getfeatureinfo import Getfeatureinfo
            from shapely.geometry import asShape, box, shape
            import json
            gfi = Getfeatureinfo(self.request)
            url = "https://map.geoportail.lu/getfeatureinfo?"
            params_dict = {'tooltip':1}
            for key in self.request.params.keys():
                if key.lower() == 'layers':
                    params_dict['layers'] = internal_wms.id
                elif key.lower() == 'bbox':
                    bbox = self.request.params.get(key)
                    bbox4326 = bbox.split(',')
                    the_box = box(float(bbox4326[0]), float(bbox4326[1]), float(bbox4326[2]), float(bbox4326[3]))
                    crs = self.request.params.get('CRS', self.request.params.get('crs', self.request.params.get('srs', self.request.params.get('SRS', 'EPSG:4326'))))
                    box2169 = shape(gfi.transform_(the_box, crs, 'EPSG:2169')).bounds

                    box = ""+str(box2169[0])+","+str(box2169[1])+","+str(box2169[2])+","+str(box2169[3])
                    width = self.request.params.get('WIDTH', self.request.params.get('width', '0'))
                    height = self.request.params.get('HEIGHT', self.request.params.get('height', '0'))
                    x = float(self.request.params.get('x', self.request.params.get('X', self.request.params.get('i', self.request.params.get('I', 0)))))
                    y = float(self.request.params.get('y', self.request.params.get('Y', self.request.params.get('j', self.request.params.get('J', 0)))))
                    res = gfi.pixels2meter(float(width), float(height), box, "epsg:2169", "epsg:2169", [x,y])
                    xLuref = res[0]
                    yLuref = res[1]
                    box = ""+str(box2169[1]+xLuref-1)+","+str(box2169[0]+yLuref-1)+","+str(box2169[1]+xLuref+1)+","+str(box2169[0]+yLuref+1)
                    params_dict['box1'] = box
                    params_dict['box2'] = box
                    params_dict[key.lower()] = box
                else:
                    params_dict[key.lower()] = self.request.params.get(key)
            params = urllib.parse.urlencode(params_dict)
            separator = "?"
            if "?" in url:
                separator = "&"
            url = url + separator + params
            f = urllib.request.urlopen(url, None, 15)
            data = f.read()
            headers = {"Content-Type": self.request.params.get('INFO_FORMAT', 'text/plain')}
            tooltips = []
            for info in json.loads(data):
                tooltips.append(info['tooltip'])
            return Response("<br>".join(tooltips), headers=headers)


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
            # Check if the layer has a restriction area
            restriction: Optional[RestrictionArea] = DBSession.query(RestrictionArea).filter(
                RestrictionArea.roles.any(
                    Role.id == self.request.user.settings_role.id)).filter(
                RestrictionArea.layers.any(
                    Layer.id == internal_wms.id
                )
                ).first()
            # If not restriction is set then return unauthorized
            if restriction is None or not restriction.readwrite:
                return HTTPUnauthorized()

        query_params = {}
        # arcgis rest api shall be used whenever rest_url is not empty
        if (internal_wms.rest_url is not None and len(internal_wms.rest_url) > 0):
            remote_host = internal_wms.rest_url + "/export"
            query_params = self._process_arcgis_server(internal_wms)
        else:
            remote_host = internal_wms.url
            for param, value in self.request.params.items():
                if param.lower() == "styles" and remote_host.lower().find("styles") > -1:
                    continue

                if param.lower() == 'layers':
                    query_params[param] = internal_wms.layers
                else:
                    query_params[param] = value

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

        # TODO : Specific action when user is logged in ?
        # Forward authorization to the remote host
        # check sso
        if self.request.user and hasattr(self.request.user, 'ogc_role') and \
           self.request.user.ogc_role is not None and \
           self.request.user.ogc_role != -1:
            query_params['roleOGC'] = self.request.user.ogc_role

        url = ""
        t = "transparent=true"
        if remote_host.lower().find(t) > -1 and urllib.parse.urlencode(query_params).lower().find(t) > -1:
            remote_host = remote_host.replace(t, "")

        if remote_host.find("?") == -1:
            remote_host = remote_host + "?"

        separator = ""
        if remote_host[-1] != "?" and remote_host[-1] != "&":
            separator = "&"
        url = remote_host + separator + urllib.parse.urlencode(query_params).replace('+', '%20')
        timeout = 15

        url_request = urllib.request.Request(url)
        if base64user is not None:
            url_request.add_header("Authorization", "Basic %s" % base64user)
        try:
            data, content_type = read_request_with_token(url_request, self.request, log)
        except ESRITokenException as e:
            raise HTTPBadGateway(e)
        # retry for other errors not related to tokens
        except:
            try:
                DBSession.rollback()
                # Retry to get the result
                f = urllib.request.urlopen(url_request, None, timeout)
                data = f.read()
                content_type = f.info()['Content-Type']
            except Exception as e:
                log.exception(e)
                log.error(url)
                return HTTPBadGateway()

        headers = {"Content-Type": content_type}

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
