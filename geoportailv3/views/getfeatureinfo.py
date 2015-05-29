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
from pyramid.response import Response
from geojson import loads as geojson_loads

log = logging.getLogger(__name__)


class Getfeatureinfo(object):

    def __init__(self, request):
        self.request = request
        self.dbsession = sqlahelper.get_session()

    # Get the tooltip template from the poi manager database
    # and replace each poi placeholder by the angular notation
    @view_config(route_name='getpoitemplate')
    def get_poi_template(self):
        layer = self.request.params.get('layer', None)
        if layer is None:
            return HTTPBadRequest()
        self.dbsession = sqlahelper.get_session()
        luxgetfeaturedefinitions = self.get_lux_feature_definition(layer)
        if len(luxgetfeaturedefinitions) is not 1:
            return HTTPBadRequest()

        if luxgetfeaturedefinitions[0].poi_id_collection is None:
            return HTTPBadRequest()

        engine = sqlahelper.get_engine(luxgetfeaturedefinitions[0].engine)
        poi_fields = ["id", "id_collection", "line_num", "easting", "northing",
                      "zip", "town", "street", "poi_name", "description",
                      "type", "url", "active", "core_data", "master_id",
                      "data_type", "synchro_date", "creation_date", "num",
                      "matching_address", "accuracy", "ratio",
                      "master_collection_id", "file_id", "x", "y",
                      "user_field1", "user_field2", "user_field3",
                      "user_field4", "user_field5", "phone", "mail",
                      "id_poi", "country", "category"]

        query = "SELECT mapv3_html FROM public.tooltips WHERE \
                id_collection=%d AND is_default=true"\
                % (luxgetfeaturedefinitions[0].poi_id_collection)
        res = engine.execute(query)
        for row in res.fetchall():
            content = row['mapv3_html'].replace("$%7B", "${").\
                replace("%7D", "}")
            for field in poi_fields:
                content = content.replace("${%(field)s}" % ({'field': field}),
                                          "{{feature['attributes']\
                                          ['%(field)s']}}"
                                          % ({'field': field}))
            response = "<h1>{{layers['layerLabel'] | translate}}</h1>\
                       <div ng-repeat=\"feature in layers['features']\">%s\
                       </div>" % (content)
            return Response(response)
        return HTTPBadRequest()

    @view_config(route_name='getfeatureinfo', renderer='json')
    def get_feature_info(self):
        layers = self.request.params.get('layers', None)
        if layers is None:
            return HTTPBadRequest()
        box = self.request.params.get('box', None)
        if box is None:
            return HTTPBadRequest()

        luxgetfeaturedefinitions = self.get_lux_feature_definition(layers)

        results = []
        for luxgetfeaturedefinition in luxgetfeaturedefinitions:
            if (luxgetfeaturedefinition is not None and
                luxgetfeaturedefinition.engine is not None and
                luxgetfeaturedefinition.query is not None and
                    len(luxgetfeaturedefinition.query) > 0):
                engine = sqlahelper.get_engine(luxgetfeaturedefinition.engine)

                coordinates = box.split(',')
                query = luxgetfeaturedefinition.query
                if "WHERE" in query.upper():
                    query = query + " AND "
                else:
                    query = query + " WHERE "
                query = query + "ST_Intersects( %(geom)s, ST_MakeEnvelope \
                    (%(left)s, %(bottom)s, %(right)s, %(top)s, 2169) )"\
                    % {'left': coordinates[0], 'bottom': coordinates[1],
                       'right': coordinates[2], 'top': coordinates[3],
                       'geom': luxgetfeaturedefinition.geometry_column}

                if "SELECT" in query.upper():
                    query = query.replace("SELECT",
                                          "SELECT ST_AsGeoJSON (%(geom)s), "
                                          % {'geom': luxgetfeaturedefinition.
                                             geometry_column}, 1)
                else:
                    query = "SELECT *,ST_AsGeoJSON(%(geom)s) FROM "\
                            % {'geom': luxgetfeaturedefinition.
                               geometry_column} + query

                res = engine.execute(query)
                rows = res.fetchall()
                if (luxgetfeaturedefinition.additional_info_function
                    is not None and
                    len(luxgetfeaturedefinition.additional_info_function)
                        > 0):

                    features = eval(luxgetfeaturedefinition.
                                    additional_info_function)

                    if len(features) > 0:
                        results.append(
                            self.to_featureinfo(
                                features,
                                luxgetfeaturedefinition.layer,
                                luxgetfeaturedefinition.template,
                                luxgetfeaturedefinition.remote_template))
                else:
                    features = []
                    for row in rows:
                        geometry = geojson_loads(row['st_asgeojson'])
                        attributes = dict(row)
                        f = self.to_feature(
                            geometry,
                            attributes,
                            luxgetfeaturedefinition.attributes_to_remove,
                            luxgetfeaturedefinition.geometry_column)
                        features.append(f)
                    if len(features) > 0:
                        results.append(
                            self.to_featureinfo(
                                features,
                                luxgetfeaturedefinition.layer,
                                luxgetfeaturedefinition.template,
                                luxgetfeaturedefinition.remote_template))

            if (luxgetfeaturedefinition is not None and
                luxgetfeaturedefinition.rest_url is not None and
                    len(luxgetfeaturedefinition.rest_url) > 0):
                features = self._get_external_data(
                    luxgetfeaturedefinition.rest_url,
                    box, None, None,
                    luxgetfeaturedefinition.attributes_to_remove)
                if len(features) > 0:
                    results.append(
                        self.to_featureinfo(
                            features,
                            luxgetfeaturedefinition.layer,
                            luxgetfeaturedefinition.template,
                            luxgetfeaturedefinition.remote_template))
        return results

    def to_feature(self, geometry, attributes, attributes_to_remove,
                   geometry_column='geom'):
        return {'type': 'Feature',
                'geometry': geometry,
                'attributes': self.remove_attributes(
                    attributes,
                    attributes_to_remove,
                    geometry_column)}

    def to_featureinfo(self, features, layer, template, remote_template=False):
        return {"remote_template": remote_template,
                "template": template,
                "layer": layer,
                "features": features}

    def get_lux_feature_definition(self, layers):
        luxgetfeaturedefinitions = []
        try:
            if layers is not None:
                for layer in layers.split(','):
                    query = self.dbsession.query(
                        LuxGetfeatureDefinition).filter(
                            LuxGetfeatureDefinition.layer == layer
                        )
                    if self.request.user is not None:
                        if query.filter(
                                LuxGetfeatureDefinition.role ==
                                self.request.user.role.id
                                ).count() > 0:
                            luxgetfeaturedefinitions.append(query.filter(
                                LuxGetfeatureDefinition.role ==
                                self.request.user.role.id
                                ).first())
                        else:
                            luxgetfeaturedefinitions.append(query.filter(
                                LuxGetfeatureDefinition.role == None
                                ).first())  # noqa
                    else:
                        luxgetfeaturedefinitions.append(query.filter(
                            LuxGetfeatureDefinition.role == None
                            ).first())  # noqa
        except:
            traceback.print_exc(file=sys.stdout)
            return HTTPBadRequest()
        return luxgetfeaturedefinitions

    def remove_attributes(self, attributes, attributes_to_remove,
                          geometry_column='geom'):
        elements = []
        if not (attributes_to_remove is None or
                len(attributes_to_remove) == 0):
            elements = attributes_to_remove.split(",")
        elements.extend([geometry_column, 'st_asgeojson'])
        for element in elements:
            try:
                del attributes[element]
            except:
                pass
        return attributes

    def get_info_from_pf(self, rows):
        import geoportailv3.PF
        pf = geoportailv3.PF.PF()
        features = []
        for row in rows:
            geometry = geojson_loads(row['st_asgeojson'])

            f = self.to_feature(geometry, dict(row), "")

            d = f['attributes']
            d['PF'] = dict(pf.get_detail(d['code_commu'],
                                         d['code_secti'],
                                         int(d['num_cadast']),
                                         int(d['code_sup'])))
            features.append(f)

        return features

    def get_info_from_mymaps(self, rows, attributes_to_remove):
        features = []
        for row in rows:
            category_id = row['category_id']
            map_id = row['map_id']
            engine = sqlahelper.get_engine("mymaps")
            query = "select  ST_AsGeoJSON(ST_Collect (geometry)) as geometry\
                    , sum(ST_Length(geometry)) as length FROM\
                     public.feature_with_map_with_colors where\
                     category_id = %(category_id)d and map_id = '%(map_id)s'"\
                    % {'category_id': category_id, 'map_id': map_id}
            res = engine.execute(query)
            for feature in res.fetchall():
                geometry = geojson_loads(feature['geometry'])
                attributes = dict(row)
                attributes['length'] = round(feature['length'] / 1000, 2)
                self.remove_attributes(attributes,
                                       attributes_to_remove,
                                       "geometry")
                features.append(self.to_feature(geometry, attributes, ""))

        return features

    def _get_external_data(self, url, bbox=None, featureid=None, cfg=None,
                           attributes_to_remove=None):
        # ArcGIS Server REST API:
        # http://help.arcgis.com/en/arcgisserver/10.0/apis/rest/query.html
        # form example:
        # http://ws.geoportail.lu/ArcGIS/rest/services/wassergis/waassergis_mxd/MapServer/45/query
        #
        # params "params_meaning" (params_type) [predefined_values]:
        #
        # f              "Format" (choice) [html kml pjson]
        # geometry       "Filter Geometry" (string)
        # geometryType   "Geometry Type" (choice)
        #                [esriGeometryEnvelope esriGeometryPoint
        #                 esriGeometryPolyline esriGeometryPolygon
        #                 esriGeometryMultipoint]
        # inSR           "Input Spatial Reference (WKID)" (string)
        # objectIds      "The object IDs of this layer
        #                 / table to be queried" (string)
        # outFields      "Return Fields (Comma Separated or *)" (string)
        # outSR          "Output Spatial Reference (WKID)" (string)
        # returnGeometry "Return Geometry" (bool true/false)
        # spatialRel     "Spatial Relationship" (choice)
        #                [esriSpatialRelIntersects esriSpatialRelContains
        #                 esriSpatialRelCrosses
        #                 esriSpatialRelEnvelopeIntersects
        #                 esriSpatialRelIndexIntersects esriSpatialRelOverlaps
        #                 esriSpatialRelTouches esriSpatialRelWithin]
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
        if 'features' in esricoll:
            for rawfeature in esricoll['features']:
                geometry = ''
                if (rawfeature['geometry'] and
                    'x' in rawfeature['geometry'] and
                        'y' in rawfeature['geometry']):
                    geometry = {'type': 'Point',
                                'coordinates': [rawfeature['geometry']['x'],
                                                rawfeature['geometry']['y']]}
                elif (rawfeature['geometry'] and
                      'x' in rawfeature['geometry'] and
                      'Y' in rawfeature['geometry']):
                    geometry = {'type': 'Point',
                                'coordinates': [rawfeature['geometry']['x'],
                                                rawfeature['geometry']['Y']]}
                elif (rawfeature['geometry'] and
                      'paths' in rawfeature['geometry'] and
                      len(rawfeature['geometry']['paths']) > 0):
                    geometry = {'type': 'MultiLineString',
                                'coordinates': rawfeature['geometry']['paths']}
                elif (rawfeature['geometry'] and
                      'rings' in rawfeature['geometry'] and
                      len(rawfeature['geometry']['rings']) > 0):
                    geometry = {'type': 'Polygon',
                                'coordinates': rawfeature['geometry']['rings']}

                if geometry != '':
                    f = self.to_feature(geometry,
                                        rawfeature['attributes'],
                                        attributes_to_remove)
                    features.append(f)

        return features
