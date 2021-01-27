# -*- coding: utf-8 -*-

import json
import os
import re
import subprocess
import traceback
from typing import Dict, List, Optional, Set, cast
from urllib.parse import urlsplit
from xml.dom import Node
from xml.parsers.expat import ExpatError

import requests
import sqlalchemy
import yaml
from bottle import MakoTemplate, template  # pylint: disable=wrong-import-order,useless-suppression
from c2c.template.config import config
from defusedxml.minidom import parseString
from geoalchemy2.types import Geometry
from lingua.extractors import Extractor, Message
from mako.lookup import TemplateLookup
from mako.template import Template
from owslib.wms import WebMapService
from sqlalchemy.exc import NoSuchTableError, OperationalError, ProgrammingError
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.orm.properties import ColumnProperty
from sqlalchemy.orm.util import class_mapper

import c2cgeoportal_commons.models
import c2cgeoportal_geoportal
from c2cgeoportal_geoportal.lib.bashcolor import RED, colorize
from c2cgeoportal_geoportal.lib.lingua_extractor import GeomapfishThemeExtractor



class GeoportailV3ThemeExtractor(GeomapfishThemeExtractor):  # pragma: no cover
    """
    GeoMapFish theme extractor
    """

    # Run on the development.ini file
    extensions = [".ini"]
    featuretype_cache: Dict[str, Optional[Dict]] = {}
    wmscap_cache: Dict[str, WebMapService] = {}

    def __init__(self) -> None:
        super().__init__()

    def __call__(self, filename, options, fileobj=None, lineno=0):
        del fileobj, lineno
        messages: List[Message] = []

        try:
            engine = sqlalchemy.engine_from_config(self.config, "sqlalchemy_slave.")
            factory = sqlalchemy.orm.sessionmaker(bind=engine)
            db_session = sqlalchemy.orm.scoped_session(factory)
            c2cgeoportal_commons.models.DBSession = db_session
            c2cgeoportal_commons.models.Base.metadata.bind = engine

            try:
                from c2cgeoportal_commons.models.main import (  # pylint: disable=import-outside-toplevel
                    LayerGroup,
                    Theme,
                )

                self._import(Theme, messages)
                self._import(LayerGroup, messages)

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

        return messages
