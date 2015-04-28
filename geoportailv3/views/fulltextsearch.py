# -*- coding: utf-8 -*-
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.view import view_config
from geojson import Feature, FeatureCollection
from shapely.geometry import shape
from geoportailv3.lib.search import get_elasticsearch, get_index


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
            layer = self.request.params.get('layer')
        except:
            pass

        query_body = {
            "query": {
                "filtered": {
                    "query": {
                        "multi_match": {
                            "type": "most_fields",
                            "fields": [
                                "label.ngram",
                                "label.exact^2"  # boost exact match
                            ],
                            "fuzziness": 0.7,
                            "operator": "and",
                            "query": query
                        }
                    },
                    "filter": {
                        "bool": {
                            "must": [],
                            "should": [],
                            "must_not": [],
                        }
                    }
                }
            }
        }
        filters = query_body['query']['filtered']['filter']['bool']

        if layer:
            filters['must'].append({"term": {"layer_name": layer}})
        if self.request.user is None:
            filters['must'].append({"term": {"public": True}})
        else:
            role_id = self.request.user.role.id
            filters['should'].append({"term": {"public": True}})
            filters['should'].append({"term": {"role_id": role_id}})

        es = get_elasticsearch(self.request)
        search = es.search(index=get_index(self.request),
                           body=query_body,
                           size=limit)
        objs = search['hits']['hits']
        features = []

        for o in objs:
            s = o['_source']
            if s['ts'] is not None:
                properties = {
                    "label": s['label'],
                    "layer_name": s['layer_name'],
                }
                bbox = {}
                if not s['ts']['type'] == 'Point':
                    try:
                        geom = shape(s['ts'])
                        bbox = geom.bounds
                    except:
                        pass
                feature = Feature(id=s['object_id'],
                                  geometry=s['ts'],
                                  properties=properties,
                                  bbox=bbox)
                features.append(feature)
        return FeatureCollection(features)
