# -*- coding: utf-8 -*-
from pyramid.httpexceptions import HTTPBadRequest, HTTPBadGateway, HTTPInternalServerError
from pyramid.view import view_config
import fiona
from geojson import Feature, FeatureCollection
from shapely.geometry import shape
from geoportailv3_geoportal.lib.search import get_elasticsearch, get_index, get_host
import os
import json
import geojson
import urllib

from geoportailv3_geoportal.lib.esri_authentication import ESRITokenException
from geoportailv3_geoportal.lib.esri_authentication import get_arcgis_token, read_request_with_token

import logging
log = logging.getLogger(__name__)
geojson.geometry.DEFAULT_PRECISION = 9


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
        fuzziness = int(self.request.params.get('fuzziness', 1))

        try:
            limit = int(self.request.params.get(
                'limit',
                self.settings.get('defaultlimit', 30)))
        except ValueError:
            return HTTPBadRequest(detail='limit value is incorrect')
        if limit > maxlimit:
            limit = maxlimit

        if os.environ.get('FAKE_FULLTEXT_SEARCH', None) == '1':
            fake_response = '{"type": "FeatureCollection", "features": [{"geometry": {"type": "Polygon", "coordinates": [[[6.069344907, 49.5609585166], [6.0691568068, 49.654826971], [6.2036803238, 49.6548627478], [6.2036103715, 49.560994175], [6.069344907, 49.5609585166]]]}, "properties": {"layer_name": "Commune", "label": "Luxembourg"}, "type": "Feature", "bbox": [6.0691568068, 49.5609585166, 6.2036803238, 49.6548627478], "id": "3712765"}, {"geometry": {"type": "Polygon", "coordinates": [[[5.9270670114, 50.0512449024], [5.9269772374, 50.0692253411], [5.954912626, 50.0692797917], [5.9549919612, 50.0512993185], [5.9270670114, 50.0512449024]]]}, "properties": {"layer_name": "Localité", "label": "FAKE: Lullange (L\u00ebllgen)"}, "type": "Feature", "bbox": [5.9269772374, 50.0512449024, 5.9549919612, 50.0692797917], "id": "3015351"}, {"geometry": {"type": "Point", "coordinates": [6.0385391523, 49.8992727652]}, "properties": {"layer_name": "editus_poi_292", "label": "FAKE: RFX LU [Kehmen] (Garage)"}, "type": "Feature", "bbox": {}, "id": "3943529"}, {"geometry": {"type": "Polygon", "coordinates": [[[5.8781311725, 49.8994824237], [5.8780236843, 49.9174632643], [5.9058711934, 49.9175293601], [5.9059683315, 49.8995484776], [5.8781311725, 49.8994824237]]]}, "properties": {"layer_name": "Localité", "label": "Lultzhausen (L\u00eblz)"}, "type": "Feature", "bbox": [5.8780236843, 49.8994824237, 5.9059683315, 49.9175293601], "id": "3015352"}, {"geometry": {"type": "Polygon", "coordinates": [[[6.1307043487, 49.6913873587], [6.1306908729, 49.7093690745], [6.1584195338, 49.7093744989], [6.1584227788, 49.6913927796], [6.1307043487, 49.6913873587]]]}, "properties": {"layer_name": "Localité", "label": "FAKE: Lorentzweiler (Luerenzweiler)"}, "type": "Feature", "bbox": [6.1306908729, 49.6913873587, 6.1584227788, 49.7093744989], "id": "3015350"}, {"geometry": {"type": "Point", "coordinates": [6.1260755554, 49.5341675239]}, "properties": {"layer_name": "editus_poi_293", "label": "Ferra-Lu Sàrl [Livange] (Menuiserie)"}, "type": "Feature", "bbox": {}, "id": "3948238"}, {"geometry": {"type": "Polygon", "coordinates": [[[6.0374612588, 49.5476811355], [6.0373496005, 49.5897910773], [6.1042912589, 49.5898468242], [6.1043453603, 49.5477367999], [6.0374612588, 49.5476811355]]]}, "properties": {"layer_name": "Commune", "label": "Leudelange"}, "type": "Feature", "bbox": [6.0373496005, 49.5476811355, 6.1043453603, 49.5898468242], "id": "3712759"}, {"geometry": {"type": "Polygon", "coordinates": [[[6.1201290384, 49.5916379191], [6.1201117205, 49.609619944], [6.1477837563, 49.6096278959], [6.1477909001, 49.5916458659], [6.1201290384, 49.5916379191]]]}, "properties": {"layer_name": "Localité", "label": "Luxembourg-Gare (Gare)"}, "type": "Feature", "bbox": [6.1201117205, 49.5916379191, 6.1477909001, 49.6096278959], "id": "3015354"}]}' # noqa
            return geojson.loads(fake_response)

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
                    "minimum_should_match": 2,
                    "should": []
                }
            }
        }
        filters = query_body['query']['bool']['filter']['bool']

        filters['must'].append({"type": {"value": "poi"}})

        if layer:
            for cur_layer in layer.split(","):
                filters['should'].append({"term": {"layer_name": cur_layer}})

        boosts = [
                { "name": "Adresse", "boost": 8 },
                { "name": "nom_de_rue", "boost": 2 },
                { "name": "Commune", "boost": 10 },
                { "name": "Localité", "boost": 8 },
                { "name": "lieu_dit", "boost": 7 },
                { "name": "Parcelle", "boost": 1 },
                { "name": "FLIK", "boost": 1 },
                { "name": "asta_esp", "boost": 0 },
                { "name": "hydro", "boost": 0 },
                { "name": "hydro_km", "boost": 0 },
                { "name": "biotope", "boost": 0 },
                { "name": "editus_poi*", "boost": -1.5 },
                ]
        for l in boosts:
            query_body['query']['bool']['should'].append({
                "wildcard": {
                    "layer_name": { "value": l["name"], "boost": l["boost"] }
                }
            })


        matches = [{
            "fields": [ "label^2", "label.ngram^2", "label.simplified^2" ],
        }, {
            "fields": [ "label.ngram", "label.simplified" ],
            "fuzziness": fuzziness,
        }]
        for term in query.split('%20'):
            for match in matches:
               part = {
                    "multi_match": {
                        "type": "best_fields",
                        "operator": "and",
                        "query": term
                    }
               }
               part['multi_match'].update(match)
               query_body['query']['bool']['should'].append(part)

        extent = self.request.params.get('extent', False)
        if extent:
            extent = extent.split(',')
            filters['must'].append({
                "geo_shape": {
                    "ts": {
                        "shape": {
                            "type": "envelope",
                            "coordinates": [
                                [ extent[0], extent[3] ],
                                [ extent[2], extent[1] ]
                                ]
                            },
                        "relation": "within"
                        }
                    }
                })

        if self.request.user is None:
            filters['must'].append({"term": {"public": True}})
        else:
            role_id = self.request.user.settings_role.id
            filters['should'].append({"term": {"public": True}})
            filters['should'].append({"term": {"role_id": role_id}})

        es = get_elasticsearch(self.request)
        try:
            search = es.search(index=get_index(self.request),
                               body=query_body,
                               size=limit)
        except Exception as e:
            log.exception(e)
            log.error('ES error querying {} on {}'.format(get_index(self.request), get_host()))
            return HTTPInternalServerError()
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

        if os.environ.get('FAKE_LAYERSEARCH', None) == '1':
            fake_response = '[{"layer_id": 370, "name": "luxembourg_on_horse", "language": "de"}, {"layer_id": 563, "name": "eau_new_Luftdruck", "language": "de"}, {"layer_id": 748, "name": "aero_1994_30k", "language": "de"}, {"layer_id": 229, "name": "aero_1951_25k", "language": "de"}, {"layer_id": 738, "name": "luref_graticules", "language": "en"}, {"layer_id": 341, "name": "aero_1951_10k", "language": "de"}, {"layer_id": 615, "name": "eau_new_Luftfeucht", "language": "de"}, {"layer_id": 140, "name": "aero_1963_20k", "language": "de"}]' #  noqa
            return json.loads(fake_response)

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
                            "type": "cross_fields",
                            "fields": [
                                "name_translated.simplified^2",
                                "name_translated.ngram",
                                "metadata_name.simplified^2",
                                "metadata_name.ngram",
                                "keywords",
                                "description",
                            ],
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
            role_id = self.request.user.settings_role.id
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

    @view_config(route_name='cmssearch', renderer='json')
    def cmssearch(self):
        if 'query' not in self.request.params:
            return HTTPBadRequest(detail='no query')
        query = self.request.params.get('query')
        query_language = self.request.params.get('language', 'fr')

        maxlimit = self.settings.get('maxlimit', 200)

        try:
            limit = int(self.request.params.get(
                'limit',
                self.settings.get('defaultlimit', 30)))
        except ValueError:
            return HTTPBadRequest(detail='limit value is incorrect')
        if limit > maxlimit:
            limit = maxlimit

        if os.environ.get('FAKE_CMSSEARCH', None) == '1':
            fake_response = \
'[{"url": "/fr/questions/payer-par-domiciliation/", "text": " Avec l\'introduction du système de paiement SEPA dans 32 pays européens à partir du 1er février 2014, il est maintenant possible de payer vos factures par domiciliation. Le SEPA Direct Debit (SDD) garantit au consommateur un droit de remboursement systématique, au cours de huit semaines (8) après le débit du compte du consommateur. Votre facture sera émise à la première journée de travail du mois, reprenant l\'énumération des bulletins de livraisons de la période précédente. Vous avez une semaine pour vérifier si le détail correspond avec les livraisons fournies. Après ce délai, le fichier de domiciliations sera envoyé à la société CETREL qui exécutera le prélèvement le 15e jour du mois. Si vous êtes intéressé par la domiciliation, vous pouvez télécharger ici  , que nous vous prions de renvoyer dûment complété et signé à l\'adresse: Administration du Cadastre et de la Topographie Service de la comptabilité B.P. 1761 L-1017 Luxembourg  Pour avoir plus d\'informations concernant le déroulement de l\'encaissement automatique, n\'hésitez pas à contacter notre service de comptabilité au 44901-258. Pour avoir plus d\'informations sur le SEPA Direct Debit (SDD), veuillez consulter le formulaire de demande d\'accès au service SEPA ABBL. Demander la domiciliation de vos factures  ", "language": "fr", "title": "FAKE: Payer par Domiciliation"}]' #  noqa
            return json.loads(fake_response)

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
                            "type": "best_fields",
                            "fields": [
                                "title^2",
                                "text",
                            ],
                            "fuzziness": "auto",
                            "prefix_length": 3,
                            "operator": "and",
                            "query": query
                        }
                    },
                }
            }
        }
        filters = query_body['query']['bool']['filter']['bool']

        filters['must'].append({"term": {"language": query_language}})
        es = get_elasticsearch(self.request)
        search = es.search(index='cms-index',
                           body=query_body,
                           size=limit*4)
        objs = search['hits']['hits']
        features = []

        for o in objs:
            s = o['_source']
            feature = {
                "url": s['url'],
                "title": s['title'],
                "text": s['text'],
                "language": s['language']
            }
            features.append(feature)
        return features[:limit]

    @view_config(route_name='featuresearch', renderer='json')
    def featuresearch(self, layers=None):
        if 'query' not in self.request.params:
            return HTTPBadRequest(detail='no query')
        query = self.request.params.get('query')
        query = query.replace("'", "''")
        if layers is None:
            layers = self.request.params.get('layers', '')
        layers = layers.split(',')
        extent = self.request.params.get('extent', False)
        query_language = self.request.params.get('language', 'fr')

        maxlimit = self.settings.get('maxlimit', 200)

        try:
            limit = int(self.request.params.get(
                'limit',
                self.settings.get('defaultlimit', 30)))
        except ValueError:
            return HTTPBadRequest(detail='limit value is incorrect')
        if limit > maxlimit:
            limit = maxlimit

        from c2cgeoportal_commons.models import DBSession, DBSessions
        from c2cgeoportal_commons.models.main import TreeItem
        from geoportailv3_geoportal.models import LuxGetfeatureDefinition
        request_layers = DBSession.query(LuxGetfeatureDefinition).filter(LuxGetfeatureDefinition.layer.in_(layers))

        features = []
        for layer in request_layers:
            layer_name = (DBSession.query(TreeItem)
                          .filter(TreeItem.id == layer.layer)).first().name
            search_column = layer.search_column
            if search_column is None or search_column == "":
                log.warning(f'Layer {layer.layer} ({layer_name}) has no search column definition - '
                            'skipping search results for this layer.')
                continue

            if (layer.engine_gfi is not None and
                layer.query is not None and
                    len(layer.query) > 0):
                query_1 = layer.query
                if "WHERE" in query_1.upper():
                    query_1 = query_1 + " AND "
                else:
                    query_1 = query_1 + " WHERE "

                if "SELECT" in query_1.upper():
                    query_1 = query_1.replace(
                        "SELECT",
                        "SELECT ST_AsGeoJSON(ST_Transform(%(geom)s, 3857)), "
                        % {'geom': layer.geometry_column}, 1)
                else:
                    query_1 = "SELECT *,ST_AsGeoJSON(ST_Transform(%(geom)s, 3857)) FROM "\
                        % {'geom': layer.geometry_column} +\
                        query_1

                gfi_query = query_1 + f"lower({search_column}) like '%{query.lower()}%'"
                if extent:
                    bbox = extent.split(',')
                    gfi_query = gfi_query + " AND ST_Intersects(ST_Transform( %(geom)s, 3857), "\
                        "ST_MakeEnvelope(%(left)s, %(bottom)s, %(right)s,"\
                        "%(top)s, 3857) )"\
                        % {'left': bbox[0],
                           'bottom': bbox[1],
                           'right': bbox[2],
                           'top': bbox[3],
                           'geom': layer.geometry_column}
                query_limit = 20
                if layer.query_limit is not None:
                    query_limit = layer.query_limit
                if query_limit > 0:
                    gfi_query = gfi_query + " LIMIT " + str(query_limit)

                session = DBSessions[layer.engine_gfi]
                res = session.execute(gfi_query)
                rows = res.fetchall()

                cnt = 0
                for row in rows:
                    cnt = cnt + 1
                    if cnt > limit:
                        break

                    try:
                        geom = geojson.loads(row['st_asgeojson'])
                    except:
                        geom = None
                    try:
                        geom = shape(geom)
                        bbox = geom.bounds
                    except:
                        bbox = {}
                    attributes = dict(row)
                    if layer.id_column in row:
                        featureid = row[layer.id_column]
                    else:
                        if 'id' in row:
                            featureid = row['id']
                        else:
                            featureid = None
                    properties = {'label': attributes[search_column],
                                  'layer_name': layer_name}
                    features.append(Feature(id=featureid,
                                            geometry=geom,
                                            properties=properties,
                                            bbox=bbox))

            elif (layer.rest_url is not None and
                  len(layer.rest_url) > 0):

                url = layer.rest_url
                if url.find("@") > -1:
                    url = self._get_url_with_token(url)

                # construct url for get request
                separator = '?'
                if url.find(separator) > 0:
                    separator = '&'
                body = {
                    'f': 'json',
                    'returnGeometry': 'true',
                    'where': f"lower({search_column}) like '%{query.lower()}%'",
                    'outSR': '3857',
                    'outFields': '*'
                }
                if layer.use_auth:
                    auth_token = get_arcgis_token(self.request, log)
                    if 'token' in auth_token:
                        body["token"] = auth_token['token']
                if extent:
                    body['inSR'] = '3857'
                    body['geometry'] = extent
                    body['geometryType'] = 'esriGeometryEnvelope'
                    body['spatialRel'] = 'esriSpatialRelIntersects'

                esri_query = '%s%s%s' % (url, separator, urllib.parse.urlencode(body))
                log.info(esri_query)
                try:
                    url_request = urllib.request.Request(esri_query)
                    result = read_request_with_token(url_request, self.request, log)
                    content = result.data
                except ESRITokenException as e:
                    raise HTTPBadGateway(e)
                except Exception as e:
                    log.exception(e)
                    log.error(url)
                    return []

                try:
                    mf = fiona.MemoryFile(content)
                    esricoll = mf.open(driver='ESRIJSON')
                except:
                    raise
                cnt = 0
                for rawfeature in esricoll:
                    cnt = cnt + 1
                    if cnt > limit:
                        break
                    geom = rawfeature['geometry']
                    bbox = {}
                    try:
                        geom = shape(geom)
                        bbox = geom.bounds
                    except:
                        pass
                    attr = rawfeature['properties']

                    if layer.id_column in attr:
                        id = attr[layer.id_column]
                    else:
                        if 'id' in attr:
                            id = attr['id']
                        else:
                            id = None
                    properties = {'label': attr[search_column],
                                  'layer_name': layer_name}

                    features.append(Feature(id=id,
                                            geometry=geom,
                                            properties=properties,
                                            bbox=bbox))

                esricoll.close()
                mf.close()

            else:
                log.info(f"WMS layers cannot be searched - skipping {layer_name}")

        return FeatureCollection(features)
