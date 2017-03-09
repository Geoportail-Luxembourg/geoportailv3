# -*- coding: utf-8 -*-
import sqlahelper
import logging
import urllib2
import re

from urllib import urlencode
from pyramid.renderers import render
from pyramid.view import view_config
from geoportailv3.models import Sessions, LuxGetfeatureDefinition
from pyramid.httpexceptions import HTTPBadRequest, HTTPBadGateway
from pyramid.i18n import get_localizer, TranslationStringFactory
from pyramid.response import Response
from pkg_resources import resource_filename
from os.path import isfile
from geojson import loads as geojson_loads
from shapely.geometry import asShape, box
from shapely.geometry.polygon import LinearRing
from c2cgeoportal.models import DBSession, RestrictionArea, Role, Layer
from sqlalchemy.orm import scoped_session, sessionmaker

log = logging.getLogger(__name__)


class Getfeatureinfo(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='download_resource')
    def download_resource(self):
        fid = self.request.params.get('fid', None)
        attribute = self.request.params.get('attribute', None)
        if fid is None or attribute is None:
            return HTTPBadRequest("Request paramaters are missing")
        layers, fid = fid.split('_', 1)
        if layers is None:
            return HTTPBadRequest("Request paramaters are missing")
        luxgetfeaturedefinitions = self.get_lux_feature_definition(layers)
        if len(luxgetfeaturedefinitions) == 0:
            return HTTPBadRequest("Configuration is missing")
        url = None
        luxgetfeaturedefinition = luxgetfeaturedefinitions[0]
        # TODO : Manage Database definition. Not only remote services.
        if (luxgetfeaturedefinition is not None and
            luxgetfeaturedefinition.rest_url is not None and
                len(luxgetfeaturedefinition.rest_url) > 0):
            features = self._get_external_data(
                luxgetfeaturedefinition.layer,
                luxgetfeaturedefinition.rest_url,
                luxgetfeaturedefinition.id_column,
                None, fid, None,
                luxgetfeaturedefinition.attributes_to_remove,
                luxgetfeaturedefinition.columns_order)
            if attribute not in features[0]['attributes']:
                return HTTPBadRequest("Bad attribute")
            url = features[0]['attributes'][attribute]

        if (url is None or not url.lower().startswith("http")):
            return HTTPBadRequest("Attribute is not a valid url")
        timeout = 15
        try:
            f = urllib2.urlopen(url, None, timeout)
            data = f.read()
        except:
            try:
                # Retry to get the result
                f = urllib2.urlopen(url, None, timeout)
                data = f.read()
            except Exception as e:
                log.exception(e)
                log.error(url)
                return HTTPBadGateway("Unable to access the remote url")

        headers = {"Content-Type": f.info()['Content-Type']}

        return Response(data, headers=headers)

    # Get the remote template
    @view_config(route_name='getremotetemplate')
    def get_remote_template(self):
        layer = self.request.params.get('layer', None)
        if layer is None:
            return HTTPBadRequest()

        luxgetfeaturedefinitions = self.get_lux_feature_definition(layer)
        if len(luxgetfeaturedefinitions) is not 1:
            return HTTPBadRequest()

        if (luxgetfeaturedefinitions[0].template is not None and
                len(luxgetfeaturedefinitions[0].template) > 0):
            f = urllib2.urlopen(luxgetfeaturedefinitions[0].template, None, 15)
            return Response(f.read())

        return HTTPBadRequest()

    # Get the tooltip template from the poi manager database
    # and replace each poi placeholder by the angular notation
    @view_config(route_name='getpoitemplate')
    def get_poi_template(self):
        layer = self.request.params.get('layer', None)
        if layer is None:
            return HTTPBadRequest()

        luxgetfeaturedefinitions = self.get_lux_feature_definition(layer)
        if len(luxgetfeaturedefinitions) is not 1:
            return HTTPBadRequest()

        if luxgetfeaturedefinitions[0].poi_id_collection is None:
            return HTTPBadRequest()
        session = self._get_session(luxgetfeaturedefinitions[0].engine_gfi)
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

        res = session.execute(query)
        for row in res.fetchall():
            content = row['mapv3_html'].replace("$%7B", "${").\
                replace("%7D", "}")
            for field in poi_fields:
                content = content.replace("${%(field)s}" % ({'field': field}),
                                          "{{feature['attributes']\
                                          ['%(field)s']}}"
                                          % ({'field': field}))
            response = "<h1>{{layers['layerLabel'] | translate}}</h1>\
                       <div class=\"poi-feature\"\
                       ng-repeat=\"feature in layers['features']\">%s\
                       </div>" % (content)
            return Response(response)
        return HTTPBadRequest()

    @view_config(route_name='getfeatureinfo', renderer='json')
    def get_feature_info(self):
        fid = self.request.params.get('fid', None)

        if fid is not None:
            layers, fid = fid.split('_', 1)
            if layers is None or fid is None:
                return HTTPBadRequest()
        else:
            layers = self.request.params.get('layers', None)
            if layers is None:
                return HTTPBadRequest()
            big_box = self.request.params.get('box1', None)
            small_box = self.request.params.get('box2', None)
            if big_box is None or small_box is None:
                return HTTPBadRequest()

        luxgetfeaturedefinitions = self.get_lux_feature_definition(layers)
        if fid is None:
            coordinates_big_box = big_box.split(',')
            coordinates_small_box = small_box.split(',')

        results = []
        for luxgetfeaturedefinition in luxgetfeaturedefinitions:
            if (luxgetfeaturedefinition is not None and
                luxgetfeaturedefinition.engine_gfi is not None and
                luxgetfeaturedefinition.query is not None and
                    len(luxgetfeaturedefinition.query) > 0):
                is_ordered = luxgetfeaturedefinition.columns_order is not None\
                    and len(luxgetfeaturedefinition.columns_order) > 0
                query_1 = luxgetfeaturedefinition.query
                if "WHERE" in query_1.upper():
                    query_1 = query_1 + " AND "
                else:
                    query_1 = query_1 + " WHERE "

                if "SELECT" in query_1.upper():
                    query_1 = query_1.replace(
                        "SELECT",
                        "SELECT ST_AsGeoJSON (%(geom)s), "
                        % {'geom': luxgetfeaturedefinition.geometry_column}, 1)

                else:
                    query_1 = "SELECT *,ST_AsGeoJSON(%(geom)s) FROM "\
                        % {'geom': luxgetfeaturedefinition.geometry_column} +\
                        query_1
                if fid is None:
                    query_point = query_1 + "ST_Intersects( %(geom)s, "\
                        "ST_MakeEnvelope(%(left)s, %(bottom)s, %(right)s,"\
                        "%(top)s, 2169) ) AND ST_NRings(%(geom)s) = 0"\
                        % {'left': coordinates_big_box[0],
                           'bottom': coordinates_big_box[1],
                           'right': coordinates_big_box[2],
                           'top': coordinates_big_box[3],
                           'geom': luxgetfeaturedefinition.geometry_column}

                    query_others = query_1 + "ST_Intersects( %(geom)s,"\
                        " ST_MakeEnvelope (%(left)s, %(bottom)s, %(right)s,"\
                        " %(top)s, 2169) ) AND  ST_NRings(%(geom)s) > 0"\
                        % {'left': coordinates_small_box[0],
                           'bottom': coordinates_small_box[1],
                           'right': coordinates_small_box[2],
                           'top': coordinates_small_box[3],
                           'geom': luxgetfeaturedefinition.geometry_column}

                    query = query_point + " UNION ALL " + query_others +\
                        " LIMIT 20"
                else:
                    if luxgetfeaturedefinition.id_column is not None:
                        query = query_1 + luxgetfeaturedefinition.id_column +\
                            " = '" + fid + "'"
                    else:
                        query = query_1 + " id = '" + fid + "'"

                session = self._get_session(luxgetfeaturedefinition.engine_gfi)
                res = session.execute(query)
                rows = res.fetchall()

                if (luxgetfeaturedefinition.additional_info_function
                    is not None and
                    len(luxgetfeaturedefinition.
                        additional_info_function) > 0):

                    features = eval(luxgetfeaturedefinition.
                                    additional_info_function)

                    if len(features) > 0:
                        results.append(
                            self.to_featureinfo(
                                features,
                                luxgetfeaturedefinition.layer,
                                luxgetfeaturedefinition.template,
                                is_ordered,
                                luxgetfeaturedefinition.has_profile,
                                luxgetfeaturedefinition.remote_template))
                else:
                    features = []
                    for row in rows:
                        geometry = geojson_loads(row['st_asgeojson'])
                        attributes = dict(row)
                        if luxgetfeaturedefinition.id_column in row:
                            featureid = row[luxgetfeaturedefinition.id_column]
                        else:
                            if 'id' in row:
                                featureid = row['id']
                            else:
                                featureid = None
                        f = self.to_feature(
                            luxgetfeaturedefinition.layer,
                            featureid,
                            geometry,
                            attributes,
                            luxgetfeaturedefinition.attributes_to_remove,
                            luxgetfeaturedefinition.columns_order,
                            luxgetfeaturedefinition.geometry_column)
                        features.append(f)
                    if len(features) > 0:
                        if fid is None:
                            results.append(
                                self.to_featureinfo(
                                    self.remove_features_outside_tolerance(
                                        features, coordinates_small_box),
                                    luxgetfeaturedefinition.layer,
                                    luxgetfeaturedefinition.template,
                                    is_ordered,
                                    luxgetfeaturedefinition.has_profile,
                                    luxgetfeaturedefinition.remote_template))
                        else:
                            results.append(
                                self.to_featureinfo(
                                    features,
                                    luxgetfeaturedefinition.layer,
                                    luxgetfeaturedefinition.template,
                                    is_ordered,
                                    luxgetfeaturedefinition.has_profile,
                                    luxgetfeaturedefinition.remote_template))
            if (luxgetfeaturedefinition is not None and
                luxgetfeaturedefinition.rest_url is not None and
                    len(luxgetfeaturedefinition.rest_url) > 0):
                if fid is None:
                    features = self._get_external_data(
                        luxgetfeaturedefinition.layer,
                        luxgetfeaturedefinition.rest_url,
                        luxgetfeaturedefinition.id_column,
                        big_box, None, None,
                        luxgetfeaturedefinition.attributes_to_remove,
                        luxgetfeaturedefinition.columns_order)
                else:
                    features = self._get_external_data(
                        luxgetfeaturedefinition.layer,
                        luxgetfeaturedefinition.rest_url,
                        luxgetfeaturedefinition.id_column,
                        None, fid, None,
                        luxgetfeaturedefinition.attributes_to_remove,
                        luxgetfeaturedefinition.columns_order)
                if len(features) > 0:
                    if (luxgetfeaturedefinition.additional_info_function
                        is not None and
                        len(luxgetfeaturedefinition.
                            additional_info_function) > 0):
                        features = eval(luxgetfeaturedefinition.
                                        additional_info_function)
                    is_ordered =\
                        luxgetfeaturedefinition.columns_order is not None\
                        and len(luxgetfeaturedefinition.columns_order) > 0
                    if fid is None:
                        results.append(
                            self.to_featureinfo(
                                self.remove_features_outside_tolerance(
                                    features, coordinates_small_box),
                                luxgetfeaturedefinition.layer,
                                luxgetfeaturedefinition.template,
                                is_ordered,
                                luxgetfeaturedefinition.has_profile,
                                luxgetfeaturedefinition.remote_template))
                    else:
                        results.append(
                            self.to_featureinfo(
                                features,
                                luxgetfeaturedefinition.layer,
                                luxgetfeaturedefinition.template,
                                is_ordered,
                                luxgetfeaturedefinition.has_profile,
                                luxgetfeaturedefinition.remote_template))

        if self.request.params.get('tooltip', None) is not None:
            path = 'templates/tooltip/'
            localizer = get_localizer(self.request)
            server = TranslationStringFactory("geoportailv3-server")
            tooltips = TranslationStringFactory("geoportailv3-tooltips")
            for r in results:
                l_template = r['template']
                filename = resource_filename('geoportailv3', path + l_template)
                template = l_template if isfile(filename) else 'default.html'

                for f in r['features']:
                    context = {
                        "_s": lambda s: localizer.translate(server(s)),
                        "_t": lambda s: localizer.translate(tooltips(s)),
                        "feature": f}
                    f['attributes']['tooltip'] = render(
                            'geoportailv3:' + path + template, context)

        return results

    def remove_features_outside_tolerance(self, features, coords):
        features_to_keep = []

        the_box = box(float(coords[0]), float(coords[1]),
                      float(coords[2]), float(coords[3]))

        for feature in features:
            s = asShape(feature['geometry'])
            if s.area > 0:
                if the_box.intersects(s):
                    features_to_keep.append(feature)
            else:
                features_to_keep.append(feature)
        return features_to_keep

    def to_feature(self, layer_id, fid, geometry, attributes,
                   attributes_to_remove, columns_order=None,
                   geometry_column='geom'):
        attributes = self.remove_attributes(
                    attributes,
                    attributes_to_remove,
                    geometry_column)
        if columns_order is not None:
            import collections

            ordered_attributes = collections.OrderedDict()
            orders = columns_order.split(",")
            for order in orders:
                if order in attributes:
                    ordered_attributes[order] = attributes[order]
                    del attributes[order]
            for attribute in attributes:
                ordered_attributes[attribute] = attributes[attribute]
            attributes = ordered_attributes
        layer_fid = None
        if fid is not None and layer_id is not None:
            layer_fid = str(layer_id) + '_' + str(fid)

        return {'type': 'Feature',
                'geometry': geometry,
                'fid': layer_fid,
                'attributes': attributes}

    def to_featureinfo(self, features, layer, template, ordered,
                       has_profile=False, remote_template=False):

        return {"remote_template": remote_template,
                "template": template,
                "layer": layer,
                "ordered": ordered,
                "features": features,
                "has_profile": has_profile}

    def get_lux_feature_definition(self, layers):
        luxgetfeaturedefinitions = []
        try:
            if layers is not None:
                for layer in layers.split(','):
                    cur_layer = DBSession.query(Layer).filter(
                        Layer.id == layer).first()
                    if cur_layer is None:
                        continue

                    if not cur_layer.public:
                        if self.request.user is None:
                            continue
                        # Check if the layer has a resctriction area
                        restriction = DBSession.query(RestrictionArea).filter(
                            RestrictionArea.roles.any(
                                Role.id == self.request.user.role.id)).filter(
                            RestrictionArea.layers.any(
                                Layer.id == layer
                            )
                            ).first()
                        # If not restriction is set then check next layer
                        if restriction is None or not restriction.readwrite:
                            continue
                    query = DBSession.query(
                        LuxGetfeatureDefinition).filter(
                            LuxGetfeatureDefinition.layer == layer
                        )
                    if self.request.user is not None:
                        if query.filter(
                                LuxGetfeatureDefinition.role ==
                                self.request.user.role.id
                                ).count() > 0:
                            for res in query.filter(
                                LuxGetfeatureDefinition.role ==
                                    self.request.user.role.id).all():
                                luxgetfeaturedefinitions.append(res)
                        else:
                            for res in query.filter(
                                LuxGetfeatureDefinition.role == None
                                    ).all():  # noqa
                                luxgetfeaturedefinitions.append(res)
                    else:
                        for res in query.filter(
                            LuxGetfeatureDefinition.role == None
                                ).all():  # noqa
                            luxgetfeaturedefinitions.append(res)
        except Exception as e:
            log.exception(e)
            return HTTPBadRequest()
        return luxgetfeaturedefinitions

    def remove_attributes(self, attributes, attributes_to_remove,
                          geometry_column='geom'):
        elements = []
        if not (attributes_to_remove is None or
                len(attributes_to_remove) == 0):
            elements = re.split(r'(?<!\\),', attributes_to_remove)

        elements.extend([geometry_column, 'st_asgeojson'])
        for element in elements:
            try:
                del attributes[element.replace("\\,", ",")]
            except:
                pass
        return attributes

    def add_area_field(self, features):
        for feature in features:
            s = asShape(feature['geometry'])
            try:
                area = float(s.area)
                if area < 100:
                    area_string = "%s m²" % round(area, 2)
                elif area < 100000:
                    area_string = "%s ar" % round(area / 100, 2)
                else:
                    area_string = "%s ha" % round(area / 10000, 2)
                feature['attributes']['Superficie'] = area_string
            except:
                pass
        return features

    def add_length_field(self, features):
        for feature in features:
            s = asShape(feature['geometry'])
            try:
                length = float(s.length)
                if length < 1000:
                    length_string = "%s m" % round(length, 2)
                else:
                    length_string = "%s km" % round(length / 1000, 2)
                feature['attributes']['formatted_length'] = length_string
            except:
                pass
        return features

    def add_proxy(self, features, field):
        for feature in features:
            feature['attributes']['__proxy__'] = field
        return features

    def replace_resource_by_html_link(self, features, attributes_to_remove):
        modified_features = []

        for feature in features:
            for key in feature['attributes']:
                value = feature['attributes'][key]
                if value is not None:
                    if 'hyperlin' in key.lower():
                        feature['attributes'][key] =\
                            "<a href='%s' target='_blank'>%s</a>"\
                            % (value, value.rsplit("/", 1)[1])
                    if 'Fiche station' in key:
                        feature['attributes'][key] =\
                            "<a href='%s' target='_blank'>%s</a>"\
                            % (value, value.rsplit("/", 1)[1])
                    if 'Photo station' in key:
                        feature['attributes'][key] =\
                            "<img src='%s' width='300px'/>" % (value)

            modified_features.append(feature)
        return modified_features

    def get_percentage_for_uhd_field(self, features, field_to_use):
        output_features = []
        for feature in features:
            for key in feature['attributes']:
                value = feature['attributes'][key]
                if key == field_to_use:
                    feature["attributes"]["percentage"] = "%s" \
                        % str(value * 100) + "%"
                    del feature["attributes"][field_to_use]
                    break
            output_features.append(feature)
        return output_features

    def get_additional_info_for_ng95(self, layer_id, rows):
        features = []
        dirname = "/publication/CRAL_PDF"

        for row in rows:
            geometry = geojson_loads(row['st_asgeojson'])
            if 'id' in row:
                fid = row['id']
            else:
                fid = None
            feature = self.to_feature(layer_id, fid,
                                      geometry, dict(row), "")

            feature['attributes']['has_sketch'] = False
            nom_croq = feature['attributes']['nom_croq']
            if nom_croq is not None:
                sketch_filepath = dirname + "/" + nom_croq + ".pdf"
                f = None
                try:
                    f = open(sketch_filepath, 'r')
                except:
                    try:
                        sketch_filepath = dirname + "/" + nom_croq + ".PDF"
                        f = open(sketch_filepath, 'r')
                    except:
                        f = None
                if f is not None:
                    feature['attributes']['has_sketch'] = True
            features.append(feature)

        return features

    def get_info_from_pf(self, layer_id, rows, measurements=False):
        import geoportailv3.PF
        pf = geoportailv3.PF.PF()
        features = []
        for row in rows:
            geometry = geojson_loads(row['st_asgeojson'])
            if 'textstring' in row:
                fid = row['textstring']
            else:
                fid = None
            f = self.to_feature(layer_id, fid,
                                geometry, dict(row), "")

            attributes = f['attributes']
            attributes['PF'] = dict(pf.get_detail(
                attributes['code_commu'],
                attributes['code_secti'],
                int(attributes['num_cadast']),
                int(attributes['code_sup'])))

            if measurements:
                attributes['measurements'] = pf.get_measurement_list(
                    attributes['num_cadast'],
                    attributes['code_sup'],
                    attributes['code_secti'],
                    attributes['code_commu'],
                    self.request.user,
                    self.request.referer)

            features.append(f)

        return features

    def get_info_from_mymaps(self, layer_id, rows, attributes_to_remove):
        features = []
        ids = []
        for row in rows:
            category_id = row['category_id']
            if 'id' in row:
                fid = row['id']
            else:
                fid = None

            map_id = row['map_id']
            cur_id = str(map_id) + "--" + str(category_id)
            if cur_id not in ids:
                ids.append(cur_id)
                geometry = geojson_loads(row['st_asgeojson'])
                if geometry['type'] == "LineString" or\
                   geometry['type'] == "MultiLineString":
                    session = self._get_session("mymaps")
                    query = "select  ST_AsGeoJSON(ST_Collect (geometry)) as geometry\
                            , sum(ST_Length(geometry)) as length FROM\
                             public.feature_with_map_with_colors where\
                             category_id = %(category_id)d and map_id = '%(map_id)s'"\
                            % {'category_id': category_id, 'map_id': map_id}
                    res = session.execute(query)
                    for feature in res.fetchall():
                        geometry = geojson_loads(feature['geometry'])
                        attributes = dict(row)
                        attributes['length'] = round(feature['length'] / 1000,
                                                     2)
                        self.remove_attributes(attributes,
                                               attributes_to_remove,
                                               "geometry")
                        features.append(
                            self.to_feature(layer_id, fid,
                                            geometry,
                                            attributes, ""))
                else:
                    attributes = dict(row)
                    self.remove_attributes(attributes,
                                           attributes_to_remove,
                                           "geometry")
                    features.append(
                        self.to_feature(layer_id, fid,
                                        geometry, attributes, ""))
        return features

    def _get_external_data(self, layer_id, url, id_column='objectid',
                           bbox=None, featureid=None, cfg=None,
                           attributes_to_remove=None, columns_order=None):
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

        body = {'f': 'json',
                'geometry': '',
                'geometryType': '',
                'inSR': '2169',
                'outSR': '2169',
                'returnGeometry': 'true',
                'spatialRel': '',
                'text': '',
                'where': '',
                'outFields': '*',
                'objectIds': ''}
        if id_column is None:
            id_column = 'objectid'
        if featureid is not None:
            if id_column == 'objectid':
                body['objectIds'] = featureid
            else:
                body['where'] = id_column + ' = \'' + featureid + '\''
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
        except Exception as e:
            log.exception(e)
            return []

        features = []
        try:
            esricoll = geojson_loads(content)
        except:
            raise
        if 'fields' in esricoll:
            fields = esricoll['fields']
        else:
            fields = []
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
                        if len(rawfeature['geometry']['rings']) == 1:
                            geometry = {'type': 'Polygon',
                                        'coordinates':
                                            rawfeature['geometry']['rings']}
                        else:
                            coordinates = []
                            curpolygon = []
                            for ring in rawfeature['geometry']['rings']:
                                if not LinearRing(ring).is_ccw:
                                    if len(curpolygon) > 0:
                                        coordinates.append(curpolygon)
                                        curpolygon = []
                                curpolygon.append(ring)

                            if len(curpolygon) > 0:
                                coordinates.append(curpolygon)

                            geometry = {'type': 'MultiPolygon',
                                        'coordinates': coordinates}

                if geometry != '':
                    alias = {}
                    if id_column in rawfeature['attributes']:
                        fid = rawfeature['attributes'][id_column]
                    else:
                        fid = None
                    for attribute in rawfeature['attributes']:
                        for field in fields:
                            if (field['name'] == attribute and
                                field['alias'] is not None and
                                    len(field['alias']) > 0):
                                alias[field['alias']] = field['name']
                                break
                    for key, value in alias.items():
                        rawfeature['attributes'][key] =\
                            rawfeature['attributes'].pop(value)

                    f = self.to_feature(layer_id, fid,
                                        geometry,
                                        rawfeature['attributes'],
                                        attributes_to_remove,
                                        columns_order)
                    features.append(f)
        return features

    def _get_session(self, engine_name):
        if engine_name not in Sessions:
            engine = sqlahelper.get_engine(engine_name)
            Sessions[engine_name] =\
                scoped_session(sessionmaker(bind=engine, autocommit=True))
        return Sessions[engine_name]
