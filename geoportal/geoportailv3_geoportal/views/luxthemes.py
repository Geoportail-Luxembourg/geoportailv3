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
from sqlalchemy.orm import selectinload
from datetime import datetime
from copy import deepcopy
from time import perf_counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
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


@cache_region.cache_on_arguments()
def _build_standard_wms_layers():
    """
    Build WMS layer data for all non-ArcGIS internal layers.
    Module-level function (no `self`) so cache_on_arguments works properly
    across requests. Returns plain Python dicts — no ORM objects.
    """
    layers = {}
    query = DBSession.query(LuxLayerInternalWMS).options(
        selectinload('metadatas'),
    )
    for layer in query:
        # ArcGIS layers are handled per-request in _wms_layers_internal()
        if layer.time_mode != 'disabled' and layer.rest_url is not None and len(layer.rest_url) > 0:
            continue

        sublayer = None
        for sublayer in (layer.layers or '').split(','):
            wms_info = {
                'info': {'name': layer.name + '__' + sublayer},
                'children': []
            }
            if layer.time_mode != 'disabled':
                try:
                    wms_info = WebMapService(layer.url)[sublayer].__dict__
                    wms_info['children'] = []
                    wms_info['info'] = {}
                except Exception:
                    log.info('failed: %s%s', layer.name, sublayer)
            layers[layer.name + '__' + sublayer] = wms_info

        if sublayer is not None:
            time_configs = layer.get_metadatas('time_config')
            if len(time_configs) == 1:
                try:
                    override_time_config = json.loads(time_configs[0].value).get('time_override')
                    if override_time_config:
                        layers[layer.name + '__' + sublayer].update(override_time_config)
                except Exception:
                    pass

    return layers


# override c2cgeoportal Theme class to customize handling of WMS and WMTS time positions and prepare
# the theme tree for ngeo time functions
class LuxThemes(Theme):
    def _connected_cache_key(self):
        user = getattr(self.request, "user", None)
        user_key = getattr(user, "login", None) or getattr(user, "id", None) or "authenticated"
        role_ids = tuple(sorted(role.id for role in getattr(user, "roles", [])))
        params_key = tuple(sorted((str(key), str(value)) for key, value in self.request.params.items()))
        host = self.request.headers.get("Host")
        return user_key, role_ids, params_key, host

    def _build_themes(self):
        return super().themes()

    def _build_lux_themes(self):
        themes = self._build_themes()
        sets = self.request.params.get("set", "all")
        if sets in ("all", "3d"):
            lux_3d_start = perf_counter()
            themes["lux_3d"] = self.get_lux_3d_layers()
            self._timing_add("lux_themes_3d", perf_counter() - lux_3d_start)
        return themes

    def _timings(self):
        timings = getattr(self.request, "_lux_theme_timings", None)
        if timings is None:
            timings = {}
            setattr(self.request, "_lux_theme_timings", timings)
        return timings

    def _timing_add(self, key, seconds):
        timings = self._timings()
        timings[key] = timings.get(key, 0.0) + seconds

    def _log_timing_summary(self, endpoint):
        timings = self._timings()
        if not timings:
            return
        summary = ", ".join(
            "{}={:.3f}ms".format(k, v * 1000.0)
            for k, v in sorted(timings.items())
        )
        log.info("themes timing (%s): %s", endpoint, summary)

    def _internal_layers(self):
        cache = getattr(self.request, "_lux_internal_layers", None)
        if cache is not None:
            return cache

        start = perf_counter()
        query = DBSession.query(LuxLayerInternalWMS).options(
            selectinload('ogc_server'),
            selectinload('metadatas')
        )
        cache = list(query)
        setattr(self.request, "_lux_internal_layers", cache)
        self._timing_add("internal_layers_load", perf_counter() - start)
        return cache

    def _internal_layers_prefetch(self):
        cache = getattr(self.request, "_lux_internal_layers_prefetch", None)
        if cache is not None:
            return cache

        start = perf_counter()
        by_id = {}
        by_name = {}
        for layer in self._internal_layers():
            by_id[layer.id] = layer
            by_name[layer.name] = layer
        cache = {
            "by_id": by_id,
            "by_name": by_name,
        }
        setattr(self.request, "_lux_internal_layers_prefetch", cache)
        self._timing_add("internal_layers_prefetch", perf_counter() - start)
        return cache

    def _get_ancestor_theme_names(self, item):
        names = set()
        for rel in item.parents_relation:
            parent = rel.treegroup
            if isinstance(parent, ThemeModel):
                names.add(parent.name.lower())
            else:
                names |= self._get_ancestor_theme_names(parent)
        return names

    def _is_public_wms_override_excluded(self, layer):
        cache = getattr(self.request, "_lux_public_wms_override_excluded_cache", None)
        if cache is None:
            cache = {}
            setattr(self.request, "_lux_public_wms_override_excluded_cache", cache)

        cache_key = layer.id if getattr(layer, "id", None) is not None else layer.name
        if cache_key in cache:
            return cache[cache_key]

        start = perf_counter()
        excluded = {g.strip().lower() for g in os.environ.get("PUBLIC_WMS_GROUPS_TO_EXCLUDE", "").split(",") if g.strip()}
        result = bool(excluded and self._get_ancestor_theme_names(layer) & excluded)
        cache[cache_key] = result
        self._timing_add("is_public_wms_override_excluded", perf_counter() - start)
        return result

    async def _wms_getcap(self, ogc_server, preload=False):
        errors = set()
        if preload:
            return None, set()

        return {"layers": []}, set()

    @view_config(route_name="themes", renderer="json")
    def themes(self):
        start = perf_counter()
        try:
            if self.request.user is None:
                return self._build_themes()

            user_key, role_ids, params_key, host = self._connected_cache_key()

            @cache_region.cache_on_arguments()
            def get_theme_authenticated(user_key, role_ids, params_key, host):
                del user_key, role_ids, params_key, host
                return self._build_themes()

            return deepcopy(get_theme_authenticated(user_key, role_ids, params_key, host))
        finally:
            self._timing_add("themes_total", perf_counter() - start)
            self._log_timing_summary("themes")

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
        cache = getattr(self.request, "_lux_wms_layers_cache", None)
        if cache is None:
            cache = {}
            setattr(self.request, "_lux_wms_layers_cache", cache)

        cache_key = getattr(ogc_server, "id", None) or ogc_server.name
        if cache_key in cache:
            return cache[cache_key]

        if ogc_server.name == "Internal WMS":
            result = self._wms_layers_internal()
            cache[cache_key] = result
            return result

        result = super()._wms_layers(ogc_server)
        cache[cache_key] = result
        return result

    def _layer(self, layer, time_=None, dim=None, mixed=True):
        start = perf_counter()
        layer_theme, l_errors = super()._layer(layer, time_, dim, mixed)
        time_links = {}
        if layer_theme is not None:
            tc = json.loads(layer_theme.get('metadata', {}).get('time_config', '{}'))
            time_links = tc.get("time_links", {})
            default_time = tc.get("default_time")
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
            default_time_link = time_links.get(default_time, list(time_links.values())[0])
            layer_theme['time']['minDefValue'] = time_layer_info[default_time_link]['current_time']
        self._timing_add("layer_total", perf_counter() - start)
        return layer_theme, l_errors

    def _wms_layers_internal(self):
        total_start = perf_counter()
        errors = set()

        # Non-ArcGIS layers: loaded from module-level cross-request cache.
        # _build_standard_wms_layers() has no `self` so cache_on_arguments
        # produces a stable key that survives across requests.
        cache_start = perf_counter()
        layers = dict(_build_standard_wms_layers())  # shallow copy — ArcGIS entries added below
        self._timing_add('wms_layers_internal_standard_cache', perf_counter() - cache_start)

        # ArcGIS layers require per-request auth; fetch them in parallel.
        arcgis_layers = [
            layer for layer in self._internal_layers()
            if layer.time_mode != 'disabled' and layer.rest_url is not None and len(layer.rest_url) > 0
        ]

        if arcgis_layers:
            arcgis_start = perf_counter()

            def _fetch_one_arcgis(layer):
                query_params = {'f': 'pjson'}
                use_auth = layer.use_auth
                if use_auth:
                    auth_token = get_arcgis_token(self.request, log, service_url=layer.rest_url)
                    if 'token' in auth_token:
                        query_params['token'] = auth_token['token']
                full_url = layer.rest_url + '?' + urllib.parse.urlencode(query_params)
                url_request = urllib.request.Request(full_url)
                result = read_request_with_token(url_request, self.request, log, renew_token=use_auth)
                return json.loads(result.data)

            with ThreadPoolExecutor(max_workers=min(len(arcgis_layers), 5)) as executor:
                futures = {executor.submit(_fetch_one_arcgis, lyr): lyr for lyr in arcgis_layers}
                for future in as_completed(futures):
                    layer = futures[future]
                    try:
                        data = future.result()
                    except Exception as e:
                        log.exception(e)
                        log.error(layer.rest_url)
                        # cannot set error message because one error message in an ogc_server
                        # makes all layers fail
                        # https://github.com/camptocamp/c2cgeoportal/commit/d5624ffb03e89e6252184b46d02c253d4c0a1035
                        continue  # do not add layer
                    for sublayer in layer.layers.split(','):
                        layer_dict = {
                            'info': {'name': layer.name + '__' + sublayer},
                            'children': []
                        }
                        if 'timeInfo' in data:
                            ti = data['timeInfo']
                            t_start = datetime.fromtimestamp(ti['timeExtent'][0] / 1000)
                            t_end = datetime.fromtimestamp(ti['timeExtent'][1] / 1000)
                            if 'defaultTimeIntervalUnits' in ti and ti['defaultTimeIntervalUnits'] in ESRI_TIME_CONSTANTS:
                                layer_dict['timepositions'] = ['%s/%s/%s' % (
                                    t_start.isoformat(), t_end.isoformat(),
                                    ESRI_TIME_CONSTANTS[ti['defaultTimeIntervalUnits']] % ti['defaultTimeInterval']
                                )]
                            elif 'timeIntervalUnits' in ti and ti['timeIntervalUnits'] in ESRI_TIME_CONSTANTS:
                                layer_dict['timepositions'] = ['%s/%s/%s' % (
                                    t_start.isoformat(), t_end.isoformat(),
                                    ESRI_TIME_CONSTANTS[ti['timeIntervalUnits']] % ti['timeInterval']
                                )]
                        layers[layer.name + '__' + sublayer] = layer_dict

            self._timing_add('wms_layers_internal_arcgis_parallel', perf_counter() - arcgis_start)

        self._timing_add('wms_layers_internal_total', perf_counter() - total_start)
        return {'layers': layers}, errors

    @staticmethod
    def _merge_time(time_, layer_theme, layer, wms):
        if isinstance(layer, LuxLayerInternalWMS):
            errors = set()
            for ll in layer.layers.split(','):
                try:
                    wms_obj = wms["layers"][layer.name + '__' + ll]
                    timepositions = wms_obj.get("timepositions", None)
                    if timepositions:
                        if isinstance(timepositions, list):
                            if timepositions[0][-1] == '0':
                                timepositions[0] = (
                                    timepositions[0][:-1]
                                    + wms_obj.get("default_timestep", 'PT600S')
                                )
                            if len(timepositions) == 1:
                                tp = timepositions[0].split("/")
                                if len(tp) == 3:
                                    tp[2] = wms_obj.get("default_timestep", tp[2])
                                    timepositions[0] = "/".join(tp)
                                    wms_obj["timepositions"] = timepositions
                        extent = parse_extent(
                            wms_obj["timepositions"],
                            wms_obj.get("defaulttimeposition", None)
                        )
                        time_.merge(layer_theme, extent, layer.time_mode, layer.time_widget)
                        if wms_obj.get("override_end_date") == "now":
                            extent.end = None
                            layer_theme["time"]["maxValue"] = None
                        if wms_obj.get("time_mode") == "interval":
                            layer_theme["time"]["translate_interval"] = True
                except Exception as e:
                    errors.add(
                        "Error while handling time for layer '{0!s}': {1!s}"
                        .format(layer.name, sys.exc_info()[1])
                    )
            return set()
        else:
            return super(LuxThemes, LuxThemes)._merge_time(time_, layer_theme, layer, wms)

    def _fill_wms(self, layer_theme, layer, errors, mixed):
        fill_start = perf_counter()
        if isinstance(layer, LuxLayerInternalWMS):
            prefetched = self._internal_layers_prefetch()
            prefetched_layer = prefetched["by_id"].get(layer.id)
            if prefetched_layer is None:
                prefetched_layer = prefetched["by_name"].get(layer.name)
                if prefetched_layer is None:
                    prefetched_layer = layer

            layer_theme["imageType"] = prefetched_layer.ogc_server.image_type
            if prefetched_layer.style:  # pragma: no cover
                layer_theme["style"] = prefetched_layer.style
            public_wms_url = os.environ.get("PUBLIC_WMS_URL")
            if prefetched_layer.public and public_wms_url and not self._is_public_wms_override_excluded(prefetched_layer):
                layer_theme["url"] = public_wms_url
                layer_theme["layers"] = layer_theme["id"]
            wms, wms_errors = self._wms_layers(prefetched_layer.ogc_server)
            errors |= wms_errors
            if wms is None:
                return
            layer_theme["childLayers"] = []
            for layer_name in prefetched_layer.layers.split(",") if prefetched_layer.layers is not None else []:
                full_layer_name = prefetched_layer.name + '__' + layer_name
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
                            layer_name, prefetched_layer.name
                        )
                    )
            self._timing_add("fill_wms_internal", perf_counter() - fill_start)
        else:
            wms, wms_errors = self._wms_layers(layer.ogc_server)
            errors |= wms_errors
            if wms is None:
                self._timing_add("fill_wms_external", perf_counter() - fill_start)
                return
            layer_theme["imageType"] = layer.ogc_server.image_type
            if layer.style:  # pragma: no cover
                layer_theme["style"] = layer.style

            layer_theme["childLayers"] = []
            if mixed:
                layer_theme["ogcServer"] = layer.ogc_server.name
            self._timing_add("fill_wms_external", perf_counter() - fill_start)

    @view_config(route_name="lux_themes", renderer="json")
    def lux_themes(self):
        start = perf_counter()
        try:
            parent_start = perf_counter()
            if self.request.user is None:
                themes = self._build_lux_themes()
            else:
                user_key, role_ids, params_key, host = self._connected_cache_key()

                @cache_region.cache_on_arguments()
                def get_lux_theme_authenticated(user_key, role_ids, params_key, host):
                    del user_key, role_ids, params_key, host
                    return self._build_lux_themes()

                themes = deepcopy(get_lux_theme_authenticated(user_key, role_ids, params_key, host))
            self._timing_add("lux_themes_super", perf_counter() - parent_start)
            return themes
        finally:
            self._timing_add("lux_themes_total", perf_counter() - start)
            self._log_timing_summary("lux_themes")

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
