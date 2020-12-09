from pyramid.view import view_config
from owslib.wms import WebMapService
from c2cgeoportal_commons.models import DBSession
from c2cgeoportal_commons.models.main import Theme
from c2cgeoportal_geoportal.views.entry import Entry
from c2cgeoportal_geoportal.lib.caching import get_region, invalidate_region
from c2cgeoportal_geoportal.lib.wmstparsing import parse_extent, TimeInformation
from geoportailv3_geoportal.models import LuxLayerInternalWMS
from geoportal.geoportailv3_geoportal.lib.esri_authentication import ESRITokenException
from geoportal.geoportailv3_geoportal.lib.esri_authentication import get_arcgis_token, read_request_with_token
from datetime import datetime
import urllib
import json
import logging
import sys

log = logging.getLogger(__name__)
cache_region = get_region()
invalidate_region()

ESRI_TIME_CONSTANTS = {
    'esriTimeUnitsYears': 'P%dY',
    'esriTimeUnitsMonths': 'P%dM',
    'esriTimeUnitsWeeks': 'P%dW',
    'esriTimeUnitsDays': 'P%dD',
    'esriTimeUnitsHours': 'PT%dH',
    'esriTimeUnitsMinutes': 'PT%dM',
    'esriTimeUnitsSeconds': 'PT%dS'
}


# fake wms object to handle timepositions
class DummyClass:
    def __init__(self):
        self.timepositions = None
        self.defaulttimeposition = None


# override c2cgeoportal Entry class to customize handling of WMS and WMTS time positions and prepare
# the theme tree for ngeo time functions
class LuxThemes(Entry):

    @view_config(route_name="themes", renderer="json")
    def themes(self):
        return super().themes()

    @view_config(route_name='isthemeprivate', renderer='json')
    def is_theme_private(self):
        theme = self.request.params.get('theme', '')

        cnt = DBSession.query(Theme).filter(
            Theme.public == False).filter(
            Theme.name == theme).count()  # noqa

        if cnt == 1:
            return {'name': theme, 'is_private': True}

        return {'name': theme, 'is_private': False}

    def _group(
        self, host_url, path, group, layers, depth=1, min_levels=1,
        catalogue=True, role_id=None, version=1, mixed=True, time=None, dim=None,
        wms_layers=None, layers_name=None, **kwargs
    ):
        g, errors = super()._group(host_url, path, group, layers, depth, min_levels, catalogue,
                                   role_id, version, mixed, time, dim, wms_layers, layers_name, **kwargs)
        if g is not None:
            time_config = g.get('metadata', {}).get('time_config', '')
            if time_config == 'time_group':
                time_layer_info = {}
                time_positions = []
                if time is None:
                    time = TimeInformation()
                for c in g['children']:
                    tc = json.loads(c.get('metadata', {}).get('time_config', '{}'))
                    if tc:
                        time_layer_info[c['id']] = tc
                        time_positions.append(tc['time'])
                for c in g['children']:
                    if c['id'] in time_layer_info:
                        extent = parse_extent(time_positions, time_layer_info[c['id']]['time'])
                        time_layer_info[c['id']]['current_time'] = extent.to_dict()['minDefValue']
                        time_layer_info[c['id']]['layer_name'] = c['layer']
                        time.merge(c, extent, 'value', 'slider')
                for c in g['children']:
                    if c['id'] in time_layer_info:
                        c['metadata']['time_layers'] = {
                            str(v['current_time']): str(v['layer_name'])
                            for k, v in time_layer_info.items()
                        }
                        c["time"] = time.to_dict()
                        c['time']['minDefValue'] = time_layer_info[c['id']]['current_time']
                g["time"] = time.to_dict()
        return g, errors

    def _wms_layers(self, role_id, ogc_server):
        if ogc_server.name == "Internal WMS":
            return self._wms_layers_internal()

        return super()._wms_layers(role_id, ogc_server)

    @cache_region.cache_on_arguments()
    def _wms_layers_internal(self):
        wms = {}
        errors = set()
        for i, layer in enumerate(DBSession.query(LuxLayerInternalWMS)):
            if layer.time_mode != 'disabled':
                # if esri rest url defined
                if (layer.rest_url is not None and len(layer.rest_url) > 0):
                    query_params = {'f': 'pjson'}
                    if layer.use_auth:
                        auth_token = get_arcgis_token(self.request, log)
                        if 'token' in auth_token:
                            query_params["token"] = auth_token['token']
                    full_url = layer.rest_url + '?' + urllib.parse.urlencode(query_params)
                    try:
                        url_request = urllib.request.Request(full_url)
                        result = read_request_with_token(url_request, self.request, log)
                        content = result.data
                    except ESRITokenException as e:
                        raise e
                    except Exception as e:
                        log.exception(e)
                        log.error(full_url)
                        return []
                    data = json.loads(content)

                    for sublayer in layer.layers.split(","):
                        dc = DummyClass()
                        if "timeInfo" in data:
                            ti = data["timeInfo"]
                            start = datetime.fromtimestamp(ti['timeExtent'][0]/1000)
                            end = datetime.fromtimestamp(ti['timeExtent'][1]/1000)
                            if ti['defaultTimeIntervalUnits'] in ESRI_TIME_CONSTANTS:
                                dc.timepositions = ['%s/%s/%s'
                                                    % (start.isoformat(),
                                                       end.isoformat(),
                                                       ESRI_TIME_CONSTANTS[ti['defaultTimeIntervalUnits']]
                                                       % ti['defaultTimeInterval'])]

                        wms[layer.name + '__' + sublayer] = dc

                # if no esri rest url defined => standard WMS server
                else:
                    for sublayer in layer.layers.split(","):
                        try:
                            wms[layer.name + '__' + sublayer] = WebMapService(layer.url)[sublayer]
                        except Exception as e:
                            errors.add('Error in lux internal WMS layers: ' + str(e))
        return wms, [], set()

    @staticmethod
    def _merge_time(time, l, layer, wms, wms_layers):
        if isinstance(layer, LuxLayerInternalWMS):
            errors = set()
            for ll in layer.layers.split(','):
                try:
                    wms_obj = wms[layer.name + '__' + ll]
                    if wms_obj.timepositions:
                        extent = parse_extent(
                            wms_obj.timepositions,
                            wms_obj.defaulttimeposition
                        )
                        time.merge(l, extent, layer.time_mode, layer.time_widget)
                except Exception as e:
                    errors.add(
                        "Error while handling time for layer '{0!s}': {1!s}"
                        .format(layer.name, sys.exc_info()[1])
                    )
            return set()
        else:
            return super(LuxThemes, LuxThemes)._merge_time(time, l, layer, wms, wms_layers)
