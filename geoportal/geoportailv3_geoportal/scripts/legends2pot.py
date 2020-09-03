# -*- coding: utf-8 -*-
import logging
import codecs
import traceback
import sys
import urllib.request
import urllib.parse
import re
import polib
import httplib2
import json
import os
from os import path
from pyramid.paster import bootstrap
from geojson import loads as geojson_loads
from . import get_session
from urllib.parse import urlencode
log = logging.getLogger(__name__)


def is_in_po(po, search):
    for entry in po:
        if entry.msgid == search:
            return True
    return False


def main():  # pragma: nocover
    destination = "/tmp/legends.pot"

    session = get_session('development.ini', 'app')
    from c2cgeoportal_commons.models import DBSession, DBSessions
    from geoportailv3_geoportal.models import LuxLayerInternalWMS
    from c2cgeoportal_commons.models.main import OGCServer

    if not os.path.isfile(destination):
        po = polib.POFile()
        po.metadata = {
            'MIME-Version': '1.0',
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Transfer-Encoding': '8bit',
        }
    else:
        po = polib.pofile(destination, encoding="utf-8")

    # ESRI_servers = (session.query(OGCServer)
    #                 .filter(OGCServer.type == 'arcgis'))
    # results = (session.query(LuxLayerInternalWMS)
    #            .filter(LuxLayerInternalWMS.ogc_server_id == ESRI_servers.id))
    results = (session.query(LuxLayerInternalWMS)
               .join(OGCServer, LuxLayerInternalWMS.ogc_server_id == OGCServer.id)
               .filter(OGCServer.type == 'arcgis')).all()
    fields = []
    print("%d results" % len(results))
    for result in results:
        first_row = None
        if result.rest_url is not None and len(result.rest_url) > 0:
            full_url = result.rest_url + '/legend?f=pjson'
            f = urllib.request.urlopen(httplib2.iri2uri(full_url), None, 15)
            data = json.load(f)
        if data is not None:
            for l in data['layers']:
                attribute = l['layerName']
                if attribute not in fields:
                    fields.append(attribute)
                    if not is_in_po(po, u'f_%(name)s' % {'name': attribute}):
                        entry = polib.POEntry(
                            msgid=u'f_%(name)s' % {'name': attribute},
                            msgstr=u'',
                            comment=("ogc_server_id:%(ogc)s Layer:%(layer)s *"
                                     "Type:%(item_type)s" % {
                                        "ogc": result.ogc_server_id,
                                        "layer": result.layer,
                                        "item_type": result.item_type,
                                        })
                        )
                        po.append(entry)

                for leg in l['legend']:
                    attribute = leg['label']
                    if attribute not in fields:
                        fields.append(attribute)
                        if not is_in_po(po, u'f_%(name)s' % {'name': attribute}):
                            entry = polib.POEntry(
                                msgid=u'f_%(name)s' % {'name': attribute},
                                msgstr=u'',
                                comment=("ogc_server_id:%(ogc)s Layer:%(layer)s *"
                                         "Type:%(item_type)s" % {
                                             "ogc": result.ogc_server_id,
                                             "layer": result.layer,
                                             "item_type": result.item_type,
                                         })
                            )
                            po.append(entry)
            po.save(destination)
    print("tooltips Pot file updated: %s" % destination)
