# -*- coding: utf-8 -*-
import re
import json
from pyramid.httpexceptions import HTTPBadRequest, HTTPInternalServerError
from pyramid.view import view_config
from geojson import Feature, FeatureCollection
from shapely.geometry import shape
from pyramid_es import get_client

class FullTextSearchView(object):

    def __init__(self, request):
        self.request = request
        if request.user:
            request.response.cache_control.private = True
        request.response.cache_control.max_age = \
            request.registry.settings["default_max_age"]
        self.settings = request.registry.settings.get('fulltextsearch', {})

    @view_config(route_name='fulltextsearch', renderer='geojson')
    def fulltextsearch(self):
        if 'query' not in self.request.params:
            return HTTPBadRequest(detail='no query')
        query = self.request.params.get('query')

        maxlimit = self.settings.get('maxlimit', 200)

        try:
            limit = int(self.request.params.get(
                'limit',
                self.settings.get('defaultlimit', 30)))
        except ValueError:
            return HTTPBadRequest(detail='limit value is incorrect')
        if limit > maxlimit:
            limit = maxlimit

        try:
            partitionlimit = int(self.request.params.get('partitionlimit', 0))
        except ValueError:
            return HTTPBadRequest(detail='partitionlimit value is incorrect')
        if partitionlimit > maxlimit:
            partitionlimit = maxlimit

        client = get_client(self.request)
        query = client.query(q=query)
        objs = query.execute(size=limit)

        features = []
        for o in objs:
            if o.ts is not None:
                properties = {
                    "label": o.label,
                    "layer_name": o.layer_name,
                }
                feature = Feature(id=o.object_id, geometry=json.loads(o.ts), properties=properties)
                features.append(feature)

        # TODO: add callback function if provided in self.request, else return geojson
        return FeatureCollection(features)
