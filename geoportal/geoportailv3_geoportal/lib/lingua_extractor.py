import os
import re
import traceback
import sys
import urllib
from urllib.parse import urlencode
import httplib2
import json
import yaml
from geojson import loads as geojson_loads
from sqlalchemy.exc import NoSuchTableError, OperationalError, ProgrammingError
from lingua.extractors import Extractor, Message

from c2cgeoportal_geoportal import init_dbsessions
from c2cgeoportal_commons.config import config
from c2cgeoportal_geoportal.lib.bashcolor import RED, colorize

import logging
log = logging.getLogger(__name__)


class LuxembourgExtractor(Extractor):  # pragma: no cover
    """
    ESRI legend extractor
    """
    extensions = [".ini"]

    def __init__(self):
        super().__init__()
        log.info(f'entering into {self.__class__} lux extractor')
        if os.path.exists("geoportal/config.yaml"):
            config.init("geoportal/config.yaml")
            self.config = config.get_config()
        else:
            self.config = None
        if os.path.exists("project.yaml"):
            with open("project.yaml") as f:
                self.package = yaml.safe_load(f)
        else:
            self.package = None
        self.env = None
        self.messages = []
        self.fields = set()
        self.TIMEOUT = 15

    def __call__(self, filename, options, fileobj=None, lineno=0):
        print('Entering into %s extractor' % self.__class__)

        del fileobj, lineno

        try:
            # initialize DB connections in a way similar to c2cgeoportal_geoportal.lib.lingua_extractor
            settings = config.get_config()

            class R:
                settings = None

            class C:
                registry = R()

            config_ = C()
            config_.registry.settings = settings
            init_dbsessions(settings, config_)
            try:
                self._extract_messages()

            except ProgrammingError as e:
                print(
                    colorize(
                        "ERROR! The database is probably not up to date "
                        "(should be ignored when happen during the upgrade)",
                        RED,
                    )
                )
                print(colorize(e, RED))
                if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") != "TRUE":
                    raise

        except NoSuchTableError as e:
            print(
                colorize(
                    "ERROR! The schema didn't seem to exists "
                    "(should be ignored when happen during the deploy)",
                    RED,
                )
            )
            print(colorize(e, RED))
            if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") != "TRUE":
                raise
        except OperationalError as e:
            print(
                colorize(
                    "ERROR! The database didn't seem to exists "
                    "(should be ignored when happen during the deploy)",
                    RED,
                )
            )
            print(colorize(e, RED))
            if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") != "TRUE":
                raise

        return self.messages

        # return [Message(None, 'msgid', None, [], u'', u'', (filename, 1))]

    def _insert_attribute(self, attribute, location):
        if attribute not in self.fields:
            print(f'Adding attribute {attribute}')
            self.fields.add(attribute)
            self.messages.append(
                Message(
                    None,
                    u'%(name)s' % {'name': attribute},
                    None,
                    [],
                    "",
                    "",
                    location,
                )
            )

    # abstract prototype
    def _extract_messages(self, db_session):
        raise(Exception('not implemented'))


class LuxembourgESRILegendExtractor(LuxembourgExtractor):  # pragma: no cover
    """
    ESRI legend extractor
    """
    extensions = [".ini"]

    def _extract_messages(self):
        print('Entering into ESRI extractor')

        # import of DBSession must be done after call of init_dbsessions
        from c2cgeoportal_commons.models import DBSession  # pylint: disable=import-outside-toplevel
        from geoportailv3_geoportal.models import LuxLayerInternalWMS

        results = (DBSession.query(LuxLayerInternalWMS)
                   .filter(LuxLayerInternalWMS.rest_url.isnot(None)))
        print(f"{results.count} ESRI layers to parse")

        for result in results:
            self._load_result(result)

    def _load_result(self, result):
        data = None
        if result.rest_url is not None and len(result.rest_url) > 0:
            full_url = result.rest_url + '/legend?f=pjson'
            try:
                f = urllib.request.urlopen(httplib2.iri2uri(full_url), None, self.TIMEOUT)
                data = json.load(f)
            except Exception as e:
                log.error(full_url)
                log.exception(e)
        if data is not None:
            for l in data['layers']:
                if str(l['layerId']) in result.layers.split(','):
                    attribute = l['layerName']
                    self._insert_attribute(result.layer + ' : ' + attribute,
                                           ("ogc_server_id:%s URL:%s Layer"
                                            % (result.ogc_server_id, result.rest_url),
                                            result.layer),)
                    for leg in l['legend']:
                        attribute = leg['label']
                        self._insert_attribute(result.layer + ' / ' + l['layerName'] + ' : ' + attribute,
                                               ("ogc_server_id:%s Layer:%s Sublayer"
                                                % (result.ogc_server_id, result.layer),
                                                l['layerName']),)


class LuxembourgTooltipsExtractor(LuxembourgExtractor):  # pragma: no cover
    """
    Tooltip extractor
    """
    extensions = [".ini"]

    @staticmethod
    def _get_url_with_token(url):
        try:
            creds_re = re.compile('//(.*)@')
            creds = creds_re.findall(url)[0]
            user_password = creds.split(':')
            baseurl = url.replace(creds + '@', '')
            tokenurl = baseurl.split('rest/')[0] +\
                       'tokens?username=%s&password=%s'\
                       % (user_password[0], user_password[1])
            token = urllib.request.urlopen(tokenurl, None, 15).read()
            return baseurl + "token=" + str(token, 'utf-8')
        except:
            print(url)
            traceback.print_exc(file=sys.stdout)
        return None

    def _get_external_data(self, url, bbox=None, layer=None):

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

        body['geometry'] = bbox
        body['geometryType'] = 'esriGeometryEnvelope'
        body['spatialRel'] = 'esriSpatialRelIntersects'

        if url.find("@") > -1:
            url = self._get_url_with_token(url)
            if url is None:
                return None

        # construct url for get request
        separator = "?"
        if url.find(separator) > 0:
            separator = "&"
        query = '%s%s%s' % (url, separator, urllib.parse.urlencode(body))

        try:
            print('Requesting %s' % query)
            result = urllib.request.urlopen(query, None, self.TIMEOUT)
            content = result.read()
            esricoll = geojson_loads(content)
        except:
            traceback.print_exc(file=sys.stdout)
            return []
        if 'fieldAliases' not in esricoll:
            print(("Error with the layer:  %s using query : %s response: %s"
                   % (layer, query, esricoll)))
            return []
        else:
            return dict((value, key)
                        for key, value in esricoll['fieldAliases'].items())

    @staticmethod
    def remove_attributes(attributes, attributes_to_remove,
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

    def _ogc_getfeatureinfo(self, session, url, x, y, width, height,
                            layer, bbox, srs, layer_id):
        # session = get_session('development.ini', 'app')
        from c2cgeoportal_commons.models.main import Metadata

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
        metadata = session.query(Metadata).filter(Metadata.item_id == layer_id).\
                   filter(Metadata.name == "ogc_layers").first()
        if metadata is not None:
            body['LAYERS'] = metadata.value

        metadata = session.query(Metadata).filter(Metadata.item_id == layer_id).\
                   filter(Metadata.name == "ogc_query_layers").first()
        if metadata is not None:
            body['QUERY_LAYERS'] = metadata.value

        metadata = session.query(Metadata).filter(Metadata.item_id == layer_id).\
                   filter(Metadata.name == "ogc_info_format").first()
        if metadata is not None:
            body['INFO_FORMAT'] = metadata.value
        ogc_info_srs = "epsg:2169"
        metadata = session.query(Metadata).filter(Metadata.item_id == layer_id).\
                   filter(Metadata.name == "ogc_info_srs").first()
        if metadata is not None:
            ogc_info_srs = metadata.value

        separator = "?"
        if url.find(separator) > 0:
            separator = "&"
        query = '%s%s%s' % (url, separator, urlencode(body))
        content = ""
        try:
            result = urllib.request.urlopen(query, None, 15)
            content = result.read()
        except Exception as e:
            log.exception(e)
            return []
        try:
            ogc_features = geojson_loads(content)
            return (dict((key, key)
                         for key, value in ogc_features['features'][0]['properties'].items()))
        except Exception as e:
            log.exception(e)
            return []
        return []

    def _extract_messages(self):  # pragma: nocover
        print('Entering into the tooltip extractor')

        # import of DBSessions must be done after call of init_dbsessions
        from c2cgeoportal_commons.models import DBSession, DBSessions
        from geoportailv3_geoportal.models import LuxGetfeatureDefinition, LuxLayerInternalWMS

        results = DBSession.query(LuxGetfeatureDefinition).\
                  filter(LuxGetfeatureDefinition.remote_template == False).\
                  filter(
                      LuxGetfeatureDefinition.template.in_
                      (['default.html', 'default_table.html', 'feedbackanf.html']))  # noqa

        print("%d results" % results.count())
        for result in results:
            engine = DBSessions[result.engine_gfi]
            first_row = None
            if result.query is not None and len(result.query) > 0:
                try:
                    if "SELECT" in result.query.upper():
                        first_row = engine.execute(result.query).first()
                    else:
                        first_row = engine.execute("SELECT * FROM " + result.query).first()
                except:
                    print(colorize('query FAILED : SELECT * FROM ' + result.query, RED))
                    if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") != "TRUE":
                        raise
            if result.rest_url is not None and len(result.rest_url) > 0:
                first_row = self._get_external_data(
                    result.rest_url,
                    '96958.90059551848,61965.61097091329,' +
                    '97454.77280739773,62463.21618929457', result.layer)
            if ((result.rest_url is None or len(result.rest_url) == 0) and
                (result.query is None or len(result.query) == 0)):
                x = "831.1112060546875"
                y = "253.3333396911621"
                width = "1812"
                height = "687"
                bbox = "680846.6992139613,6373094.617382206,685174.9459406094,6374735.624833204"
                srs = "EPSG:3857"
                internal_wms = DBSession.query(LuxLayerInternalWMS).filter(
                    LuxLayerInternalWMS.id == result.layer).\
                    first()
                url = internal_wms.url
                ogc_layers = internal_wms.layers

                first_row = self._ogc_getfeatureinfo(
                    DBSession,
                    url, x, y, width, height,
                    ogc_layers, bbox, srs, result.layer)

            attributes = None
            if first_row is not None:
                attributes = dict(first_row)
                attributes = self.remove_attributes(
                    attributes,
                    result.attributes_to_remove,
                    result.geometry_column)
            if first_row is None and result.columns_order is not None and\
               len(result.columns_order) > 0:
                attributes = result.columns_order.split(",")
            if attributes is not None:
                for attribute in attributes:
                    self._insert_attribute(
                        "f_" + attribute,
                        (("engine:%(engine)s *"
                         "Role:%(role)s Layer" % {
                             "engine": result.engine_gfi,
                             "role": result.role,
                         }), result.layer))
