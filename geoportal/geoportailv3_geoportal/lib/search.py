from elasticsearch import Elasticsearch
import json
import os

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), 'index_settings.json')

with open(SETTINGS_FILE) as json_file:
    settings = json.load(json_file)

def get_host():
    return os.environ['ELASTIC_SERVERS'] if 'ELASTIC_SERVERS' in os.environ else 'localhost:9200'


def get_elasticsearch(request):
    return Elasticsearch(hosts=get_host(), timeout=60)


def get_index(request):
    return os.environ['ELASTIC_INDEX'] if 'ELASTIC_INDEX' in os.environ else 'index'


def ensure_index(client, index, recreate=False):
    exists = client.indices.exists(index)
    if recreate or not exists:
        if exists:
            client.indices.delete(index)
        client.indices.create(index, body=settings)
