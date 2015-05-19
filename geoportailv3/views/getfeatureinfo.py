# -*- coding: utf-8 -*-
import sqlahelper
import logging
import sys
import traceback
import urllib2

from urllib import urlencode
from pyramid.view import view_config
from geoportailv3.models import LuxGetfeatureDefinition
from pyramid.httpexceptions import HTTPBadRequest
from geojson import loads as geojson_loads

log = logging.getLogger(__name__)


class Getfeatureinfo(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='getfeatureinfo', renderer='json')
    def get_feature_info(self):

        layers = self.request.params.get('layers', None)
        if layers is None:
            return HTTPBadRequest()
        box = self.request.params.get('box', None)
        if box is None:
            return HTTPBadRequest()

        dbsession = sqlahelper.get_session()

        try:
            luxgetfeaturedefinitions = []
            if layers is not None:
                for layer in layers.split(','):
                    query = dbsession.query(
                        LuxGetfeatureDefinition).filter(
                            LuxGetfeatureDefinition.layer == layer
                        )
                    if self.request.user is not None:
                        if query.filter(
                                LuxGetfeatureDefinition.role == self.request.user.role.id
                                ).count() > 0:
                            luxgetfeaturedefinitions.append(query.filter(
                                LuxGetfeatureDefinition.role == self.request.user.role.id
                                ).first())
                        else:
                            luxgetfeaturedefinitions.append(query.filter(
                                LuxGetfeatureDefinition.role == None
                                ).first())
                    else:
                        luxgetfeaturedefinitions.append(query.filter(
                            LuxGetfeatureDefinition.role == None
                            ).first())
        except:
            traceback.print_exc(file=sys.stdout)
            return HTTPBadRequest()

        results = []
        for luxgetfeaturedefinition in luxgetfeaturedefinitions:
            if luxgetfeaturedefinition.engine is not None and luxgetfeaturedefinition.query is not None:
                engine = sqlahelper.get_engine(luxgetfeaturedefinition.engine)
                coordinates = box.split(',')
                res = engine.execute(
                    luxgetfeaturedefinition.query
                    % {'left': coordinates[0], 'bottom': coordinates[1],
                       'right': coordinates[2], 'top': coordinates[3]})
                rows = res.fetchall()
                if luxgetfeaturedefinition.additional_info_function is not None\
                    and len(
                        luxgetfeaturedefinition.additional_info_function
                        ) > 0:
                    results.append(
                        {"template": luxgetfeaturedefinition.template,
                         "layer": luxgetfeaturedefinition.layer,
                         "values": eval(luxgetfeaturedefinition.
                                        additional_info_function)})
                else:
                    results.append(
                        {"template": luxgetfeaturedefinition.template,
                         "layer": luxgetfeaturedefinition.layer,
                         "values": [dict(r) for r in rows]})
            if luxgetfeaturedefinition.rest_url is not None:
                self._get_external_data(luxgetfeaturedefinition.rest_url, box)
                results.append(
                    {"template": luxgetfeaturedefinition.template,
                     "layer": luxgetfeaturedefinition.layer,
                     "values": []})
        return results

    def get_info_from_pf(self, rows):
        results = []
        import geoportailv3.PF
        pf = geoportailv3.PF.PF()

        for r in rows:
            d = dict(r)
            d['PF'] = dict(pf.get_detail(d['code_commu'],
                                         d['code_secti'],
                                         int(d['num_cadast']),
                                         int(d['code_sup'])))
            results.append(d)

        return results

    def _get_external_data(self, url, bbox=None, featureid=None, cfg=None):
        # ArcGIS Server REST API:
        # http://help.arcgis.com/en/arcgisserver/10.0/apis/rest/query.html
        # form example:
        # http://ws.geoportail.lu/ArcGIS/rest/services/wassergis/waassergis_mxd/MapServer/45/query
        #
        # params "params_meaning" (params_type) [predefined_values]:
        #
        # f              "Format" (choice) [html kml pjson]
        # geometry       "Filter Geometry" (string)
        # geometryType   "Geometry Type" (choice) [esriGeometryEnvelope esriGeometryPoint esriGeometryPolyline esriGeometryPolygon esriGeometryMultipoint]
        # inSR           "Input Spatial Reference (WKID)" (string)
        # objectIds      "The object IDs of this layer / table to be queried" (string)
        # outFields      "Return Fields (Comma Separated or *)" (string)
        # outSR          "Output Spatial Reference (WKID)" (string)
        # returnGeometry "Return Geometry" (bool true/false)
        # spatialRel     "Spatial Relationship" (choice) [esriSpatialRelIntersects esriSpatialRelContains esriSpatialRelCrosses esriSpatialRelEnvelopeIntersects esriSpatialRelIndexIntersects esriSpatialRelOverlaps esriSpatialRelTouches esriSpatialRelWithin]
        # text           "nom" (string)
        # where          "Where" (string)
        #
        # example:
        # http://ws.geoportail.lu/ArcGIS/rest/services/wassergis/waassergis_mxd/MapServer/45/query?text=&geometry=69000%2C124000%2C70000%2C125000&geometryType=esriGeometryEnvelope&inSR=2169&spatialRel=esriSpatialRelIntersects&where=&returnGeometry=true&outSR=&outFields=&f=pjson

        body = {'f': 'pjson',
                'geometry': '',
                'geometryType': '',
                'inSR': '2169',
                'outSR': '',
                'returnGeometry': 'true',
                'spatialRel': '',
                'text': '',
                'where': '',
                'outFields': '*',
                'objectIds': ''}

        if featureid is not None:
            body['objectIds'] = featureid
        elif bbox is not None:
            body['geometry'] = bbox
            body['geometryType'] = 'esriGeometryEnvelope'
            body['spatialRel'] = 'esriSpatialRelIntersects'
        else:
            return []

        # construct url for get request
        separator = "?"
        if url.find('?'):
            separator = "&"
        query = '%s%s%s' % (url, separator, urlencode(body))
        try:
            result = urllib2.urlopen(query, None, 15)
            content = result.read()
        except:
            traceback.print_exc(file=sys.stdout)
            return []

        features = []
        try:
            esricoll = geojson_loads(content)
        except:
            raise
        print esricoll
        return esricoll
        # find the esriFieldTypeOID field name (to recover the feature id)
        esri_id_field_name = None
        # if 'fields' in esricoll:
        #    esri_id_field_name = self._get_esri_id_field_name(esricoll['fields'])
        # parse esri json and build geosjon accordingly to the geometry type
        if 'features' in esricoll:
            for rawfeature in esricoll['features']:
                f = ''
                if rawfeature['geometry'] and 'x' in rawfeature['geometry'] and 'y' in rawfeature['geometry']:
                    f = {
                        'type': 'Feature',
                        'geometry': {'type': 'Point',
                                     'coordinates': [rawfeature['geometry']['x'], rawfeature['geometry']['y']]}
                    }
                elif rawfeature['geometry'] and 'x' in rawfeature['geometry'] and 'Y' in rawfeature['geometry']:
                    f = {
                        'type': 'Feature',
                        'geometry': {'type': 'Point', 'coordinates': [rawfeature['geometry']['x'], rawfeature['geometry']['Y']]}
                    }
                elif rawfeature['geometry'] and 'paths' in rawfeature['geometry'] and len(rawfeature['geometry']['paths']) > 0:
                    f = {
                        'type': 'Feature',
                        'geometry': {'type': 'MultiLineString', 'coordinates': rawfeature['geometry']['paths']}
                    }
                elif rawfeature['geometry'] and 'rings' in rawfeature['geometry'] and len(rawfeature['geometry']['rings']) > 0:
                    f = {
                        'type': 'Feature',
                        'geometry': {'type': 'Polygon', 'coordinates': rawfeature['geometry']['rings']}
                    }

                if f != '':
                    pass
                    # store attribute in c for template generation
                    # id = rawfeature['attributes']['_f_id_'] = self._get_feature_id(esri_id_field_name, rawfeature)
                    # c.feature = rawfeature['attributes']
                    # features.append(c.feature)

        return features
