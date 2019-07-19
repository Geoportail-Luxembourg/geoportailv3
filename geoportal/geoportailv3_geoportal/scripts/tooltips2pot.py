# -*- coding: utf-8 -*-
import codecs
import traceback
import sys
import urllib.request
import urllib.parse
import re
import polib
import os
from os import path
from pyramid.paster import bootstrap
from geojson import loads as geojson_loads
from . import get_session


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

TIMEOUT=15

def _get_external_data(url, bbox=None, layer=None):
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
        url = _get_url_with_token(url)
        if url is None:
            return None

    # construct url for get request
    separator = "?"
    if url.find(separator) > 0:
        separator = "&"
    query = '%s%s%s' % (url, separator, urllib.parse.urlencode(body))

    try:
        print('Requesting %s' % query)
        result = urllib.request.urlopen(query, None, TIMEOUT)
        content = result.read()
    except:
        print(query)
        traceback.print_exc(file=sys.stdout)
        return []

    try:
        esricoll = geojson_loads(content)
    except:
        return []
    if 'fieldAliases' not in esricoll:
        print(("Error with the layer:  %s using query : %s response: %s"
              % (layer, query, esricoll)))
        return []
    else:
        return dict((value, key)
                    for key, value in esricoll['fieldAliases'].items())


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


def is_in_po(po, search):
    for entry in po:
        if entry.msgid == search:
            return True
    return False


def main():  # pragma: nocover
    destination = "/tmp/tooltips.pot"

    session = get_session('development.ini', 'app')
    from c2cgeoportal_commons.models import DBSession, DBSessions
    from geoportailv3_geoportal.models import LuxGetfeatureDefinition
    if not os.path.isfile(destination):
        po = polib.POFile()
        po.metadata = {
            'MIME-Version': '1.0',
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Transfer-Encoding': '8bit',
        }
    else:
        po = polib.pofile(destination, encoding="utf-8")

    results = session.query(LuxGetfeatureDefinition).\
        filter(LuxGetfeatureDefinition.remote_template == False).filter(
            LuxGetfeatureDefinition.template.in_
            (['default.html', 'default_table.html', 'feedbackanf.html'])).all()  # noqa

    fields = []
    print("%d results" % len(results))
    for result in results:
        engine = DBSessions[result.engine_gfi]
        first_row = None
        if result.query is not None and len(result.query) > 0:
            if "SELECT" in result.query.upper():
                first_row = engine.execute(result.query).first()
            else:
                first_row = engine.execute("SELECT * FROM " + result.query).first()
        if result.rest_url is not None and len(result.rest_url) > 0:
            first_row = _get_external_data(
                result.rest_url,
                '96958.90059551848,61965.61097091329,' +
                '97454.77280739773,62463.21618929457', result.layer)

        attributes = None
        if first_row is not None:
            attributes = dict(first_row)
            attributes = remove_attributes(
                attributes,
                result.attributes_to_remove,
                result.geometry_column)
        if first_row is None and result.columns_order is not None and\
           len(result.columns_order) > 0:
            attributes = result.columns_order.split(",")
        if attributes is not None:
            for attribute in attributes:
                if attribute not in fields:
                    fields.append(attribute)
                    if not is_in_po(po, u'f_%(name)s' % {'name': attribute}):
                        entry = polib.POEntry(
                            msgid=u'f_%(name)s' % {'name': attribute},
                            msgstr=u'',
                            comment=("engine:%(engine)s Layer:%(layer)s *"
                                     "Role:%(role)s" % {
                                        "engine": result.engine_gfi,
                                        "layer": result.layer,
                                        "role": result.role,
                                        })
                        )
                        po.append(entry)
                        po.save(destination)
    print("tooltips Pot file updated: %s" % destination)
