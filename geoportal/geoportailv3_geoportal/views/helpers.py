# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest
from c2cgeoportal_geoportal.lib.caching import set_common_headers, NO_CACHE
from geojson import loads as geojson_loads
import geojson
import pyproj
import logging
from functools import partial
from shapely.ops import transform
from shapely.geometry import mapping, shape
log = logging.getLogger(__name__)


class Helpers(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='convert_geojson', renderer='json')
    def convert_geojson(self):
        p_json = None
        if 'json' in self.request.POST:
            p_json = self.request.POST['json']
        if p_json is None:
            return HTTPBadRequest("json is required")
        from_srs = 'epsg:4326'
        if 'from_srs' in self.request.POST:
            from_srs = self.request.POST['from_srs']
        to_srs = 'epsg:2169'
        if 'to_srs' in self.request.POST:
            to_srs = self.request.POST['to_srs']

        json = geojson_loads(p_json)

        for feature in json['features']:
            geometry = feature['geometry']
            if geometry is not None:
                geometry = self._transform(geometry, from_srs, to_srs)
                feature['geometry'] = mapping(geometry)
        return json

    def _transform(self, geometry, source, dest):
        project = partial(
            pyproj.transform,
            pyproj.Proj(init=source), # source coordinate system
            pyproj.Proj(init=dest)) # destination coordinate system

        return transform(project, shape(geometry))  # apply projection