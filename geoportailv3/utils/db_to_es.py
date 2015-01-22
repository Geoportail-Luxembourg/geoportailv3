from pyramid.paster import bootstrap
env = bootstrap('development.ini')

import psycopg2
from psycopg2.extras import DictCursor
import sys
from elasticsearch import helpers
from elasticsearch.helpers import BulkIndexError
from shapely.wkb import loads
from shapely.geometry import mapping
from geoportailv3.lib.search import get_es, get_index, ensure_index


request = env['request']


def get_cursor():
    source_conf = {
        'database': 'search',
        'user': 'postgres',
        'password': '',
        'host': 'luigipw',
        'port': '5432'
    }
    conn = psycopg2.connect(**source_conf)
    cursor = conn.cursor(cursor_factory=DictCursor)
    query = "Select *, ST_Transform(\"searchLayer\".geom,4326) as geom_4326 \
            from public.\"searchLayer\" ;"
    cursor.execute(query)
    return cursor


def update_document(index, type, obj_id, obj=None):
    doc = {
        "_index": index,
        "_type": "poi",
        "_id": obj_id,
    }
    doc['_source'] = {}
    geom = loads(obj['geom_4326'], hex=True)
    if geom.is_valid:
        doc['_source']['ts'] = mapping(geom)
    else:
        print '\nInvalid Geom: %s (%s): %s \n' % (obj['type'], 
                                                  obj['id'], 
                                                  obj['label'])
    doc['_source']['object_id'] = obj_id
    doc['_source']['object_type'] = 'poi'
    doc['_source']['layer_name'] = obj['type']
    doc['_source']['label'] = obj['label']
    doc['_source']['role_id'] = 1
    doc['_source']['public'] = True
    return doc

def statuslog(text):
    sys.stdout.write(text)
    sys.stdout.flush()


if __name__ == '__main__':
    ensure_index(get_es(request), get_index(request), True)
    statuslog("\rCreating Database Query ")
    c = get_cursor()
    counter = 1
    while True:
        multiple = 1000
        results = c.fetchmany(multiple)
        doc_list = []
        for result in results:
            doc = update_document(get_index(request), 'poi', result['id'], result)
            doc_list.append(doc)
            statuslog("\rIndexed Elements: %i" % int(counter))
            counter = counter + 1
        try:
            helpers.bulk(client=get_es(request),
                         actions=doc_list,
                         chunk_size=multiple,
                         raise_on_error=True)
        except BulkIndexError as e:
            print "\n %s" % e
        if not results:
            statuslog("\n")
            break
