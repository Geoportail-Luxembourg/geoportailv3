# -*- coding: utf-8 -*-
import logging
import re

import urllib.request
import datetime
import pyproj
import geojson
import os
import json
import pytz
import dateutil
import copy
from urllib.parse import urlencode
from pyramid.renderers import render
from pyramid.view import view_config
from geoportailv3_geoportal.models import LuxGetfeatureDefinition
from geoportailv3_geoportal.models import LuxLayerInternalWMS, LuxDownloadUrl
from mako.template import Template
from pyramid.httpexceptions import HTTPBadRequest, HTTPBadGateway
from pyramid.i18n import get_localizer, TranslationStringFactory
from pyramid.response import Response
from pkg_resources import resource_filename
from os.path import isfile
from geojson import loads as geojson_loads
from shapely.geometry import asShape, box
from shapely.geometry.polygon import LinearRing
from c2cgeoportal_commons.models import DBSession, DBSessions
from c2cgeoportal_commons.models.main import RestrictionArea, Role, Layer, Metadata
from shapely.geometry import MultiLineString, mapping, shape
from shapely.ops import transform
from shapely.wkt import loads as wkt_loads
from functools import partial
from arcgis2geojson import arcgis2geojson
from geoportailv3_geoportal.lib.esri_authentication import ESRITokenException
from geoportailv3_geoportal.lib.esri_authentication import get_arcgis_token, read_request_with_token
from geoportailv3_geoportal.views.download import Download
log = logging.getLogger(__name__)


class Getfeatureinfo(object):

    def __init__(self, request):
        self.request = request
        self.content_count = 0
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
            id_attribute = self.request.params.get('id_attribute', luxgetfeaturedefinition.id_column)
            features = self._get_external_data(
                luxgetfeaturedefinition.layer,
                luxgetfeaturedefinition.rest_url,
                id_attribute,
                None, fid, None,
                luxgetfeaturedefinition.attributes_to_remove,
                luxgetfeaturedefinition.columns_order,
                use_auth=luxgetfeaturedefinition.use_auth)
            if attribute not in features[0]['attributes']:
                return HTTPBadRequest("Bad attribute")
            url = features[0]['attributes'][attribute]

        if (url is None or not url.lower().startswith("http")):
            return HTTPBadRequest("Attribute is not a valid url")
        timeout = 15
        try:
            f = urllib.request.urlopen(url, None, timeout)
            data = f.read()
        except:
            try:
                # Retry to get the result
                f = urllib.request.urlopen(url, None, timeout)
                data = f.read()
            except Exception as e:
                log.exception(e)
                log.error(url)
                return HTTPBadGateway("Unable to access the remote url")

        headers = {"Content-Type": f.info()['Content-Type']}

        return Response(data, headers=headers)

    @view_config(route_name='download_pdf')
    def download_pdf_arcgis(self):
        fid = self.request.params.get('fid', None)
        if fid is None:
            return HTTPBadRequest("Request paramaters are missing")
        layers, id = fid.split('_', 1)
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
                sketch_id = self.request.params.get('sketch_id', None)
                timeout = 15
                url = luxgetfeaturedefinition.rest_url
                log.error(url)
                url = url.replace('/query?', '/')
                url = url.replace('/query', '/')
                if luxgetfeaturedefinition.use_auth:
                    auth_token = get_arcgis_token(self.request, log)
                    url1 = url + "%(id)s/attachments?f=pjson%(token)s" %{'id': id, 'token':('&token='+auth_token['token'])}
                else:
                    url1 = url + "%(id)s/attachments?f=pjson" %{'id': id}
                log.error(url1)
                pdf_id = None
                pdf_name = None
                try:
                    url_request = urllib.request.Request(url1)
                    result = read_request_with_token(url_request, self.request, log)
                    data = result.data
                    attachmentInfos = json.loads(data)["attachmentInfos"]
                    for info in attachmentInfos:
                        contentType = info["contentType"]
                        if info["contentType"] == "application/pdf" or\
                            info["contentType"] == "pdf":
                            pdf_id = info["id"]
                            pdf_name = info["name"]
                            if ".pdf" not in pdf_name:
                                pdf_name = pdf_name + ".pdf"
                        else:
                            pdf_id = info["id"]
                            pdf_name = info["name"]
                        if sketch_id is not None and str(info["id"]) == str(sketch_id):
                            break
                except Exception as e:
                    log.exception(e)
                    return HTTPBadRequest()
                if pdf_name is None or pdf_id is None:
                    return HTTPBadRequest()
                if luxgetfeaturedefinition.use_auth:
                    auth_token = get_arcgis_token(self.request, log)
                    url2 = url + "%(id)s/attachments/%(pdf_id)s%(token)s" %{'id': id, 'pdf_id': pdf_id, 'token':('?token='+auth_token['token'])}
                else:
                    url2 = url + "%(id)s/attachments/%(pdf_id)s" %{'id': id, 'pdf_id': pdf_id}

                try:
                    log.error(url2)
                    url_request = urllib.request.Request(url2)
                    result = read_request_with_token(url_request, self.request, log)
                    data = result.data
                except Exception as e:
                    log.exception(e)
                    log.error(url2)
                    return HTTPBadRequest()

                headers = {"Content-Type": "application/pdf",
                           "Content-Disposition": "attachment; filename=\"%(pdf_name)s\"" %{'pdf_name': pdf_name}}

                return Response(data, headers=headers)
        return HTTPBadGateway("Unable to access the remote url")

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
            f = urllib.request.urlopen(luxgetfeaturedefinitions[0].template, None, 15)
            return Response(f.read())

        return HTTPBadRequest()

    # Get the tooltip template from the poi manager database
    # and replace each poi placeholder by the angular notation
    @view_config(route_name='getpoitemplate')
    def get_poi_template(self):
        render_type = self.request.params.get('render', 'mapv3')
        layer = self.request.params.get('layer', None)
        if layer is None:
            return HTTPBadRequest()

        luxgetfeaturedefinitions = self.get_lux_feature_definition(layer, True)
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

        query = "SELECT mapv3_html, text1 FROM public.tooltips WHERE \
                id_collection=%d AND is_default=true"\
                % (luxgetfeaturedefinitions[0].poi_id_collection)

        res = session.execute(query)
        for row in res.fetchall():
            tooltip = row['mapv3_html']
            if tooltip is None or len(tooltip) == 0:
                tooltip = row['text1']

            content = tooltip.replace("$%7B", "${").\
                replace("%7D", "}")
            for field in poi_fields:
                sep = "{{"
                end_sep = "}}"
                if render_type == 'apiv4':
                    sep = "${"
                    end_sep = "}"
                content = content.replace(
                    "${%(field)s}" % ({'field': field}),
                    (sep + "feature['attributes']['%(field)s']" + end_sep)
                    % ({'field': field}))
            if render_type != 'apiv4':
                response = "<h1>{{layers['layerLabel'] | translate}}</h1>\
                           <div class=\"poi-feature\"\
                           ng-repeat=\"feature in layers['features']\">%s\
                           </div>" % (content)
            else:
                response = content
            return Response(response)
        return HTTPBadRequest()

    def unescape_html(self, features, key):
        from html.parser import HTMLParser
        h = HTMLParser()
        modified_features = []

        for feature in features:
            value = feature['attributes'][key]
            if value is not None:
                feature['attributes'][key] = h.unescape(value)

            modified_features.append(feature)
        return modified_features

    @view_config(route_name='getfeatureinfo', renderer='json')
    def get_feature_info(self):
        results = []
        zoom = self.request.params.get('zoom', None)
        fid = self.request.params.get('fid', None)
        fids = self.request.params.get('fids', None)
        query_limit = int(self.request.params.get('max_features', '20'))
        fids_array = []
        if fids is not None:
            fids_array = fids.split(',')

        if fid is not None or len(fids_array) > 0:
            if fid is not None:
                fids_array.append(fid)
            for fid in fids_array:
                layers, fid = fid.split('_', 1)
                if layers is None or fid is None:
                    return HTTPBadRequest()
                self.get_info(fid, None, None, results, layers, None, None, zoom, query_limit)
            return results

        layers = self.request.params.get('layers', None)
        if layers is None:
            return HTTPBadRequest("missing layers parameter")
        if not all(x.isdigit() for x in layers.split(',')):
            return HTTPBadRequest("layers parameter should be a number")

        big_box = self.request.params.get('box1', None)
        small_box = self.request.params.get('box2', None)
        geometry = self.request.params.get('geometry', None)
        geometry_type = self.request.params.get('geometry_type', 'wkt')
        if geometry_type.lower() != 'wkt':
            geometry = shape(geojson_loads(geometry)).wkt

        if geometry is not None and len(geometry) > 0:
            fc = self.get_info(
                fid, None,
                None, results, layers, None, geometry, zoom, query_limit)
            if len(fc) > 0 and 'features' in fc[0]:
                s = shape(wkt_loads(geometry))
                for feature in fc[0]['features']:
                    feature['stats'] = {}
                    try:
                        s2 = asShape(feature['geometry'])
                        feature['stats']['intersection_area'] = round(s.intersection(s2).area, 2)
                        feature['stats']['feature_area'] = round(s2.area, 2)
                        feature['stats']['filter_area'] = round(s.area, 2)
                    except Exception as e:
                        log.exception(e)
            return fc

        if big_box is None or small_box is None:
            return HTTPBadRequest("box1 or box2 are required")

        coordinates_big_box = big_box.split(',')
        if not all(x.replace('-', '', 1).replace('.', '', 1).isdigit() for x in coordinates_big_box):
            return HTTPBadRequest("Wrong box value :" + big_box)
        coordinates_small_box = small_box.split(',')
        if not all(x.replace('-', '', 1).replace('.', '', 1).isdigit() for x in coordinates_small_box):
            return HTTPBadRequest("Wrong box2 value : " + small_box)
        return self.get_info(
            fid, coordinates_big_box,
            coordinates_small_box, results, layers, big_box, None, zoom, query_limit)

    def is_zoom_ok(self, cur_zoom, zoom_definition):
        if cur_zoom is None or len(cur_zoom) == 0:
            return True
        if zoom_definition is None or len(zoom_definition) == 0:
            return True
        if "-" in zoom_definition:
            start, stop = zoom_definition.split("-")
            start, stop = int(start), int(stop)
            if start <= int(cur_zoom) <= stop:
                return True
            return False
        if ";" in zoom_definition:
            zooms = zoom_definition.split(";")
            for zoom in zooms:
                if int(cur_zoom) == int(zoom):
                    return True
        return False

    def get_info(self, fid, coordinates_big_box, coordinates_small_box,
                 results, layers, big_box, p_geometry=None, p_zoom=None, p_query_limit=20):
        rows_cnt = 0
        luxgetfeaturedefinitions = self.get_lux_feature_definition(layers)
        for luxgetfeaturedefinition in luxgetfeaturedefinitions:
            if not self.is_zoom_ok(p_zoom, luxgetfeaturedefinition.zoom_level):
                continue
            if (luxgetfeaturedefinition is not None):
                metadata = DBSession.query(Metadata).filter(Metadata.item_id == luxgetfeaturedefinition.layer).\
                    filter(Metadata.name == "return_clicked_point").first()
                if metadata is not None and metadata.value.lower() == 'true':
                    is_ordered = luxgetfeaturedefinition.columns_order is not None\
                        and len(luxgetfeaturedefinition.columns_order) > 0
                    box2 = self.request.params.get('box2', None)
                    coords = box2.split(',')
                    the_box = box(float(coords[0]), float(coords[1]),
                        float(coords[2]), float(coords[3]))
                    geometry = geojson_loads(geojson.dumps(mapping(the_box.centroid)))
                    f = self.to_feature(luxgetfeaturedefinition.layer, None,
                                        geometry,
                                        [],
                                        [],
                                        None)
                    results.append(
                        self.to_featureinfo(
                            [f],
                            luxgetfeaturedefinition.layer,
                            luxgetfeaturedefinition.template,
                            is_ordered,
                            luxgetfeaturedefinition.has_profile,
                            luxgetfeaturedefinition.remote_template,
                            1))
                    continue
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
                    if p_geometry is None:
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
                        query = query_point + " UNION ALL " + query_others
                    else:
                        geometry_srs = self.request.params.get('geometry_srs', '2169')
                        query = query_1 + "ST_Intersects(%(geom)s, ST_Transform('SRID=%(geometry_srs)s;%(geometry)s'::geometry,2169))"\
                            % {'geometry': p_geometry,
                               'geom': luxgetfeaturedefinition.geometry_column,
                               'geometry_srs': geometry_srs}
                    query_limit = p_query_limit
                    if luxgetfeaturedefinition.query_limit is not None:
                        query_limit = luxgetfeaturedefinition.query_limit
                    if query_limit > 0:
                        query = query + " LIMIT " + str(query_limit)
                else:
                    query_limit = 1
                    if luxgetfeaturedefinition.id_column is not None:
                        query = query_1 + luxgetfeaturedefinition.id_column +\
                            " = '" + fid + "'"
                    else:
                        query = query_1 + " id = '" + fid + "'"

                session = self._get_session(luxgetfeaturedefinition.engine_gfi)
                res = session.execute(query)
                rows = res.fetchall()
                try:
                    session = self._get_session(luxgetfeaturedefinition.engine_gfi)
                    query_cnt = "SELECT COUNT(*) FROM (" + query + ") as request"
                    query_cnt = query_cnt.replace("LIMIT " + str(query_limit), "" , 1)
                    res_cnt = session.execute(query_cnt)
                    rows_cnt = res_cnt.fetchall()[0][0]
                except Exception as e:
                    session.rollback()
                    log.exception(e)
                    log.error("ERROR COUNTING")

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
                                luxgetfeaturedefinition.remote_template,
                                rows_cnt))
                    else:
                        results.append(
                            self.to_featureinfo(
                                [],
                                luxgetfeaturedefinition.layer,
                                luxgetfeaturedefinition.template,
                                False,
                                luxgetfeaturedefinition.has_profile,
                                luxgetfeaturedefinition.remote_template,
                                rows_cnt))
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
                                    luxgetfeaturedefinition.remote_template,
                                    rows_cnt))
                        else:
                            results.append(
                                self.to_featureinfo(
                                    features,
                                    luxgetfeaturedefinition.layer,
                                    luxgetfeaturedefinition.template,
                                    is_ordered,
                                    luxgetfeaturedefinition.has_profile,
                                    luxgetfeaturedefinition.remote_template,
                                    rows_cnt))
                    else:
                        results.append(
                            self.to_featureinfo(
                                [],
                                luxgetfeaturedefinition.layer,
                                luxgetfeaturedefinition.template,
                                False,
                                luxgetfeaturedefinition.has_profile,
                                luxgetfeaturedefinition.remote_template,
                                rows_cnt))
            if (luxgetfeaturedefinition is not None and
                (luxgetfeaturedefinition.rest_url is None or
                    len(luxgetfeaturedefinition.rest_url) == 0) and
                (luxgetfeaturedefinition.query is None or
                    len(luxgetfeaturedefinition.query) == 0)):
                x = self.request.params.get('X', None)
                y = self.request.params.get('Y', None)
                width = self.request.params.get('WIDTH', None)
                height = self.request.params.get('HEIGHT', None)
                bbox = self.request.params.get('BBOX', None)
                if x is None or y is None or width is None or\
                   height is None or bbox is None:
                    return HTTPBadRequest()
                srs = self.request.params.get('srs', 'EPSG:2169')
                internal_wms = DBSession.query(LuxLayerInternalWMS).filter(
                    LuxLayerInternalWMS.id == luxgetfeaturedefinition.layer).\
                    first()
                url = internal_wms.url
                ogc_layers = internal_wms.layers

                features = self._ogc_getfeatureinfo(
                    url, x, y, width, height,
                    ogc_layers, bbox, srs, luxgetfeaturedefinition.layer,
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
                    results.append(
                        self.to_featureinfo(
                            features,
                            luxgetfeaturedefinition.layer,
                            luxgetfeaturedefinition.template,
                            is_ordered,
                            luxgetfeaturedefinition.has_profile,
                            luxgetfeaturedefinition.remote_template))
                else:
                    results.append(
                        self.to_featureinfo(
                            [],
                            luxgetfeaturedefinition.layer,
                            luxgetfeaturedefinition.template,
                            False,
                            luxgetfeaturedefinition.has_profile,
                            luxgetfeaturedefinition.remote_template))
            if (luxgetfeaturedefinition is not None and
                luxgetfeaturedefinition.rest_url is not None and
                    len(luxgetfeaturedefinition.rest_url) > 0):
                if fid is None:
                    if p_geometry is not None:
                        features = self._get_external_data(
                            luxgetfeaturedefinition.layer,
                            luxgetfeaturedefinition.rest_url,
                            luxgetfeaturedefinition.id_column,
                            None, None, None, None,
                            luxgetfeaturedefinition.columns_order,
                            use_auth=luxgetfeaturedefinition.use_auth,
                            p_geometry=p_geometry, srs_geometry=self.request.params.get('srs', self.request.params.get('geometry_srs', '2169')))
                    else :
                        features = self._get_external_data(
                            luxgetfeaturedefinition.layer,
                            luxgetfeaturedefinition.rest_url,
                            luxgetfeaturedefinition.id_column,
                            big_box, None, None, None,
                            luxgetfeaturedefinition.columns_order,
                            use_auth=luxgetfeaturedefinition.use_auth)
                else:
                    features = self._get_external_data(
                        luxgetfeaturedefinition.layer,
                        luxgetfeaturedefinition.rest_url,
                        luxgetfeaturedefinition.id_column,
                        None, fid, None, None,
                        luxgetfeaturedefinition.columns_order,
                        use_auth=luxgetfeaturedefinition.use_auth)

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
                    features = self.remove_attributes_from_features(features, luxgetfeaturedefinition.attributes_to_remove)
                    if fid is None:
                        results.append(
                            self.to_featureinfo(
                                self.remove_features_outside_tolerance(
                                    features, coordinates_small_box),
                                luxgetfeaturedefinition.layer,
                                luxgetfeaturedefinition.template,
                                is_ordered,
                                luxgetfeaturedefinition.has_profile,
                                luxgetfeaturedefinition.remote_template,
                                self.content_count))
                    else:
                        results.append(
                            self.to_featureinfo(
                                features,
                                luxgetfeaturedefinition.layer,
                                luxgetfeaturedefinition.template,
                                is_ordered,
                                luxgetfeaturedefinition.has_profile,
                                luxgetfeaturedefinition.remote_template,
                                self.content_count))
                else:
                    results.append(
                        self.to_featureinfo(
                            [],
                            luxgetfeaturedefinition.layer,
                            luxgetfeaturedefinition.template,
                            False,
                            luxgetfeaturedefinition.has_profile,
                            luxgetfeaturedefinition.remote_template,
                            self.content_count))

        if self.request.params.get('tooltip', None) is not None:
            path = 'templates/tooltip/'
            localizer = self.request.localizer
            server = TranslationStringFactory("geoportailv3_geoportal-server")
            tooltips = TranslationStringFactory("geoportailv3_geoportal-tooltips")
            client = TranslationStringFactory("geoportailv3_geoportal-client")
            info_format = self.request.params.get('INFO_FORMAT', self.request.params.get('info_format', 'text/html'))
            for r in results:
                l_template = r['template']
                filename = resource_filename('geoportailv3_geoportal', path + l_template)
                template = l_template if isfile(filename) else 'default.html'
                features = r['features']
                context = {
                    "_s": lambda s: localizer.translate(server(s)),
                    "_t": lambda s: localizer.translate(tooltips(s)),
                    "_c": lambda s: localizer.translate(client(s)),
                    "features": features}
                if r['remote_template'] is not None and\
                   r['remote_template']:
                    data = ""
                    try:
                        DBSession.rollback()
                        url_remote = urllib.request.urlopen(
                            l_template + "&render=apiv4", None, 15)
                        data = url_remote.read()
                    except Exception as e:
                        log.exception(e)
                        log.error(l_template)
                        return HTTPBadGateway()
                    remote_template = Template(data.decode('utf-8'))
                    if "${features" in data.decode('utf-8'):
                        r['tooltip'] =\
                            remote_template.render(features=features)
                    else:
                        if len(features) > 0:
                            r['tooltip'] =\
                                remote_template.render(feature=features[0])
                        else:
                            r['tooltip'] = ''
                else:
                    if info_format == 'text/xml':
                        filename = resource_filename('geoportailv3_geoportal', path + 'xml_' + l_template)
                        template = 'xml_' + l_template if isfile(filename) else 'xml.html'
                        r['tooltip'] = render(
                            'geoportailv3_geoportal:' + path + template, context)
                    elif info_format == 'text/plain':
                        filename = resource_filename('geoportailv3_geoportal', path + 'text_' + l_template)
                        template = 'text_' + l_template if isfile(filename) else 'text.html'
                        r['tooltip'] = render(
                            'geoportailv3_geoportal:' + path + template, context)
                    else:
                        r['tooltip'] = render(
                            'geoportailv3_geoportal:' + path + template, context)

        return results

    def transform_(self, geometry, source, dest):
        project = partial(
            pyproj.transform,
            pyproj.Proj(init=source), # source coordinate system
            pyproj.Proj(init=dest)) # destination coordinate system

        return transform(project, shape(geometry))  # apply projection

    def pixels2meter (self, width, height, bbox, epsg_source, epsg_dest, pixels):
        box3857 = bbox.split(',')
        the_box = box(float(box3857[0]), float(box3857[1]), float(box3857[2]), float(box3857[3]))

        box2169 = shape(self.transform_(the_box, epsg_source, epsg_dest)).bounds
        if (box2169[2] - box2169[0]) > 0:
            scale_x = (box2169[2] - box2169[0]) / width
        else :
            scale_x = (box2169[0] - box2169[2]) / width
        if (box2169[3] - box2169[1]) > 0:
            scale_y = (box2169[3] - box2169[1]) / height
        else :
            scale_y = (box2169[1] - box2169[3]) / height

        return [scale_x * pixels[0], scale_y * pixels[1]]

    def pixel2meter (self, width, height, bbox, epsg_source, epsg_dest, pixels):
        box3857 = bbox.split(',')
        the_box = box(float(box3857[0]), float(box3857[1]), float(box3857[2]), float(box3857[3]))

        box2169 = shape(self.transform_(the_box, epsg_source, epsg_dest)).bounds
        if (box2169[2] - box2169[0]) > 0:
            scale_x = (box2169[2] - box2169[0]) / width
        else :
            scale_x = (box2169[0] - box2169[2]) / width

        return scale_x * pixels

    def remove_features_outside_tolerance(self, features, coords):
        if coords is None:
            return features
        features_to_keep = []

        the_box = box(float(coords[0]), float(coords[1]),
                      float(coords[2]), float(coords[3]))
        for feature in features:
            s = asShape(feature['geometry'])
            try:
                if s.area > 0:
                    if the_box.intersects(s):
                        features_to_keep.append(feature)
                else:
                    width = self.request.params.get('WIDTH', None)
                    height = self.request.params.get('HEIGHT', None)
                    bbox = self.request.params.get('BBOX', None)
                    if width is None or height is None or bbox is None:
                        features_to_keep.append(feature)
                    else:
                        buffer = self.pixel2meter(float(width), float(height), bbox, "epsg:3857", "epsg:2169", 10)
                        if the_box.intersects(s.buffer(buffer, 1)):
                            features_to_keep.append(feature)
            except:
                features_to_keep.append(feature)
        return features_to_keep

    def to_feature(self, layer_id, fid, geometry, attributes,
                   attributes_to_remove, columns_order=None,
                   geometry_column='geom', alias={}):
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
                'id': fid,
                'attributes': attributes,
                'alias': alias}

    def to_featureinfo(self, features, layer, template, ordered,
                       has_profile=False, remote_template=False, total_count=0):
        if total_count == 0:
            total_count = len(features)
        return {"remote_template": remote_template,
                "template": template,
                "layer": layer,
                "ordered": ordered,
                "features": features,
                "has_profile": has_profile,
                "total_features_count": total_count,
                "features_count": len(features)}

    def get_lux_feature_definition(self, layers, bypass_public=False):
        luxgetfeaturedefinitions = []
        try:
            if layers is not None:
                for layer in layers.split(','):
                    cur_layer = DBSession.query(Layer).filter(
                        Layer.id == layer).first()
                    if cur_layer is None:
                        continue
                    if not bypass_public and not cur_layer.public:
                        if self.request.user is None:
                            continue
                        # Check if the layer has a resctriction area
                        restriction = DBSession.query(RestrictionArea).filter(
                            RestrictionArea.roles.any(
                                Role.id == self.request.user.settings_role.id)).filter(
                            RestrictionArea.layers.any(
                                Layer.id == layer
                            )
                            ).first()
                        # If not restriction is set then check next layer
                        if restriction is None:
                            continue

                    query = DBSession.query(
                        LuxGetfeatureDefinition).filter(
                            LuxGetfeatureDefinition.layer == layer
                        )
                    if self.request.user is not None:
                        if query.filter(
                                LuxGetfeatureDefinition.role ==
                                self.request.user.settings_role.id
                                ).count() > 0:
                            for res in query.filter(
                                LuxGetfeatureDefinition.role ==
                                    self.request.user.settings_role.id).all():
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
            return []
            return HTTPBadRequest()
        return luxgetfeaturedefinitions

    def remove_attributes_from_features(self, features, attributes_to_remove):
        for feature in features:
            feature['attributes'] = self.remove_attributes(feature['attributes'], attributes_to_remove)
        return features

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

    def replace_url_by_proxy(self, features, attributes):
        modified_features = []
        proxy_url = self.request.route_url('download')
        for feature in features:
            for key in attributes:
                if 'attributes' in feature:
                    if key in feature['attributes']:
                        value = feature['attributes'][key]
                        entries = DBSession.query(LuxDownloadUrl).all()
                        for entry in entries:
                            if value is not None and entry.url in value:
                                feature['attributes'][key] =\
                                    proxy_url + "?id=" + str(entry.id) +\
                                    "&filename=" + value.split(entry.url)[1]
                                break
                else:
                    value = feature[key]
                    entries = DBSession.query(LuxDownloadUrl).all()
                    for entry in entries:
                        if value is not None and entry.url in value:
                            feature[key] =\
                                proxy_url + "?id=" + str(entry.id) +\
                                "&filename=" + value.split(entry.url)[1]
                            break
            modified_features.append(feature)
        return modified_features

    def format_percentage(self, features, attributes="couverture en VHCN", format="{0:.0%}"):
        modified_features = []
        if type(attributes) != type([]):
            attributes = [attributes]
        for feature in features:
            try:
                for attribute in attributes:
                    if attribute in feature['attributes']:
                        value = feature['attributes'][attribute]
                        if value is not None:
                            feature['attributes'][attribute] =\
                                "{0:.0%}".format(float(feature['attributes'][attribute]))
            except Exception as e:
                log.exception(e)
            modified_features.append(feature)
        return modified_features

    def format_date(self, features, attributes="date_time", format="%Y-%m-%d %H:%M:%S"):
        modified_features = []
        if type(attributes) != type([]):
            attributes = [attributes]
        for feature in features:
            try:
                for attribute in attributes:
                    if attribute in feature['attributes']:
                        value = feature['attributes'][attribute]
                        if value is not None:
                            lux_tz = pytz.timezone("Europe/Luxembourg")
                            UTC_datetime_timestamp = float(dateutil.parser.isoparse(value).strftime("%s"))
                            utc_dt = datetime.datetime.fromtimestamp(UTC_datetime_timestamp, tz=pytz.utc)
                            local_time = lux_tz.normalize(utc_dt)
                            feature['attributes'][attribute] =\
                                local_time.strftime(format)
            except Exception as e:
                log.exception(e)
            modified_features.append(feature)
        return modified_features

    def format_esridate(self, features, attributes="date_time", format="%Y-%m-%d %H:%M:%S", use_local_time=True, delta_hours=0):
        modified_features = []
        if type(attributes) != type([]):
            attributes = [attributes]
        for feature in features:
            try:
                for attribute in attributes:
                    if attribute in feature['attributes']:
                        value = feature['attributes'][attribute]
                        if value is not None:
                                utc_dt = datetime.datetime.fromtimestamp(int(value)/1000.0, tz=pytz.utc)
                                if use_local_time:
                                    hours_added = datetime. timedelta(hours = delta_hours)
                                    dt = utc_dt + hours_added
                                    lux_tz = pytz.timezone("Europe/Luxembourg")
                                    local_time = lux_tz.normalize(utc_dt)
                                    feature['attributes'][attribute] =\
                                        local_time.strftime(format)
                                else:
                                    utc_dt = datetime.datetime.fromtimestamp(int(value)/1000.0)
                                    hours_added = datetime. timedelta(hours = delta_hours)
                                    dt = utc_dt + hours_added
                                    feature['attributes'][attribute] =\
                                        dt.strftime(format)
 
            except Exception as e:
                log.exception(e)
            modified_features.append(feature)
        return modified_features

    def replace_resource_by_html_link(self, features, attributes_to_remove):
        modified_features = []

        for feature in features:
            for key in feature['attributes']:
                value = feature['attributes'][key]
                if value is not None:
                    if 'hyperlinks_graph' in key.lower():
                        feature['attributes'][key] =\
                            "<iframe width='260 px' src='%s'></iframe>"\
                            % (value)
                    elif 'hyperlin' in key.lower() or 'Fiche station' in key:
                        splitted_value = value.rsplit("/", 1)
                        feature['attributes'][key] =\
                            f"<a href='{value}' target='_blank'>{splitted_value[1] if len(splitted_value)>1 else splitted_value[0]}</a>"
                    elif 'Photo station' in key:
                        feature['attributes'][key] =\
                            "<img src='%s' width='300px'/>" % (value)

            modified_features.append(feature)
        return modified_features

    def get_percentage_for_uhd_field(self, features, field_to_use):
        output_features = []
        for feature in features:
            for key in feature['attributes']:
                value = feature['attributes'][key]
                if value is not None and key == field_to_use:
                    feature["attributes"]["percentage"] = "%s" \
                        % str(value * 100) + "%"
                    del feature["attributes"][field_to_use]
                    break
            output_features.append(feature)
        return output_features

    def get_commune_from_code(self, features, key_commune, key_section):
        output_features = []
        for feature in features:
            code_commune = feature['attributes'][key_commune]
            code_section = feature['attributes'][key_section]
            session = self._get_session("ecadastre")
            res = session.execute(
                "select section, commune0 from diffdata.comm where " +
                "commune::INTEGER  = %s and section0 = '%s'"
                % (code_commune, code_section))
            rows = res.fetchall()
            if len(rows) > 0:
                feature['attributes'][key_commune] = rows[0][1]
                feature['attributes'][key_section] = \
                    '%s (%s)' % (rows[0][0], code_section)
                output_features.append(feature)
        return output_features

    def get_commune_from_shortname(self, features, key_commune, key_section):
        output_features = []
        for feature in features:
            code_commune = feature['attributes'][key_commune]
            code_section = feature['attributes'][key_section]
            session = self._get_session("ecadastre")
            res = session.execute(
                "select section, commune0 from diffdata.comm where " +
                "substring(star,1,4)  = '%s' and section0 = '%s'"
                % (code_commune, code_section))
            rows = res.fetchall()
            if len(rows) > 0:
                feature['attributes'][key_commune] = rows[0][1]
                feature['attributes'][key_section] = \
                    '%s (%s)' % (rows[0][0], code_section)
                output_features.append(feature)
        return output_features

    def get_additional_pdf(self, features, url, id_attr = 'OBJECTID'):
        features2 = []
        timeout = 15
        for feature in features:
            feature['attributes']['has_sketch'] = False
            id = feature['attributes'][id_attr]
            url1 = url.replace('/query?', '/query').replace('/query', f'/{id}/attachments?f=pjson')

            try:
                url_request = urllib.request.Request(url1)
                result = read_request_with_token(url_request, self.request, log)
                data = result.data
                data_json = json.loads(data)
                if "attachmentGroups" in data_json:
                    for group in data_json["attachmentGroups"]:
                        if "attachmentInfos" in group:
                            self.get_attachment_infos(feature, group)
                if "attachmentInfos" in data_json:
                    self.get_attachment_infos(feature, data_json)

            except Exception as e:
                log.exception(e)
                feature['attributes']['has_sketch'] = False
            features2.append(feature)
        return features2

    def get_attachment_infos(self, feature, data_json):
            attachmentInfos = data_json["attachmentInfos"]
            feature['attributes']['sketches'] = []
            for info in attachmentInfos:
                feature['attributes']['has_sketch'] = True
                feature['attributes']['sketches'].append({'id':info['id'], 'name':info['name']})

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

    def chargy_attributes(self, features):
        modified_features = []
        for feature in features:
            if 'attributes' in feature and \
               'chargingdevice' in feature['attributes']:
                chargingdevice = json.loads(feature['attributes']['chargingdevice'].replace("&quot;", "\""))
                del feature['attributes']['chargingdevice']
                for connector in chargingdevice['connectors']:
                    feature['attributes']['connector_name'] = connector['name']
                    feature['attributes']['connector_maxchspeed'] = connector['maxchspeed']
                    feature['attributes']['connector_description'] = connector['description']
                    modified_features.append(copy.deepcopy(feature))
        return modified_features

    def get_info_from_pf(self, layer_id, rows, measurements=True,
                         attributes_to_remove=""):
        DBSession.rollback()
        features = []
        for row in rows:
            geometry = geojson_loads(row['st_asgeojson'])
            if 'textstring' in row:
                fid = row['textstring']
            else:
                fid = None
            f = self.to_feature(layer_id, fid,
                                geometry, dict(row), attributes_to_remove)
            attributes = f['attributes']

            base_url = os.environ["API-ARCHIMET-URL"]
            api_key = os.environ["API-ARCHIMET-KEY"]
            url = f"{base_url}/parcelles/pf/{fid}"
            hdr = {'api-key': api_key}
            try:
                req = urllib.request.Request(url, headers=hdr)
                response = urllib.request.urlopen(req)
                attributes['PF'] = dict(json.loads(response.read()))
            except Exception as e:
                log.exception(e)
                log.error(url)

            if measurements:
                try:
                    attributes['measurements'] = []
                    url = f"{base_url}/document/from-parcel-ids/?parcel_ids={fid}&include_descendants=false"
                    req = urllib.request.Request(url, headers=hdr)
                    response = urllib.request.urlopen(req)
                    info = json.loads(response.read())
                    dossiers = {}
                    for mesurage_num in info[fid].keys():
                        documents = info[fid][mesurage_num]['documents']
                        if len(documents) > 0:
                            for document in documents:
                                cur_measurement = {}
                                cur_measurement['measurementNumber'] = mesurage_num
                                cur_measurement['parcelId'] = fid
                                cur_measurement['measurementType'] = document['document_type']['name']
                                cur_measurement['date_document'] = document['date_document']
                                cur_measurement['description'] = document['document_type']['name']
                                cur_measurement['dossier_id'] = document['dossier_id']
                                cur_measurement['document_id'] = document['id']
                                if self.request.user is None:
                                    cur_measurement['is_downloadable'] = False
                                else:
                                    if cur_measurement['dossier_id'] not in dossiers:
                                        url = f"{base_url}/dossiers/{cur_measurement['dossier_id']}/"
                                        req = urllib.request.Request(url, headers=hdr)
                                        response = urllib.request.urlopen(req)
                                        cur_dossier = json.loads(response.read())
                                        dossiers[cur_measurement['dossier_id']] = cur_dossier
                                    else:
                                        cur_dossier = dossiers[cur_measurement['dossier_id']]
                                    cur_measurement['is_downloadable'] = \
                                        Download(self.request)._is_download_authorized(
                                        cur_dossier['commune_cadastrale']['directive_id'],
                                        self.request.user, self.request.referer)
                                if cur_measurement['is_downloadable']:
                                    if self.request.user.settings_role.id == 1:
                                        # if ACT Show everything
                                        attributes['measurements'].append(cur_measurement)
                                    elif document['document_type']['name'] in ('OTHER_PRIVATE') or \
                                       document['document_type']['directive_code_archivage'] in ('DAI', None):
                                        # do not show
                                        pass
                                    else:
                                        attributes['measurements'].append(cur_measurement)
                                elif document['document_type']['name'] in ('OTHER_PRIVATE', 'VERTICAL') or \
                                     document['document_type']['directive_code_archivage'] in ('DAI', 'DTC' , 'DAE', None):
                                        # If grand public
                                        # do not show
                                        pass
                                else:
                                    attributes['measurements'].append(cur_measurement)
                        else:
                            cur_measurement = {}
                            cur_measurement['measurementNumber'] = mesurage_num
                            cur_measurement['parcelId'] = fid
                            cur_measurement['document_id'] = None
                            cur_measurement['dossier_id'] = None
                            attributes['measurements'].append(cur_measurement)
                except Exception as e:
                    log.exception(e)
            features.append(f)

        return features

    def get_info_from_mymaps(self, layer_id, rows, attributes_to_remove, mymaps_engine='mymaps'):
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
                only_points = False
                if geometry['type'] == "Point":
                    session = self._get_session(mymaps_engine)
                    query = "select count(*) as cnt\
                            , sum(ST_Length(geometry)) as length FROM\
                             public.feature_with_map_with_colors where\
                             category_id = %(category_id)d and map_id = '%(map_id)s'\
                             and ST_GeometryType(geometry) != 'ST_Point'"\
                            % {'category_id': category_id, 'map_id': map_id}
                    res = session.execute(query).first()
                    only_points = (res['cnt'] == 0)

                if not only_points or\
                   geometry['type'] == "LineString" or\
                   geometry['type'] == "MultiLineString":
                    session = self._get_session(mymaps_engine)
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
                    if geometry['type'] == "Point":
                        if 'feature_name' in attributes:
                            attributes['name'] = attributes['feature_name']
                    self.remove_attributes(attributes,
                                           attributes_to_remove,
                                           "geometry")
                    features.append(
                        self.to_feature(layer_id, fid,
                                        geometry, attributes, ""))
        return features

    def _ogc_getfeatureinfo(
            self, url, x, y, width, height, layer, bbox, srs, layer_id,
            attributes_to_remove, columns_order):
        body = {
            'SERVICE': 'WMS',
            'VERSION': '1.1.1',
            'REQUEST': 'GetFeatureInfo',
            'QUERY_LAYERS': layer,
            'LAYERS': layer,
            'STYLES': '',
            'INFO_FORMAT': 'application/json',
            'FEATURE_COUNT': '50',
            'X': x,
            'Y': y,
            'SRS': srs,
            'WIDTH': width,
            'HEIGHT': height,
            'BBOX': bbox
        }
        metadata = DBSession.query(Metadata).filter(Metadata.item_id == layer_id).\
            filter(Metadata.name == "ogc_layers").first()
        if metadata is not None:
            body['LAYERS'] = metadata.value

        metadata = DBSession.query(Metadata).filter(Metadata.item_id == layer_id).\
            filter(Metadata.name == "ogc_query_layers").first()
        if metadata is not None:
            body['QUERY_LAYERS'] = metadata.value

        metadata = DBSession.query(Metadata).filter(Metadata.item_id == layer_id).\
            filter(Metadata.name == "ogc_info_format").first()
        if metadata is not None:
            body['INFO_FORMAT'] = metadata.value
        ogc_info_srs = "epsg:2169"
        metadata = DBSession.query(Metadata).filter(Metadata.item_id == layer_id).\
            filter(Metadata.name == "ogc_info_srs").first()
        if metadata is not None:
            ogc_info_srs = metadata.value
        metadata = DBSession.query(Metadata).filter(Metadata.item_id == layer_id).\
            filter(Metadata.name == "ogc_info_url").first()
        if metadata is not None:
            url = metadata.value

        separator = "?"
        if url.find(separator) > 0:
            separator = "&"
        query = '%s%s%s' % (url, separator, urlencode(body))
        content = ""
        try:
            DBSession.rollback()
            result = urllib.request.urlopen(query, None, 15)
            content = result.read()
        except Exception as e:
            log.exception(e)
            return []
        try:
            features = []
            # Some webservices return this bad content
            if content is not None and content == b"\n\n":
                return []
            ogc_features = geojson_loads(content)

            for feature in ogc_features['features']:
                geometry = feature['geometry']

                if geometry is not None and ogc_info_srs.lower() != "epsg:2169":
                    geometry = self.transform_(geometry, ogc_info_srs, "epsg:2169")
                if geometry is None:
                    box2 = self.request.params.get('box2', None)
                    coords = box2.split(',')
                    the_box = box(float(coords[0]), float(coords[1]),
                        float(coords[2]), float(coords[3]))
                    geometry = geojson_loads(geojson.dumps(mapping(the_box.centroid)))
                f = self.to_feature(layer_id, None,
                                    geometry,
                                    feature['properties'],
                                    attributes_to_remove,
                                    columns_order)
                features.append(f)
            return features
        except Exception as e:
            log.exception(e)
            log.error(content)
            log.error(query)
            return []
        return []

    def get_additional_external_data(
            self, features, geometry_name, layer_id, url, id_column,
            attributes_to_remove, columns_order, where_key, use_auth=False):
        groups = []
        modified_features = []
        for feature in features:
            if where_key in feature['attributes'] or\
                    ('alias' in feature and where_key in feature['alias']):
                if 'alias' in feature and where_key in feature['alias']:
                    where_clause = feature['alias'][where_key] + '=\'' +\
                        feature['attributes'][where_key] + '\''
                else:
                    where_clause = where_key + '=\'' +\
                        feature['attributes'][where_key] + '\''
                group = where_clause + where_key + url
                if group not in groups:
                    groups.append(group)
                    new_features = self._get_external_data(
                        layer_id, url, id_column, None, None, None,
                        attributes_to_remove, columns_order, where_clause, use_auth)
                    lines = []
                    for new_feature in new_features:
                        for line in shape(new_feature[geometry_name]):
                            lines.append(line)
                    multi_line = MultiLineString(lines)
                    feature[geometry_name] = mapping(multi_line)
                    modified_features.append(feature)
            else:
                modified_features.append(feature)
        return modified_features

    def _get_external_data(self, layer_id, url, id_column='objectid',
                           bbox=None, featureid=None, cfg=None,
                           attributes_to_remove=None, columns_order=None,
                           where_clause=None, use_auth=False, p_geometry=None, srs_geometry=None):
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
        splitted_url = url.split('f=geojson')
        url = splitted_url[0]
        if id_column is None:
            id_column = 'objectid'
 
        if use_auth:
            auth_token = get_arcgis_token(self.request, log)
            if 'token' in auth_token:
                body["token"] = auth_token['token']

        if featureid is not None:
            if id_column == 'objectid':
                body['objectIds'] = featureid
            else:
                if 'featuresByArcGISQuery' in url:
                    body = ""
                    url = url.replace('featuresByArcGISQuery', 'featuresByKeyValue')
                    if "?" in url:
                        url = url.replace("?","")
                    url = url + "/2169" + "/" + id_column + "/" + featureid + "/"
                else:
                    body['where'] = id_column + ' = \'' + featureid + '\''
        elif bbox is not None:
            body['geometry'] = bbox
            body['geometryType'] = 'esriGeometryEnvelope'
            body['spatialRel'] = 'esriSpatialRelIntersects'
        elif p_geometry is not None:
            s = shape(wkt_loads(p_geometry))
            if s.geom_type == 'LineString':
                coords = []
                for coord in list(s.coords):
                    coords.append('[%(x)s,%(y)s]' %{'x': coord[0], 'y': coord[1]})
                body['geometry'] = '{"paths" : [[' + ','.join(coords) + ']], "spatialReference" : {"wkid" : ' + srs_geometry + '}}'
                body['geometryType'] = 'esriGeometryPolyline'
            elif s.geom_type == 'Polygon':
                coords = []
                for coord in list(s.exterior.coords):
                    coords.append('[%(x)s,%(y)s]' %{'x': coord[0], 'y': coord[1]})
                body['geometry'] = '{"rings" : [[' + ','.join(coords) + ']], "spatialReference" : {"wkid" : ' + srs_geometry + '}}'
                body['geometryType'] = 'esriGeometryPolygon'
            elif s.geom_type == 'Point':
                coords = []
                for coord in list(s.coords):
                    body['geometry'] = '{"x" : %(x)s, "y": %(y)s, "spatialReference" : {"wkid" : %(srs_geometry)s}}'%{'x': coord[0], 'y': coord[1], 'srs_geometry': srs_geometry}
                body['geometryType'] = 'esriGeometryPoint'

            body['spatialRel'] = 'esriSpatialRelIntersects'
        elif where_clause is not None:
            body['where'] = where_clause
        else:
            return []

        if url.find("@") > -1:
            url = self._get_url_with_token(url)

        # construct url for get request
        separator = '?'
        if url.find(separator) > 0:
            separator = '&'
        query = '%s%s%s' % (url, separator, urlencode(body))
        try:
            log.error(query)
            url_request = urllib.request.Request(query)
            result = read_request_with_token(url_request, self.request, log)
            content = result.data
        except ESRITokenException as e:
            log.exception(e)
            log.error(url)
            content = "{}"
        except Exception as e:
            log.exception(e)
            log.error(url)
            content = "{}"

        contentgeojson = {'features': []}
        if len(splitted_url) > 1:
            bodygeojson = body
            bodygeojson['f'] = 'geojson'
            querygeojson = '%s%s%s' % (url, separator, urlencode(bodygeojson))
            try:
                url_request = urllib.request.Request(querygeojson)
                result = read_request_with_token(url_request, self.request, log)
                contentgeojson = json.loads(result.data)
            except Exception as e:
                log.exception(e)
                log.error(url)

        #Count
        self.content_count = 0
        if len(body) > 0:
            body['returnCountOnly'] = True
            query_count = '%s%s%s' % (url, separator, urlencode(body))
            try:
                url_request = urllib.request.Request(query_count)
                result = read_request_with_token(url_request, self.request, log)
                geojson_res = geojson_loads(result.data)
                self.content_count = 0
                if 'count' in geojson_res:
                    self.content_count = geojson_res['count']
            except ESRITokenException as e:
                log.exception(e)
                log.error(url)
                self.content_count = 0
            except Exception as e:
                log.exception(e)
                log.error(url)
                self.content_count = 0

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
            i = 0
            for rawfeature in esricoll['features']:
                geometry = ''
                if 'geometry' not in rawfeature:
                    box = bbox.split(',')
                    x1 = float(box[0])
                    y1 = float(box[1])
                    x2 = float(box[2])
                    y2 = float(box[3])
                    geometry = {'type': 'Polygon',
                                'coordinates': [[
                                    [x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]
                                ]]}
                else:
                    if len(contentgeojson['features']) > 0:
                        geojsonrawfeature = contentgeojson['features'][i]
                    else:
                        geojsonrawfeature = arcgis2geojson(rawfeature)
                    geometry = geojsonrawfeature['geometry']

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
                                        columns_order, 'geom', alias)
                    features.append(f)
                i = i + 1
        return features

    def _get_url_with_token(self, url):
        try:
            creds_re = re.compile('//(.*)@')
            creds = creds_re.findall(url)[0]
            user_password = creds.split(':')
            baseurl = url.replace(creds + '@', '')
            tokenurl = baseurl.split('rest/')[0] +\
                'tokens?username=%s&password=%s'\
                % (user_password[0], user_password[1])
            token = urllib.request.urlopen(tokenurl, None, 15).read()
            return baseurl + "token=" + token
        except Exception as e:
            log.exception(e)
        return None

    def _get_session(self, engine_name):
        return DBSessions[engine_name]

    def transform_(self, geometry, source, dest):
        project = partial(
            pyproj.transform,
            pyproj.Proj(init=source), # source coordinate system
            pyproj.Proj(init=dest)) # destination coordinate system

        g2 = transform(project, shape(geometry))  # apply projection

        return geojson_loads(geojson.dumps(mapping(g2)))

    @view_config(route_name='getbuswidget')
    def getbuswidget(self):
        lang = self.request.params.get('lang', 'fr')
        id = self.request.params.get('id', None)
        if id is None:
            return HTTPBadRequest("id not found")
        template = """<!DOCTYPE html>
<html>
<head>
  <!-- Das hafas-widget-core JavaScript lädt alle benötigten Ressourcen für die Anzeige der Widgets -->
  <script type="text/javascript" src="https://cdt.hafas.de/staticfiles/hafas-widget-core.1.0.0.js?language={lang}"></script>
</head>
<body>
<div id="myWidget_result" style="width:350px; transform-origin: left top; transform: scale(0.75);"
         data-hfs-widget="true"
         data-hfs-widget-sq="true"
         data-hfs-widget-sq-autorefresh="true"
         data-hfs-widget-sq-location="L={id}"
         data-hfs-widget-sq-maxjny="5"
></div>
</body>
</html>
        """.format(id=id, lang=lang)
        remote_template = Template(template)
        headers = {'Content-Type': 'text/html'}

        return Response(remote_template.render(), headers=headers)
