from elasticsearch import Elasticsearch


ES_CONFIG = {
    'settings': {
        "analysis": {
            "filter": {
                "autocomplete": {
                    "type": "edgeNGram",
                    "min_ngram": 2,
                    "max_ngram": 15,
                    "side": "front"
                }
            },
            "analyzer": {
                "autocomplete": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "asciifolding","autocomplete"]
                }
            }
        }
    },
    'mappings': {
        'properties': {
            'object_id': {'type': 'string'},
            'layer_name': {'type': 'string'},
            'label': {
                'type': 'string',
                'index_analyzer': 'autocomplete',
                'search_analyer': 'whitespace'
            },
            'public': {'type': 'boolean'},
            'params': {'type': 'string'},
            'role_id': {'type': 'integer'},
            'ts': {'type': 'geo_shape'},
        }
    }
}


def get_es(request):
    elasticHost = \
        request.registry.settings.get('elastic.servers', 'localhost:9200')
    return Elasticsearch(elasticHost)


def get_index(request):
    return request.registry.settings.get('elastic.index', 'index')


def ensure_index(client, index, recreate=False):
    exists = client.indices.exists(index)
    if recreate or not exists:
        if exists:
            client.indices.delete(index)
        client.indices.create(index,
                              body=dict(settings=ES_CONFIG))
