# -*- coding: utf-8 -*-
import codecs
import traceback
import sys
import urllib.request
import urllib.parse
import re
from os import path
from pyramid.paster import bootstrap
from geojson import loads as geojson_loads
from c2cgeoportal_commons.models import DBSession


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

    # construct url for get request
    separator = "?"
    if url.find('?'):
        separator = "&"
    query = '%s%s%s' % (url, separator, urllib.parse.urlencode(body))

    try:
        result = urllib.request.urlopen(query, None, 15)
        content = result.read()
    except:
        traceback.print_exc(file=sys.stdout)
        return []

    try:
        esricoll = geojson_loads(content)
    except:
        return []
    if 'fieldAliases' not in esricoll:
        print("Error with the layer:  %s using query : %s response: %s"
              % (layer, query, esricoll))
        return []
    else:
        return dict((value, key)
                    for key, value in esricoll['fieldAliases'].iteritems())


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


def main():  # pragma: nocover
    env = bootstrap("development.ini")
    from geoportailv3_geoportal.models import LuxGetfeatureDefinition

    package = env["registry"].settings["package"]
    directory = "%s/locale/" % package
    destination = path.join(directory, "%s-tooltips.pot" % package)

    w = codecs.open(destination, "wt", encoding="utf-8")
    w.write(
        u'''#, fuzzy
        msgid ""
        msgstr ""
        "MIME-Version: 1.0\\n"
        "Content-Type: text/plain; charset=utf-8\\n"
        "Content-Transfer-Encoding: 8bit\\n"
        '''
    )

    results = DBSession.query(LuxGetfeatureDefinition).\
        filter(LuxGetfeatureDefinition.remote_template == False).filter(
            LuxGetfeatureDefinition.template.in_
            (['default.html', 'default_table.html'])).all()  # noqa

    fields = []
    for result in results:
        engine = sqlahelper.get_engine(result.engine_gfi)
        first_row = None
        if result.query is not None and len(result.query) > 0:
            if "SELECT" in result.query.upper():
                first_row = DBSession.execute(result.query).first()
            else:
                first_row =\
                    DBSession.execute("SELECT * FROM " + result.query).first()
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
                    w.write(
                        u'''#: engine:%(engine)s Layer:%(layer)s Role:%(role)s
        msgid "f_%(name)s"
        msgstr ""
        ''' % {
                            "engine": result.engine_gfi,
                            "layer": result.layer,
                            "role": result.role,
                            "name": attribute,
                        }
                    )
    print("tooltips Pot file updated: %s" % destination)
