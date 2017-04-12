# -*- coding: utf-8 -*-

from elasticsearch import Elasticsearch


ES_ANALYSIS = {
    'analysis': {
        'filter': {
            'synonyms_filter': {
                'type': 'synonym',
                'ignore_case': True,
                'synonyms': [
                    'Ste, Ste., Sainte',
                    'Pl, Place',
                    'zac, z.a.c., zone artisanale et commerciale'
                ]
            }
        },
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
            'poi_edge_ngram_analyzer': {
                'type': 'custom',
                'tokenizer': 'edge_ngram_tokenizer',
                'filter': [
                    'lowercase',
                    'asciifolding',
                    'synonyms_filter',
                ]
            },
            'simplified_analyzer': {
                'type': 'custom',
                'tokenizer': 'standard',
                'filter': [
                    'lowercase',
                    'asciifolding',
                    'elision',
                ]
            },
            'poi_simplified_analyzer': {
                'type': 'custom',
                'tokenizer': 'standard',
                'filter': [
                    'lowercase',
                    'asciifolding',
                    'synonyms_filter',
                    'elision',
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
            'language': {'type': 'string', 'index': 'not_analyzed'},
            'layer_id': {'type': 'string', 'index': 'not_analyzed'},
            'name': {
                'index': 'not_analyzed',
                'type': 'string',
            },
            'name_translated': {
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
            'metadata_name': {
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
            'keywords': {
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
            'description': {
                'type': 'string',
                'analyzer': 'simplified_analyzer',
                'search_analyzer': 'simplified_analyzer'
                },
            'public': {'type': 'boolean', 'index': 'not_analyzed'},
            'params': {'type': 'string', 'index': 'not_analyzed'},
            'role_id': {'type': 'integer', 'index': 'not_analyzed'},
        }
    },
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
                        'analyzer': 'poi_edge_ngram_analyzer',
                        'search_analyzer': 'simplified_analyzer'
                    },
                    'simplified': {
                        'type': 'string',
                        'analyzer': 'poi_simplified_analyzer',
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
        client.indices.create(index, body=settings)
