# -*- coding: utf-8 -*-
import re

from pyramid.httpexceptions import HTTPBadRequest, HTTPInternalServerError
from pyramid.view import view_config

from geojson import Feature, FeatureCollection
from sqlalchemy import func, desc, or_, and_
from geoalchemy2.shape import to_shape

from c2cgeoportal.models import DBSession, FullTextSearch

from pyramid_es import get_client

class FullTextSearchView(object):

    def __init__(self, request):
        self.request = request
        if request.user:
            request.response.cache_control.private = True
        request.response.cache_control.max_age = \
            request.registry.settings["default_max_age"]
        self.settings = request.registry.settings.get('fulltextsearch', {})
        if 'languages' in self.settings:  # pragma: nocover
            self.languages = self.settings['languages']
        else:
            self.languages = {
                'fr': 'french',
                'en': 'english',
                'de': 'german',
            }

    @view_config(route_name='fulltextsearch', renderer='geojson')
    def fulltextsearch(self):

        try:
            lang = self.request.registry.settings['default_locale_name']
        except KeyError:
            return HTTPInternalServerError(
                detail='default_locale_name not defined in settings')
        try:
            lang = self.languages[lang]
        except KeyError:
            return HTTPInternalServerError(
                detail='%s not defined in languages' % lang)

        if 'query' not in self.request.params:
            return HTTPBadRequest(detail='no query')
        query = self.request.params.get('query')

        maxlimit = self.settings.get('maxlimit', 200)

        try:
            limit = int(self.request.params.get(
                'limit',
                self.settings.get('defaultlimit', 30)))
        except ValueError:
            return HTTPBadRequest(detail='limit value is incorrect')
        if limit > maxlimit:
            limit = maxlimit

        try:
            partitionlimit = int(self.request.params.get('partitionlimit', 0))
        except ValueError:
            return HTTPBadRequest(detail='partitionlimit value is incorrect')
        if partitionlimit > maxlimit:
            partitionlimit = maxlimit

        terms = '&'.join(re.sub("'", "''", w) + ':*' for w in query.split(' ') if w != '')
        _filter = "%(tsvector)s @@ to_tsquery('%(lang)s', '%(terms)s')" % \
            {'tsvector': 'ts', 'lang': lang, 'terms': terms}

        # flake8 does not like `== True`
        if self.request.user is None:
            _filter = and_(_filter, FullTextSearch.public.is_(True))
        else:
            _filter = and_(
                _filter,
                or_(
                    FullTextSearch.public.is_(True),
                    FullTextSearch.role_id.is_(None),
                    FullTextSearch.role_id == self.request.user.role.id
                )
            )

        client = get_client(self.request)
        query = client.query(q=terms)
        objs = query.execute(size=limit)

        features = []
        for o in objs:
            if o._source.ts is not None:
                properties = {
                    "label": o._source.label,
                    "layer_name": o._source.layer_name,
                }
                feature = o._source.ts 
                features.append(feature)

        # TODO: add callback function if provided in self.request, else return geojson
        return FeatureCollection(features)
