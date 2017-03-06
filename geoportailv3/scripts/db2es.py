# -*- coding: utf-8 -*-

from pyramid.paster import bootstrap
import psycopg2
from psycopg2.extras import DictCursor
import sys
import getopt
import json
from elasticsearch import helpers
from elasticsearch.helpers import BulkIndexError
from elasticsearch.exceptions import ConnectionTimeout
from geoportailv3.lib.search import get_elasticsearch, get_index, ensure_index

"""
Utility functions for importing data into Elasticsearch from database
"""


def get_cursor():
    source_conf = {
        'database': 'search',
        'user': 'postgres',
        'password': '',
        'host': 'luigi11',
        'port': '5432'
    }
    conn = psycopg2.connect(**source_conf)
    cursor = conn.cursor(cursor_factory=DictCursor)
    query = "Select *, ST_AsGeoJSON(ST_Transform(\"searchLayer\".geom,4326)) as geom_4326 \
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
    doc['_source']['ts'] = json.loads(obj['geom_4326'])
    doc['_source']['object_id'] = obj_id
    doc['_source']['fk'] = obj['fk']
    doc['_source']['object_type'] = 'poi'
    doc['_source']['layer_name'] = obj['type']
    doc['_source']['label'] = obj['label']
    doc['_source']['role_id'] = 1
    doc['_source']['public'] = True
    return doc


def statuslog(text):
    sys.stdout.write(text)
    sys.stdout.flush()


def main():
    env = bootstrap('development.ini')
    request = env['request']
    try:
        opts, args = getopt.getopt(sys.argv[1:], 'ri', ['reset', 'index'])
    except getopt.GetoptError as err:
        print str(err)
        sys.exit(2)
    index, reset = False, False
    for o, a in opts:
        if o in ('-r', '--reset'):
            statuslog('\rResetting Index')
            reset = True
        if o in ('-i', '--index'):
            statuslog('\rChecking Index')
            index = True

    ensure_index(get_elasticsearch(request), get_index(request), reset)

    if index:
        statuslog("\rCreating Database Query ")
        c = get_cursor()
        counter = 1
        while True:
            multiple = 250
            results = c.fetchmany(multiple)
            doc_list = []
            for result in results:
                doc = update_document(get_index(request),
                                      'poi',
                                      result['id'],
                                      result)
                doc_list.append(doc)
                statuslog("\rIndexed Elements: %i" % int(counter))
                counter = counter + 1
            try:
                helpers.bulk(client=get_elasticsearch(request),
                             actions=doc_list,
                             chunk_size=multiple,
                             raise_on_error=True)
            except (BulkIndexError, ConnectionTimeout) as e:
                print "\n %s" % e
            if not results:
                statuslog("\n")
                break


if __name__ == '__main__':
    main()
