# -*- coding: utf-8 -*-
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.view import view_config
from geojson import Feature, FeatureCollection
from shapely.geometry import shape, mapping
from geoportailv3.lib.search import get_es, get_index

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

        terms = 'label:%s' % query
        es = get_es(self.request)
        search = es.search(index=get_index(self.request), q=terms, size=limit)
        objs = search['hits']['hits']
        features = []

        for o in objs:
            s = o['_source']
            if s['ts'] is not None:
                properties = {
                    "label": s['label'],
                    "layer_name": s['layer_name'],
                }
                geom = shape(s['ts'])
                bbox = geom.bounds
                feature = Feature(id=s['object_id'],
                                  geometry=mapping(geom),
                                  properties=properties,
                                  bbox=bbox)
                features.append(feature)

        # TODO: add callback function if provided in self.request, else return geojson
        return FeatureCollection(features)
