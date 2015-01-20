from pyramid.paster import bootstrap
env = bootstrap('development.ini')

import psycopg2
import json
import sys
from pyramid_es import get_client
from elasticsearch import helpers
from shapely.wkb import loads
from shapely.geometry import mapping


ES_CONFIG = {
    'settings': {
    },
    'mappings': {
        'properties': {
            'object_id': {'type': 'string'},
            'layer_name': {'type': 'string'},
            'label': {'type': 'string'},
            'public': {'type': 'string'},
            'params': {'type': 'string'},
            'role_id': {'type': 'string'},
            'ts': {'type': 'geo_shape'},
        }
    }
}


def get_cursor():
    source_conf = {
        'database': 'search',
        'user': 'postgres',
        'password': '',
        'host': 'luigipw',
        'port': '5432'
    }
    conn = psycopg2.connect(**source_conf)
    cursor = conn.cursor()
    query = "Select *, ST_Transform(\"searchLayer\".geom,4326) as geom_4326 \
            from public.\"searchLayer\" ;"
    cursor.execute(query)
    return cursor


def extract_document(obj_id, obj=None):
    doc = {}
    geom = loads(obj['geom_4326'], hex=True)
    geojson = json.dumps(mapping(geom))
    doc['object_id'] = obj['id']
    doc['object_type'] = 'poi'
    doc['layer_name'] = obj['type']
    doc['label'] = obj['label']
    doc['ts'] = geojson
    return doc


def recreate_index():
    es = client.es
    if es.indices.exists(index=client.index):
        es.indices.delete(index=client.index)

    es.indices.create(index=client.index)
    es.indices.put_mapping(
        index=client.index,
        doc_type='poi',
        body=ES_CONFIG['mappings']
    )


def dictfetchmany(cursor, i):
    "Returns all rows from a cursor as a dict"
    desc = cursor.description
    return [
        dict(zip([col[0] for col in desc], row))
        for row in cursor.fetchmany(i)
    ]

if __name__ == '__main__':
    client = get_client(env['request'])
#    recreate_index()
    sys.stdout.write("\rCreating Database Query ")
    sys.stdout.flush()
    c = get_cursor()
    counter = 1
    while True:
        multiple = 1000
        results = dictfetchmany(c, multiple)
        doc_list = []
        for result in results:
            action = {
                "_index": client.index,
                "_type": "poi",
                "_id": str(result['id']),
            }
            action['_source'] = extract_document(result['id'], result)
            doc_list.append(action)
            sys.stdout.write("\rIndexed Elements: %i" % int(counter))
            sys.stdout.flush()
            counter = counter + 1
        helpers.bulk(client.es, doc_list)
        if not results:
            break
