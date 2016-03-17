from elasticsearch import Elasticsearch


ES_ANALYSIS = {
    'analysis': {
        'tokenizer': {
            'ngram_tokenizer': {
                'type': 'edgeNGram',
                'min_gram': 1,
                'max_gram': 12,
                'token_chars': [
                    'letter',
                    'digit'
                ]
            }
        },
        'analyzer': {
            'ngram_analyzer': {
                'type': 'custom',
                'tokenizer': 'ngram_tokenizer',
                'filter': [
                    'lowercase',
                    'asciifolding',
                ]
            },
            'simplified_analyzer': {
                'type': 'custom',
                'tokenizer': 'standard',
                'filter': [
                    'lowercase',
                    'asciifolding',
                    'elision'
                ]
            },
            'standard_analyzer': {
                'type': 'custom',
                'tokenizer': 'whitespace',
                'filter':  [
                    'lowercase'
                ]
            }
        }
    }
}

ES_MAPPINGS = {
    'poi': {
        'properties': {
            'object_id': {'type': 'string', 'index': 'not_analyzed'},
            'layer_name': {'type': 'string', 'index': 'not_analyzed'},
            'label': {
                'type': 'string',
                'analyzer': 'standard_analyzer',
                'fields': {
                    'ngram': {
                        'type': 'string',
                        'analyzer': 'ngram_analyzer',
                        'search_analyzer': 'simplified_analyzer'
                    },
                    'simplified': {
                        'type': 'string',
                        'analyzer': 'simplified_analyzer',
                        'search_analyzer': 'simplified_analyzer'
                    }
                }
            },
            'public': {'type': 'boolean', 'index': 'not_analyzed'},
            'params': {'type': 'string', 'index': 'not_analyzed'},
            'role_id': {'type': 'integer', 'index': 'not_analyzed'},
            'ts': {'type': 'geo_shape'},
        }
    }
}


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
        settings = {}
        settings['settings'] = ES_ANALYSIS
        settings['mappings'] = ES_MAPPINGS
        client.indices.create(index,
                              body=settings)
