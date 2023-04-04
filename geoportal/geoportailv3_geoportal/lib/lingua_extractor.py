import os
import re
import traceback
import sys
import urllib
from urllib.parse import urlencode
import httplib2
import json
import yaml
import polib
from geojson import loads as geojson_loads
from sqlalchemy.exc import NoSuchTableError, OperationalError, ProgrammingError
from lingua.extractors import Extractor, Message
from pyramid.paster import bootstrap
from c2cgeoportal_geoportal import init_dbsessions
from c2cgeoportal_geoportal.lib.bashcolor import RED, colorize
import c2cgeoportal_commons

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
from c2cgeoportal_geoportal.lib.caching import init_region
from c2cgeoportal_geoportal.views.layers import Layers, get_layer_class

from geoportailv3_geoportal.lib.esri_authentication import ESRITokenException
from geoportailv3_geoportal.lib.esri_authentication import get_arcgis_token, read_request_with_token

config = c2cgeoportal_commons.configuration

import logging
log = logging.getLogger(__name__)
def add_url_params(url, params):
    if len(params.items()) == 0:
        return url
    return add_spliturl_params(urlparse.urlsplit(url), params)
def add_spliturl_params(spliturl, params):
    query = dict([(k, v[-1]) for k, v in urlparse.parse_qs(_encode(spliturl.query)).items()])
    for key, value in params.items():
        query[_encode(key)] = _encode(value)

    return urlparse.urlunsplit((
        spliturl.scheme, spliturl.netloc, spliturl.path,
        urllib.urlencode(query), spliturl.fragment
    ))
def get_url2(name, url, request, errors) -> Optional[str]:
    url_split = urllib.parse.urlsplit(url)
    if url_split.scheme == "":
        if url_split.netloc == "" and url_split.path not in ("", "/"):
            # Relative URL like: /dummy/static/url or dummy/static/url
            return urllib.parse.urlunsplit(url_split)
        errors.add("{}='{}' is not an URL.".format(name, url))
        return None
    if url_split.scheme in ("http", "https"):
        if url_split.netloc == "":
            errors.add("{}='{}' is not a valid URL.".format(name, url))
            return None
        return urllib.parse.urlunsplit(url_split)
    if url_split.scheme == "static":
        if url_split.path in ("", "/"):
            errors.add("{}='{}' cannot have an empty path.".format(name, url))
            return None
        proj = url_split.netloc
        package = request.registry.settings["package"]
        if proj in ("", "static"):
            proj = "/etc/geomapfish/static"
        elif ":" not in proj:
            if proj == "static-ngeo":
                errors.add(
                    "{}='{}' static-ngeo shouldn't be used out of webpack because it don't has "
                    "cache bustering.".format(name, url)
                )
            proj = "{}_geoportal:{}".format(package, proj)
        return request.static_url("{}{}".format(proj, url_split.path))
    if url_split.scheme == "config":
        if url_split.netloc == "":
            errors.add("{}='{}' cannot have an empty netloc.".format(name, url))
            return None
        server = request.registry.settings.get("servers", {}).get(url_split.netloc)
        if server is None:
            errors.add(
                "{}: The server '{}' ({}) is not found in the config: [{}]".format(
                    name,
                    url_split.netloc,
                    url,
                    ", ".join(request.registry.settings.get("servers", {}).keys()),
                )
            )
            return None
        if url_split.path != "":
            if server[-1] != "/":
                server += "/"
            url = urllib.parse.urljoin(server, url_split.path[1:])
        else:
            url = server
        return url if not url_split.query else "{}?{}".format(url, url_split.query)
                                                                              

class _Registry:  # pragma: no cover
    settings = None

    def __init__(self, settings):
        self.settings = settings


class _Request:  # pragma: no cover
    params: Dict[str, str] = {}
    matchdict: Dict[str, str] = {}
    GET: Dict[str, str] = {}
    session: Dict[str, str] = {} 
    
    def __init__(self, settings=None):
        self.registry: _Registry = _Registry(settings)

    @staticmethod
    def static_url(*args, **kwargs):
        del args
        del kwargs
        return ""

    @staticmethod
    def static_path(*args, **kwargs):
        del args
        del kwargs
        return ""

    @staticmethod
    def route_url(*args, **kwargs):
        del args
        del kwargs
        return ""

    @staticmethod
    def current_route_url(*args, **kwargs):
        del args
        del kwargs
        return ""


class GeomapfishAngularExtractor(Extractor):  # pragma: no cover
    """
    GeoMapFish angular extractor
    """

    extensions = [".js", ".html"]

    def __init__(self) -> None:
        super().__init__()
        if os.path.exists("/etc/geomapfish/config.yaml"):
            config.init("/etc/geomapfish/config.yaml")
            self.config = config.get_config()
        else:
            self.config = None
        self.tpl = None

    def __call__(self, filename, options, fileobj=None, lineno=0):
        del fileobj, lineno

        init_region({"backend": "dogpile.cache.memory"}, "std")
        init_region({"backend": "dogpile.cache.memory"}, "obj")

        int_filename = filename
        if re.match("^" + re.escape("./{}/templates".format(self.config["package"])), filename):
            try:
                empty_template = Template("")  # nosec

                class Lookup(TemplateLookup):
                    @staticmethod
                    def get_template(uri):
                        del uri  # unused
                        return empty_template

                class MyTemplate(MakoTemplate):
                    tpl = None

                    def prepare(self, **kwargs):
                        options.update({"input_encoding": self.encoding})
                        lookup = Lookup(**kwargs)
                        if self.source:
                            self.tpl = Template(self.source, lookup=lookup, **kwargs)  # nosec
                        else:
                            self.tpl = Template(  # nosec
                                uri=self.name, filename=self.filename, lookup=lookup, **kwargs
                            )

                try:
                    processed = template(
                        filename,
                        {
                            "request": _Request(self.config),
                            "lang": "fr",
                            "debug": False,
                            "extra_params": {},
                            "permalink_themes": "",
                            "fulltextsearch_groups": [],
                            "wfs_types": [],
                            "_": lambda x: x,
                        },
                        template_adapter=MyTemplate,
                    )
                    int_filename = os.path.join(os.path.dirname(filename), "_" + os.path.basename(filename))
                    with open(int_filename, "wb") as file_open:
                        file_open.write(processed.encode("utf-8"))
                except Exception:
                    print(
                        colorize("ERROR! Occurred during the '{}' template generation".format(filename), RED)
                    )
                    print(colorize(traceback.format_exc(), RED))
                    if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") == "TRUE":
                        # Continue with the original one
                        int_filename = filename
                    else:
                        raise
            except Exception:
                print(traceback.format_exc())

        message_str = subprocess.check_output(
            ["node", "./tools/extract-messages.js", int_filename]
        ).decode("utf-8")
        if int_filename != filename:
            os.unlink(int_filename)
        try:
            messages = []
            for contexts, message in json.loads(message_str):
                for context in contexts.split(", "):
                    assert message is not None
                    messages.append(Message(None, message, None, [], "", "", context.split(":")))
            return messages
        except Exception:
            print(colorize("An error occurred", RED))
            print(colorize(message_str, RED))
            print("------")
            raise


class GeomapfishConfigExtractor(Extractor):  # pragma: no cover
    """
    GeoMapFish config extractor (raster layers, and print templates)
    """

    extensions = [".yaml", ".tmpl"]

    def __call__(self, filename, options, fileobj=None, lineno=0):
        del fileobj, lineno
        init_region({"backend": "dogpile.cache.memory"}, "std")
        init_region({"backend": "dogpile.cache.memory"}, "obj")

        with open(filename) as config_file:
            gmf_config = yaml.load(config_file, Loader=yaml.BaseLoader)  # nosec
            # For application config (config.yaml)
            if "vars" in gmf_config:
                return self._collect_app_config(filename)
            # For the print config
            if "templates" in gmf_config:
                return self._collect_print_config(gmf_config, filename)
            raise Exception("Not a known config file")

    def _collect_app_config(self, filename):
        config.init(filename)
        settings = config.get_config()
        assert not [
            raster_layer for raster_layer in list(settings.get("raster", {}).keys()) if raster_layer is None
        ]
        # Collect raster layers names
        raster = [
            Message(None, raster_layer, None, [], "", "", (filename, "raster/{}".format(raster_layer)))
            for raster_layer in list(settings.get("raster", {}).keys())
        ]

        # Init db sessions

        class R:
            settings = None

        class C:
            registry = R()

            def get_settings(self):
                return self.registry.settings

            def add_tween(self, *args, **kwargs):
                pass

        config_ = C()
        config_.registry.settings = settings

        c2cgeoportal_geoportal.init_dbsessions(settings, config_)

        # Collect layers enum values (for filters)

        from c2cgeoportal_commons.models import DBSessions  # pylint: disable=import-outside-toplevel
        from c2cgeoportal_commons.models.main import Metadata  # pylint: disable=import-outside-toplevel

        enums = []
        enum_layers = settings.get("layers", {}).get("enum", {})
        for layername in list(enum_layers.keys()):
            layerinfos = enum_layers.get(layername, {})
            attributes = layerinfos.get("attributes", {})
            for fieldname in list(attributes.keys()):
                values = self._enumerate_attributes_values(DBSessions, Layers, layerinfos, fieldname)
                for (value,) in values:
                    if isinstance(value, str) and value != "":
                        msgid = value
                        location = "/layers/{}/values/{}/{}".format(
                            layername,
                            fieldname,
                            value.encode("ascii", errors="replace").decode("ascii"),
                        )
                        assert msgid is not None
                        enums.append(Message(None, msgid, None, [], "", "", (filename, location)))

        metadata_list = []
        defs = config["admin_interface"]["available_metadata"]  # pylint: disable=unsubscriptable-object
        names = [e["name"] for e in defs if e.get("translate", False)]

        if names:
            engine = sqlalchemy.create_engine(config["sqlalchemy.url"])
            Session = sqlalchemy.orm.session.sessionmaker()  # noqa
            Session.configure(bind=engine)
            session = Session()

            query = session.query(Metadata).filter(Metadata.name.in_(names))  # pylint: disable=no-member
            for metadata in query.all():
                location = "metadata/{}/{}".format(metadata.name, metadata.id)
                assert metadata.value is not None
                metadata_list.append(Message(None, metadata.value, None, [], "", "", (filename, location)))

        interfaces_messages = []
        for interface, interface_config in config["interfaces_config"].items():
            for ds_index, datasource in enumerate(
                interface_config.get("constants", {}).get("gmfSearchOptions", {}).get("datasources", [])
            ):
                for a_index, action in enumerate(datasource.get("groupActions", [])):
                    location = (
                        "interfaces_config/{}/constants/gmfSearchOptions/datasources[{}]/"
                        "groupActions[{}]/title".format(interface, ds_index, a_index)
                    )
                    assert action["title"] is not None
                    interfaces_messages.append(
                        Message(None, action["title"], None, [], "", "", (filename, location))
                    )

            for merge_tab in (
                interface_config.get("constants", {})
                .get("gmfDisplayQueryGridOptions", {})
                .get("mergeTabs", {})
                .keys()
            ):
                location = "interfaces_config/{}/constants/gmfDisplayQueryGridOptions/mergeTabs/{}/".format(
                    interface, merge_tab
                )
                assert merge_tab is not None
                interfaces_messages.append(Message(None, merge_tab, None, [], "", "", (filename, location)))

        return raster + enums + metadata_list + interfaces_messages

    @staticmethod
    def _enumerate_attributes_values(dbsessions, layers, layerinfos, fieldname):
        dbname = layerinfos.get("dbsession", "dbsession")
        translate = layerinfos.get("attributes").get(fieldname, {}).get("translate", True)
        if not translate:
            return []
        try:
            dbsession = dbsessions.get(dbname)
            return layers.query_enumerate_attribute_values(dbsession, layerinfos, fieldname)
        except Exception as e:
            table = layerinfos.get("attributes").get(fieldname, {}).get("table")
            print(
                colorize(
                    "ERROR! Unable to collect enumerate attributes for "
                    "db: {}, table: {}, column: {} ({})".format(dbname, table, fieldname, e),
                    RED,
                )
            )
            if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") == "TRUE":
                return []
            raise

    @staticmethod
    def _collect_print_config(print_config, filename):
        result = []
        for template_ in list(print_config.get("templates").keys()):
            assert template_ is not None
            result.append(
                Message(None, template_, None, [], "", "", (filename, "template/{}".format(template_)))
            )
            assert not [
                attribute
                for attribute in list(print_config["templates"][template_]["attributes"].keys())
                if attribute is None
            ]
            result += [
                Message(
                    None,
                    attribute,
                    None,
                    [],
                    "",
                    "",
                    (filename, "template/{}/{}".format(template_, attribute)),
                )
                for attribute in list(print_config["templates"][template_]["attributes"].keys())
            ]
        return result


class GeomapfishThemeExtractor(Extractor):  # pragma: no cover
    """
    GeoMapFish theme extractor
    """

    # Run on the development.ini file
    extensions = [".ini"]
    featuretype_cache: Dict[str, Optional[Dict]] = {}
    wmscap_cache: Dict[str, WebMapService] = {}

    def __init__(self) -> None:
        super().__init__()
        if os.path.exists("/etc/geomapfish/config.yaml"):
            config.init("/etc/geomapfish/config.yaml")
            self.config = config.get_config()
        else:
            self.config = None
        self.env = None

    def __call__(self, filename, options, fileobj=None, lineno=0):
        del fileobj, lineno
        messages: List[Message] = []

        try:
            self.env = bootstrap(filename)
            engine = sqlalchemy.engine_from_config(self.config, "sqlalchemy_slave.")
            factory = sqlalchemy.orm.sessionmaker(bind=engine)
            db_session = sqlalchemy.orm.scoped_session(factory)
            c2cgeoportal_commons.models.DBSession = db_session
            c2cgeoportal_commons.models.Base.metadata.bind = engine

            try:
                from c2cgeoportal_commons.models.main import (  # pylint: disable=import-outside-toplevel
                    FullTextSearch,
                    LayerGroup,
                    LayerWMS,
                    LayerWMTS,
                    Theme,
                )

                self._import(Theme, messages)
                self._import(LayerGroup, messages)
                self._import(LayerWMS, messages, self._import_layer_wms)
                self._import(LayerWMTS, messages, self._import_layer_wmts)

                for (layer_name,) in db_session.query(FullTextSearch.layer_name).distinct().all():
                    if layer_name is not None and layer_name != "":
                        assert layer_name is not None
                        messages.append(
                            Message(
                                None,
                                layer_name,
                                None,
                                [],
                                "",
                                "",
                                ("fts", layer_name.encode("ascii", errors="replace")),
                            )
                        )

                for (actions,) in db_session.query(FullTextSearch.actions).distinct().all():
                    if actions is not None and actions != "":
                        for action in actions:
                            assert action["data"] is not None
                            messages.append(
                                Message(
                                    None,
                                    action["data"],
                                    None,
                                    [],
                                    "",
                                    "",
                                    ("fts", action["data"].encode("ascii", errors="replace")),
                                )
                            )
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

    @staticmethod
    def _import(object_type, messages, callback=None):
        from c2cgeoportal_commons.models import DBSession  # pylint: disable=import-outside-toplevel

        items = DBSession.query(object_type)
        for item in items:
            assert item.name is not None
            messages.append(
                Message(
                    None,
                    item.name,
                    None,
                    [],
                    "",
                    "",
                    (item.item_type, item.name.encode("ascii", errors="replace")),
                )
            )

            if callback is not None:
                callback(item, messages)

    def _import_layer_wms(self, layer, messages):
        server = layer.ogc_server
        url = server.url_wfs or server.url
        if url is None:
            return
        if layer.ogc_server.wfs_support:
            for wms_layer in layer.layer.split(","):
                self._import_layer_attributes(url, wms_layer, layer.item_type, layer.name, messages)
        if layer.geo_table is not None and layer.geo_table != "":
            try:
                cls = get_layer_class(layer, with_last_update_columns=True)
                for column_property in class_mapper(cls).iterate_properties:
                    if isinstance(column_property, ColumnProperty) and len(column_property.columns) == 1:
                        column = column_property.columns[0]
                        if not column.primary_key and not isinstance(column.type, Geometry):
                            if column.foreign_keys:
                                if column.name == "type_id":
                                    name = "type_"
                                elif column.name.endswith("_id"):
                                    name = column.name[:-3]
                                else:
                                    name = column.name + "_"
                            else:
                                name = column_property.key
                            assert name is not None
                            messages.append(
                                Message(
                                    None,
                                    name,
                                    None,
                                    [],
                                    "",
                                    "",
                                    (".".join(["edit", layer.item_type, str(layer.id)]), layer.name),
                                )
                            )
            except NoSuchTableError:
                print(
                    colorize(
                        "ERROR! No such table '{}' for layer '{}'.".format(layer.geo_table, layer.name), RED
                    )
                )
                print(colorize(traceback.format_exc(), RED))
                if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") != "TRUE":
                    raise

    def _import_layer_wmts(self, layer, messages):
        from c2cgeoportal_commons.models import DBSession  # pylint: disable=import-outside-toplevel
        from c2cgeoportal_commons.models.main import OGCServer  # pylint: disable=import-outside-toplevel

        layers = [d.value for d in layer.metadatas if d.name == "queryLayers"]
        if not layers:
            layers = [d.value for d in layer.metadatas if d.name == "wmsLayer"]
        server = [d.value for d in layer.metadatas if d.name == "ogcServer"]
        if server and layers:
            layers = [layer for ls in layers for layer in ls.split(",")]
            for wms_layer in layers:
                try:
                    db_server = DBSession.query(OGCServer).filter(OGCServer.name == server[0]).one()
                    if db_server.wfs_support:
                        self._import_layer_attributes(
                            db_server.url_wfs or db_server.url,
                            wms_layer,
                            layer.item_type,
                            layer.name,
                            messages,
                        )
                except NoResultFound:
                    print(
                        colorize(
                            "ERROR! the OGC server '{}' from the WMTS layer '{}' does not exist.".format(
                                server[0], layer.name
                            ),
                            RED,
                        )
                    )
                    if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") != "TRUE":
                        raise

    def _import_layer_attributes(self, url, layer, item_type, name, messages):
        attributes, layers = self._layer_attributes(url, layer)
        for sub_layer in layers:
            assert sub_layer is not None
            messages.append(
                Message(
                    None,
                    sub_layer,
                    None,
                    [],
                    "",
                    "",
                    (".".join([item_type, name]), sub_layer.encode("ascii", "replace")),
                )
            )
        for attribute in attributes:
            assert attribute is not None
            messages.append(
                Message(
                    None,
                    attribute,
                    None,
                    [],
                    "",
                    "",
                    (".".join([item_type, name]), layer.encode("ascii", "replace")),
                )
            )

    def _build_url(self, url):
        url_split = urlsplit(url)
        hostname = url_split.hostname
        host_map = self.config.get("lingua_extractor", {}).get("host_map", {})
        if hostname in host_map:
            map_ = host_map[hostname]
            if "netloc" in map_:
                url_split = url_split._replace(netloc=map_["netloc"])
            if "scheme" in map_:
                url_split = url_split._replace(scheme=map_["scheme"])
            kwargs = {"verify": map_["verify"]} if "verify" in map_ else {}
            return url_split.geturl(), map_.get("headers", {}), kwargs
        return url, {}, {}

    def _layer_attributes(self, url, layer):
        errors: Set[str] = set()

        request = _Request()
        request.registry.settings = self.config
        # Static schema will not be supported
        url = get_url2("Layer", url, request, errors)
        if errors:
            print("\n".join(errors))
            return [], []
        url, headers, kwargs = self._build_url(url)

        if url not in self.wmscap_cache:
            print("Get WMS GetCapabilities for URL: {}".format(url))
            self.wmscap_cache[url] = None

            wms_getcap_url = add_url_params(
                url,
                {
                    "SERVICE": "WMS",
                    "VERSION": "1.1.1",
                    "REQUEST": "GetCapabilities",
                    "ROLE_IDS": "0",
                    "USER_ID": "0",
                },
            )
            try:
                print(
                    "Get WMS GetCapabilities for URL {},\nwith headers: {}".format(
                        wms_getcap_url,
                        " ".join(
                            [
                                "{}={}".format(h, v if h not in ("Authorization", "Cookies") else "***")
                                for h, v in headers.items()
                            ]
                        ),
                    )
                )
                response = requests.get(wms_getcap_url, headers=headers, **kwargs)

                try:
                    self.wmscap_cache[url] = WebMapService(None, xml=response.content)
                except Exception as e:
                    print(
                        colorize(
                            "ERROR! an error occurred while trying to " "parse the GetCapabilities document.",
                            RED,
                        )
                    )
                    print(colorize(str(e), RED))
                    print("URL: {}\nxml:\n{}".format(wms_getcap_url, response.text))
                    if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") != "TRUE":
                        raise
            except Exception as e:  # pragma: no cover
                print(colorize(str(e), RED))
                print(
                    colorize(
                        "ERROR! Unable to GetCapabilities from URL: {},\nwith headers: {}".format(
                            wms_getcap_url,
                            " ".join(
                                [
                                    "{}={}".format(h, v if h not in ("Authorization", "Cookies") else "***")
                                    for h, v in headers.items()
                                ]
                            ),
                        ),
                        RED,
                    )
                )
                if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") != "TRUE":
                    raise

        wmscap = self.wmscap_cache[url]

        if url not in self.featuretype_cache:
            print("Get WFS DescribeFeatureType for URL: {}".format(url))
            self.featuretype_cache[url] = None

            wfs_descrfeat_url = add_url_params(
                url,
                {
                    "SERVICE": "WFS",
                    "VERSION": "1.1.0",
                    "REQUEST": "DescribeFeatureType",
                    "ROLE_IDS": "0",
                    "USER_ID": "0",
                },
            )
            try:
                response = requests.get(wfs_descrfeat_url, headers=headers, **kwargs)
            except Exception as e:  # pragma: no cover
                print(colorize(str(e), RED))
                print(
                    colorize(
                        "ERROR! Unable to DescribeFeatureType from URL: {}".format(wfs_descrfeat_url), RED
                    )
                )
                if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") == "TRUE":
                    return [], []
                raise

            if not response.ok:  # pragma: no cover
                print(
                    colorize(
                        "ERROR! DescribeFeatureType from URL {} return the error: {:d} {}".format(
                            wfs_descrfeat_url, response.status_code, response.reason
                        ),
                        RED,
                    )
                )
                if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") == "TRUE":
                    return [], []
                raise Exception("Aborted")

            try:
                describe = parseString(response.text)
                featurestype: Optional[Dict[str, Node]] = {}
                self.featuretype_cache[url] = featurestype
                for type_element in describe.getElementsByTagNameNS(
                    "http://www.w3.org/2001/XMLSchema", "complexType"
                ):
                    cast(Dict[str, Node], featurestype)[type_element.getAttribute("name")] = type_element
            except ExpatError as e:
                print(
                    colorize(
                        "ERROR! an error occurred while trying to " "parse the DescribeFeatureType document.",
                        RED,
                    )
                )
                print(colorize(str(e), RED))
                print("URL: {}\nxml:\n{}".format(wfs_descrfeat_url, response.text))
                if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") == "TRUE":
                    return [], []
                raise
            except AttributeError:
                print(
                    colorize(
                        "ERROR! an error occurred while trying to "
                        "read the Mapfile and recover the themes.",
                        RED,
                    )
                )
                print("URL: {}\nxml:\n{}".format(wfs_descrfeat_url, response.text))
                if os.environ.get("IGNORE_I18N_ERRORS", "FALSE") == "TRUE":
                    return [], []
                raise
        else:
            featurestype = self.featuretype_cache[url]

        if featurestype is None:
            return [], []

        layers = [layer]
        if wmscap is not None and layer in list(wmscap.contents):
            layer_obj = wmscap[layer]
            if layer_obj.layers:
                layers = [layer.name for layer in layer_obj.layers]

        attributes = []
        for sub_layer in layers:
            # Should probably be adapted for other king of servers
            type_element = featurestype.get("{}Type".format(sub_layer))
            if type_element is not None:
                for element in type_element.getElementsByTagNameNS(
                    "http://www.w3.org/2001/XMLSchema", "element"
                ):
                    if not element.getAttribute("type").startswith("gml:"):
                        attributes.append(element.getAttribute("name"))

        return attributes, layers

class LuxembourgExtractor(Extractor):  # pragma: no cover
    """
    ESRI legend extractor
    """
    extensions = [".ini"]

    # Get the keys existing in po file and not in pot file and add them
    def _get_missing_keys(self, po_name):
        po_path = "geoportal/geoportailv3_geoportal/locale/" + po_name
        pot = self.messages
        po = None
        keys = []
        if os.path.exists(po_path):
            po = polib.pofile(po_path, encoding="utf-8")
        else:
            print("File not found")
            return keys

        for po_entry in po:
            found = False
            for pot_entry in pot:
                if pot_entry.msgid == po_entry.msgid:
                    found = True
                    break
            if not found:
                keys.append(po_entry)
        return keys

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
                file = "geoportailv3_geoportal-legends.pot"
                if str(self.__class__).find('LuxembourgTooltipsExtractor') > 0:
                    file = "geoportailv3_geoportal-tooltips.pot"
                for attribute in self._get_missing_keys(file):
                    self._insert_attribute(
                        attribute.msgid,
                        (attribute.comment, ""))
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
    def __init__(self) -> None:
        super().__init__()
        if os.path.exists("/etc/geomapfish/config.yaml"):
            config.init("/etc/geomapfish/config.yaml")
            self.config = config.get_config()['arcgis_token']
        else:
            self.config = None
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
            query_params = {'f': 'pjson'}
            full_url = result.rest_url + '/legend?f=pjson'
            try:
                if result.use_auth:
                    auth_token = get_arcgis_token(_Request(self.config), log)
                    if 'token' in auth_token:
                        query_params["token"] = auth_token['token']
                full_url = result.rest_url + '/legend?' + urllib.parse.urlencode(query_params)

                url_request = urllib.request.Request(full_url)
                esri_result = read_request_with_token(url_request, _Request(self.config), log)
                content = esri_result.data
                data = json.loads(content)

            except Exception as e:
                log.error(full_url)
                log.exception(e)
        if data is not None and 'layers' in data:
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
    def __init__(self) -> None:
        super().__init__()
        if os.path.exists("/etc/geomapfish/config.yaml"):
            config.init("/etc/geomapfish/config.yaml")
            self.config = config.get_config()['arcgis_token']
        else:
            self.config = None

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

    def _get_external_data(self, url, bbox=None, layer=None, use_auth=False):

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
            content = ""
            print('Requesting %s' % query)
            if use_auth is True:
                url_request = urllib.request.Request(query)
                esri_result = read_request_with_token(url_request, _Request(self.config), log)
                content = esri_result.data
                esricoll = geojson_loads(content)
            else:
                result = urllib.request.urlopen(query, None, self.TIMEOUT)
                content = result.read()
                esricoll = geojson_loads(content)

        except Exception as e:
            log.error("-----------------------------")
            log.error(query)
            log.error(content)
            log.exception(e)
            log.error("-----------------------------")
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
            if 'features' in ogc_features and len(ogc_features['features']) > 0 and 'properties' in ogc_features['features'][0]:
                return (dict((key, key)
                             for key, value in ogc_features['features'][0]['properties'].items()))
        except Exception as e:
            log.error("-----------------------------")
            log.error(query)
            log.error(content)
            log.exception(e)
            log.error("-----------------------------")
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
                      (['default.html', 'default_table.html', 'feedbackanf.html', 'default_attachment.html', 'automatic_sols', 'default_attachment_no_prefix.html']))  # noqa

        print("%d results" % results.count())
        for result in results:
            has_prefix = True
            if result.template == 'default_attachment_no_prefix.html':
                has_prefix = False
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
                    '97454.77280739773,62463.21618929457', result.layer, result.use_auth)
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
                if internal_wms is not None:
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
                        "f_" + attribute if has_prefix else attribute,
                        (("engine:%(engine)s *"
                         "Role:%(role)s Layer" % {
                             "engine": result.engine_gfi,
                             "role": result.role,
                         }), result.layer))
