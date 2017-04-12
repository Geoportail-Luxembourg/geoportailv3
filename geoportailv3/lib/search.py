from elasticsearch import Elasticsearch


ES_ANALYSIS = {
    'analysis': {
        'tokenizer': {
            'ngram_tokenizer': {
                'type': 'nGram',
                'min_gram': 1,
                'max_gram': 12,
                'token_chars': [
                    'letter',
                    'digit'
                ]
            },
            'edge_ngram_tokenizer': {
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
            'edge_ngram_analyzer': {
                'type': 'custom',
                'tokenizer': 'edge_ngram_tokenizer',
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
    'layer': {
        'properties': {
            'language': {'type': 'keyword', 'index': 'not_analyzed'},
            'layer_id': {'type': 'keyword', 'index': 'not_analyzed'},
            'name': {'type': 'keyword', 'index': 'not_analyzed'},
            'public': {'type': 'boolean', 'index': 'not_analyzed'},
            'params': {'type': 'text', 'index': 'not_analyzed'},
            'role_id': {'type': 'integer', 'index': 'not_analyzed'},
            'name_translated': {
                'type': 'text',
                'analyzer': 'standard',
                'fields': {
                    'ngram': {
                        'type': 'text',
                        'analyzer': 'ngram_analyzer',
                        'search_analyzer': 'standard'
                    },
                    'simplified': {
                        'type': 'text',
                        'analyzer': 'standard',
                        'search_analyzer': 'standard'
                    }
                }
            },
            'metadata_name': {
                'type': 'text',
                'analyzer': 'standard',
                'fields': {
                    'ngram': {
                        'type': 'text',
                        'analyzer': 'ngram_analyzer',
                        'search_analyzer': 'standard'
                    },
                    'simplified': {
                        'type': 'text',
                        'analyzer': 'standard',
                        'search_analyzer': 'standard'
                    }
                }
            },
            'keywords': {
                'type': 'text',
                'analyzer': 'standard',
                'search_analyzer': 'standard'
            },
            'description': {
                'type': 'text',
                'analyzer': 'standard',
                'search_analyzer': 'standard'
            },
        }
    },
    'poi': {
        'properties': {
            'object_id': {'type': 'keyword', 'index': 'not_analyzed'},
            'fk': {'type': 'keyword', 'index': 'not_analyzed'},
            'layer_name': {'type': 'keyword', 'index': 'not_analyzed'},
            'label': {
                'type': 'text',
                'analyzer': 'standard_analyzer',
                'fields': {
                    'ngram': {
                        'type': 'text',
                        'analyzer': 'edge_ngram_analyzer',
                        'search_analyzer': 'simplified_analyzer'
                    },
                    'simplified': {
                        'type': 'text',
                        'analyzer': 'simplified_analyzer',
                        'search_analyzer': 'simplified_analyzer'
                    }
                }
            },
            'public': {'type': 'boolean', 'index': 'not_analyzed'},
            'params': {'type': 'text', 'index': 'not_analyzed'},
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
        client.indices.create(index, body=settings)
