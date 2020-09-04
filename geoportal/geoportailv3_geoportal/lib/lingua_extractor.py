import os
import re
import urllib
import httplib2
import json
from geojson import loads as geojson_loads
import sqlalchemy
from sqlalchemy.exc import NoSuchTableError, OperationalError, ProgrammingError
from lingua.extractors import Extractor, Message

import c2cgeoportal_commons.models
from c2cgeoportal_commons.config import config
from c2cgeoportal_geoportal.lib.bashcolor import RED, colorize


class LuxembourgExtractor(Extractor):  # pragma: no cover
    """
    ESRI legend extractor
    """
    extensions = [".ini"]

    def __init__(self):
        super().__init__()
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

    def __call__(self, filename, options, fileobj=None, lineno=0):
        print('Entering into %s extractor' % self.__class__)

        del fileobj, lineno

        try:
            engine = sqlalchemy.engine_from_config(self.config, "sqlalchemy_slave.")
            factory = sqlalchemy.orm.sessionmaker(bind=engine)
            db_session = sqlalchemy.orm.scoped_session(factory)
            c2cgeoportal_commons.models.DBSession = db_session
            c2cgeoportal_commons.models.Base.metadata.bind = engine

            try:
                self._extract_messages(db_session)

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
                    u'f_%(name)s' % {'name': attribute},
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

    def _extract_messages(self, db_session):
        print('Hello, I entered into ESRI extractor')

        from c2cgeoportal_commons.models import DBSession  # pylint: disable=import-outside-toplevel
        from geoportailv3_geoportal.models import LuxLayerInternalWMS
        from c2cgeoportal_commons.models.main import OGCServer

        results = (DBSession.query(LuxLayerInternalWMS)
                   .join(OGCServer, LuxLayerInternalWMS.ogc_server_id == OGCServer.id)
                   .filter(OGCServer.type == 'arcgis')).all()
        print("%d ESRI layers to parse" % len(results))

        fields = set()
        for result in results:
            self._load_result(result, fields)

    def _load_result(self, result, fields):
        if result.rest_url is not None and len(result.rest_url) > 0:
            full_url = result.rest_url + '/legend?f=pjson'
            f = urllib.request.urlopen(httplib2.iri2uri(full_url), None, 15)
            data = json.load(f)
        if data is not None:
            for l in data['layers']:
                attribute = l['layerName']
                self._insert_attribute(attribute,
                                       ("(ogc_server_id:%s Type:%s)"
                                        % (result.ogc_server_id, result.item_type),
                                        result.layer),)
                for leg in l['legend']:
                    attribute = leg['label']
                    self._insert_attribute(attribute,
                                           ("(ogc_server_id:%s Type:%s)"
                                            % (result.ogc_server_id, result.item_type),
                                            result.layer),)


class LuxembourgTooltipsExtractor(LuxembourgExtractor):  # pragma: no cover
    """
    Tooltip extractor
    """
    extensions = [".ini"]

    def _extract_messages(self, db_session):
        print('Hello, I entered into the tooltip extractor')
        self.messages.append(Message(None, 'msgid', None, [], u'', u'', (str(db_session), 1)))
