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
                "bool": {
                    "filter": {
                        "bool": {
                            "must": [],
                            "should": [],
                            "must_not": [],
                        }
                    },
                    "should": [
                        {
                            "multi_match": {
                                "type": "most_fields",
                                "fields": [
                                    "label^3",
                                    "label.ngram^2",
                                    "label.simplified^2"
                                ],
                                "operator": "and",
                                "query": query
                            }
                        },
                        {
                            "multi_match": {
                                "type": "most_fields",
                                "fields": [
                                    "label.ngram",
                                    "label.simplified"
                                ],
                                "fuzziness": "auto",
                                "operator": "and",
                                "query": query
                            }
                        }
                    ]
                }
            }
        }
        filters = query_body['query']['bool']['filter']['bool']

        filters['must'].append({"type": {"value": "poi"}})

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
            try:
                id = s['object_id']
            except:
                id = o['_id']
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
                feature = Feature(id=id,
                                  geometry=s['ts'],
                                  properties=properties,
                                  bbox=bbox)
                features.append(feature)
        return FeatureCollection(features)

    @view_config(route_name='layersearch', renderer='json')
    def layersearch(self):
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

        query_body = {
            "query": {
                "bool": {
                    "filter": {
                        "bool": {
                            "must": [],
                            "should": [],
                            "must_not": [],
                        }
                    },
                    "must": {
                        "multi_match": {
                            "type": "most_fields",
                            "fields": [
                                "name_translated.simplified^10",
                                "name_translated.ngram^5",
                                "metadata_name.simplified",
                                "metadata_name.ngram",
                                "keywords.simplified",
                                "keywords.ngram",
                                "description.simplified",
                            ],
                            "fuzziness": "auto",
                            "operator": "and",
                            "query": query
                        }
                    },
                }
            }
        }
        filters = query_body['query']['bool']['filter']['bool']

        filters['must'].append({"type": {"value": "layer"}})

        if self.request.user is None:
            filters['must'].append({"term": {"public": True}})
        else:
            role_id = self.request.user.role.id
            filters['should'].append({"term": {"public": True}})
            filters['should'].append({"term": {"role_id": role_id}})

        es = get_elasticsearch(self.request)
        layer_index = get_index(self.request) + '_layers'
        search = es.search(index=layer_index,
                           body=query_body,
                           size=limit*4)
        objs = search['hits']['hits']
        features = []

        layer_ids = []
        for o in objs:
            s = o['_source']
            if s['layer_id'] not in layer_ids:
                feature = {
                    "language": s['language'],
                    "name": s['name'],
                    "layer_id": s['layer_id'],
                }
                features.append(feature)
                layer_ids.append(s['layer_id'])
        return features[:limit]
