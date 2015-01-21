from pyramid.paster import bootstrap
env = bootstrap('development.ini')

import psycopg2
from psycopg2.extras import DictCursor
import json
import sys
from pyramid_es import get_client
from elasticsearch import helpers
from elasticsearch.helpers import BulkIndexError
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
    cursor = conn.cursor(cursor_factory=DictCursor)
    query = "Select *, ST_Transform(\"searchLayer\".geom,4326) as geom_4326 \
            from public.\"searchLayer\";"
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


def statuslog(text):
    sys.stdout.write(text)
    sys.stdout.flush()


if __name__ == '__main__':
    client = get_client(env['request'])
#    recreate_index()
    statuslog("\rCreating Database Query ")
    c = get_cursor()
    counter = 1
    while True:
        multiple = 1000
        results = c.fetchmany(multiple)
        doc_list = []
        for result in results:
            action = {
                "_index": client.index,
                "_type": "poi",
                "_id": str(result['id']),
            }
            action['_source'] = extract_document(result['id'], result)
            doc_list.append(action)
            statuslog("\rIndexed Elements: %i" % int(counter))
            counter = counter + 1
        try:
            helpers.bulk(client.es, doc_list, chunk_size=multiple)
        except BulkIndexError as e:
            statuslog(e.errors)
            break
        if not results:
            statuslog("\n")
            break
