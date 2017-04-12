from elasticsearch import Elasticsearch
import json

with open('geoportailv3/lib/index_settings.json') as json_file:
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
