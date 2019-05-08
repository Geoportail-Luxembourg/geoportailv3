from elasticsearch import Elasticsearch
import json
import os

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), 'index_settings.json')

with open(SETTINGS_FILE) as json_file:
    settings = json.load(json_file)


def get_elasticsearch(request):
    elastichost = \
        request.registry.settings.get('elastic.servers', 'localhost:9200')
    return Elasticsearch(hosts=elastichost, timeout=60)


def get_index(request):
    return request.registry.settings.get('elastic.index', 'index')


def ensure_index(client, index, recreate=False):
    exists = client.indices.exists(index)
    if recreate or not exists:
        if exists:
            client.indices.delete(index)
        client.indices.create(index, body=settings)
