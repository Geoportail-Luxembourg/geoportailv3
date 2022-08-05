from pyramid.view import view_config
from owslib.wms import WebMapService
from c2cgeoportal_commons.models import DBSession
from c2cgeoportal_commons.models.main import Theme as ThemeModel
from c2cgeoportal_geoportal.views.theme import Theme
from c2cgeoportal_geoportal.lib.caching import get_region, invalidate_region
from c2cgeoportal_geoportal.lib.wmstparsing import parse_extent, TimeInformation
from c2cgeoportal_commons import models
from geoportailv3_geoportal.models import LuxLayerInternalWMS
from geoportailv3_geoportal.lib.esri_authentication import ESRITokenException
from geoportailv3_geoportal.lib.esri_authentication import get_arcgis_token, read_request_with_token
from datetime import datetime
import urllib
import json
import sys

import logging

log = logging.getLogger(__name__)
cache_region = get_region("std")
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


# override c2cgeoportal Theme class to customize handling of WMS and WMTS time positions and prepare
# the theme tree for ngeo time functions
class LuxThemes(Theme):

    @view_config(route_name="themes", renderer="json")
    def themes(self):
        return super().themes()

    @view_config(route_name='isthemeprivate', renderer='json')
    def is_theme_private(self):
        theme = self.request.params.get('theme', '')

        cnt = DBSession.query(ThemeModel).filter(
            ThemeModel.public == False).filter(
            ThemeModel.name == theme).count()  # noqa

        if cnt == 1:
            return {'name': theme, 'is_private': True}

        return {'name': theme, 'is_private': False}

    def _wms_layers(self, ogc_server):
        if ogc_server.name == "Internal WMS":
            return self._wms_layers_internal()

        return super()._wms_layers(ogc_server)

    def _layer(self, layer, time_=None, dim=None, mixed=True):
        layer_theme, l_errors = super()._layer(layer, time_, dim, mixed)
        time_links = {}
        if layer_theme is not None:
            tc = json.loads(layer_theme.get('metadata', {}).get('time_config', '{}'))
            time_links = tc.get("time_links", {})
        if time_links:
            if time_ is None:
                time = TimeInformation()
            else:
                time = time_
            # accepted date formats are "year" or "year-month" or "year-month-day"
            time_positions = list(time_links.keys())
            # extract finest resolution from dates as this is not done by default in parse_extent
            resolutions = set(parse_extent([date], date).resolution for date in time_positions)
            resolution = 'day' if 'day' in resolutions else 'month' if 'month' in resolutions else 'year'
            time_layer_info = {}
            for date, layer_name in time_links.items():
                extent = parse_extent(time_positions, date)
                # override resolution if different date formats are given
                extent.resolution = resolution
                time_layer_info[layer_name] = {'current_time': extent.to_dict()['minDefValue']}
                time.merge(layer_theme, extent, 'value', 'slider')

            layer_theme['metadata']['time_layers'] = {
                str(v['current_time']): str(k)
                for k, v in time_layer_info.items()
            }
            layer_theme["time"] = time.to_dict()
            layer_theme['time']['minDefValue'] = time_layer_info[layer_theme['name']]['current_time']
        return layer_theme, l_errors

    @cache_region.cache_on_arguments()
    def _wms_layers_internal(self):
        layers = {}
        errors = set()
        for i, layer in enumerate(DBSession.query(LuxLayerInternalWMS)):
            if layer.time_mode != 'disabled' and layer.rest_url is not None and len(layer.rest_url) > 0:
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
                    layer_dict = {
                        "info": {
                            "name": layer.name + '__' + sublayer,
                        },
                        "children": []
                    }
                    if "timeInfo" in data:
                        ti = data["timeInfo"]
                        start = datetime.fromtimestamp(ti['timeExtent'][0]/1000)
                        end = datetime.fromtimestamp(ti['timeExtent'][1]/1000)
                        if ti['defaultTimeIntervalUnits'] in ESRI_TIME_CONSTANTS:
                            layer_dict['timepositions'] = ['%s/%s/%s'
                                                           % (start.isoformat(),
                                                              end.isoformat(),
                                                              ESRI_TIME_CONSTANTS[ti['defaultTimeIntervalUnits']]
                                                              % ti['defaultTimeInterval'])]

                    layers[layer.name + '__' + sublayer] = layer_dict

            # if no esri time layer defined => standard WMS server
            else:
                for sublayer in layer.layers.split(","):
                    wms_info = {
                        "info": {
                            "name": layer.name + '__' + sublayer,
                        },
                        "children": []
                    }
                    if layer.time_mode != 'disabled':
                        try:
                            wms_info = WebMapService(layer.url)[sublayer].__dict__
                            time_configs = layer.get_metadatas('time_config')
                            if len(time_configs) == 1:
                                try:
                                    override_time_config = json.loads(time_configs[0].value).get("time_override")
                                    wms_info.update(override_time_config)
                                except:
                                    pass
                            wms_info['children'] = []
                            wms_info['info'] = {}
                        except Exception as e:
                            # wms_info = {}
                            log.info('failed: ' + layer.name + sublayer)
                            errors.add('Error in lux internal WMS layers: ' + str(e))
                    layers[layer.name + '__' + sublayer] = wms_info

        return {"layers": layers}, set()

    @staticmethod
    def _merge_time(time_, layer_theme, layer, wms):
        def _fix_duration(wms):
            for k, v in wms['layers'].items():
                if isinstance(v.get('timepositions'), list):
                    if wms['layers'][k]['timepositions'][0][-1] == '0':
                        wms['layers'][k]['timepositions'][0] = wms['layers'][k]['timepositions'][0][:-1] + 'PT600S'

        try:
            _fix_duration(wms)
        except:
            pass  # no time info to be fixed
        if isinstance(layer, LuxLayerInternalWMS):
            errors = set()
            for ll in layer.layers.split(','):
                try:
                    wms_obj = wms["layers"][layer.name + '__' + ll]
                    if wms_obj.get("timepositions", None):
                        extent = parse_extent(
                            wms_obj["timepositions"],
                            wms_obj.get("defaulttimeposition", None)
                        )
                        time_.merge(layer_theme, extent, layer.time_mode, layer.time_widget)
                except Exception as e:
                    errors.add(
                        "Error while handling time for layer '{0!s}': {1!s}"
                        .format(layer.name, sys.exc_info()[1])
                    )
            return set()
        else:
            return super(LuxThemes, LuxThemes)._merge_time(time_, layer_theme, layer, wms)

    def _fill_wms(self, layer_theme, layer, errors, mixed):
        if isinstance(layer, LuxLayerInternalWMS):
            layer_theme["imageType"] = layer.ogc_server.image_type
            if layer.style:  # pragma: no cover
                layer_theme["style"] = layer.style

            wms, wms_errors = self._wms_layers(layer.ogc_server)
            errors |= wms_errors
            if wms is None:
                return
            layer_theme["childLayers"] = []
            for layer_name in layer.layers.split(","):
                full_layer_name = layer.name + '__' + layer_name
                if full_layer_name in wms["layers"]:
                    wms_layer_obj = wms["layers"][full_layer_name]
                    if not wms_layer_obj["children"]:
                        layer_theme["childLayers"].append(wms["layers"][full_layer_name]["info"])
                    else:
                        for child_layer in wms_layer_obj["children"]:
                            layer_theme["childLayers"].append(wms["layers"][child_layer]["info"])
                else:
                    errors.add(
                        "The sublayer '{}' of internal layer {} is not defined in WMS capabilities".format(
                            layer_name, layer.name
                        )
                    )
        else:
            return super()._fill_wms(layer_theme, layer, errors, mixed)

    @view_config(route_name="lux_themes", renderer="json")
    def lux_themes(self):
        themes = super().themes()
        sets = self.request.params.get("set", "all")
        if sets in ("all", "3d"):
            themes["lux_3d"] = self.get_lux_3d_layers()
        return themes

    def get_lux_3d_layers(self):
        lux_3d_layers = {}
        interface = self.request.params.get("interface", "desktop")
        layers = self._layers(interface)
        try:
            terrain_layer = (models.DBSession.query(models.main.Layer)
                             .filter(models.main.Metadata.name == "ol3d_type",
                                     models.main.Metadata.value == "terrain",
                                     models.main.Layer.id == models.main.Metadata.item_id)).one()
            if terrain_layer.name in layers:
                if terrain_layer.url[-1] == "/":
                    lux_3d_layers["terrain_url"] = terrain_layer.url + terrain_layer.layer
                else:
                    lux_3d_layers["terrain_url"] = terrain_layer.url + "/" + terrain_layer.layer
        except:
            pass
        return lux_3d_layers

    @staticmethod
    def is_mixed(_):
        return True
