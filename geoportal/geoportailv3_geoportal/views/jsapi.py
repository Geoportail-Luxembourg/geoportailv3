from pyramid.view import view_config
import csv
import logging
from c2cgeoportal_geoportal.views.entry import Entry
from pyramid.i18n import make_localizer, TranslationStringFactory
from pyramid.interfaces import ITranslationDirectories
from pyramid.threadlocal import get_current_registry
from pyramid.renderers import render
from c2cgeoportal_commons import models
from c2cgeoportal_commons.models import main, static
from c2cgeoportal_geoportal.lib import get_url2
from pyramid.response import Response

log = logging.getLogger(__name__)


class JsapiEntry(Entry):
    @view_config(route_name='jsapithemesfull',
                 renderer='json')
    def apithemes_full(self):
        t = []
        themes, errors = self._themes(None, 1, u'main', True, 2, True)
        client = TranslationStringFactory("geoportailv3_geoportal-client")
        registry = get_current_registry()
        dir = registry.queryUtility(ITranslationDirectories, default=[])
        localizer_fr = make_localizer("fr", dir)
        localizer_de = make_localizer("de", dir)
        localizer_en = make_localizer("en", dir)
        localizer_lb = make_localizer("lb", dir)

        for theme in themes:
            entry = models.DBSession.query(main.Theme).filter(main.Theme.id == theme['id']).one()
            t.append({
                'id': entry.id,
                'public': entry.public,
                'name': entry.name,
                'name_fr': localizer_fr.translate(client(entry.name)),
                'name_de': localizer_de.translate(client(entry.name)),
                'name_en': localizer_en.translate(client(entry.name)),
                'name_lb': localizer_lb.translate(client(entry.name))
            })
        return t

    @view_config(route_name='jsapilayersfull',
                 renderer='json')
    def apilayers_full(self):
        '''
        View to return a list of layers.
        Same as the theme service but in a flat representation.
        '''
        themes, errors = self._themes(None, 1, u'main', True, 2, True)

        layers = {}
        # get themes layers
        for theme in themes:
            self._extract_layers_with_path(theme, layers, [theme['name']])

        # get background layers
        group, errors = self._get_group(None, u'background', None, u'main', 2)

        self._extract_layers(group, layers, True)
        l = []
        registry = get_current_registry()
        dir = registry.queryUtility(ITranslationDirectories, default=[])
        localizer_fr = make_localizer("fr", dir)
        localizer_de = make_localizer("de", dir)
        localizer_en = make_localizer("en", dir)
        localizer_lb = make_localizer("lb", dir)

        client = TranslationStringFactory("geoportailv3_geoportal-client")
        all_errors = set()

        for id in layers:
            url = None
            if 'ogcServer' in layers[id]:
                if 'source for' in layers[id]['ogcServer']:
                    for ogc_server in models.DBSession.query(main.OGCServer).filter(main.OGCServer.name == layers[id]['ogcServer']).all():
                        # required to do every time to validate the url.
                        if ogc_server.auth != main.OGCSERVER_AUTH_NOAUTH:
                            url = self.request.route_url("mapserverproxy", _query={"ogcserver": ogc_server.name})
                        else:
                            url = get_url2(
                                "The OGC server '{}'".format(ogc_server.name),
                                ogc_server.url, self.request, errors=all_errors
                            )

            entry = models.DBSession.query(main.Layer).filter(main.Layer.id == id).one()
            is_public = entry.public

            l.append({
                'id': layers[id]['id'],
                'public': is_public,
                'name': layers[id]['name'],
                'name_fr': localizer_fr.translate(client(layers[id]['name'])),
                'name_de': localizer_de.translate(client(layers[id]['name'])),
                'name_en': localizer_en.translate(client(layers[id]['name'])),
                'name_lb': localizer_lb.translate(client(layers[id]['name'])),
                'external_url': url,
                'groups': layers[id].get('came_from'),
                'metadata_id': layers[id]['metadata']['metadata_id'] if 'metadata_id' in layers[id]['metadata'] else None,
                })
        return l

    @view_config(route_name='jsapilayers',
                 renderer='json')
    def apilayers(self):
        '''
        View to return a list of layers.
        Same as the theme service but in a flat representation.
        '''
        themes, errors = self._themes(None, None, u'main', True, 2, True)

        layers = {}

        # get themes layers
        for theme in themes:
            self._extract_layers(theme, layers)

        # get background layers
        group, errors = self._get_group(None, u'background', None, u'main', 2)
        self._extract_layers(group, layers, True)
        all_errors = set()
        for id in layers:
            url = None
            if 'ogcServer' in layers[id]:
                if 'source for' in layers[id]['ogcServer']:
                    for ogc_server in models.DBSession.query(main.OGCServer).filter(main.OGCServer.name == layers[id]['ogcServer']).all():
                        # required to do every time to validate the url.
                        if ogc_server.auth != main.OGCSERVER_AUTH_NOAUTH:
                            url = self.request.route_url("mapserverproxy", _query={"ogcserver": ogc_server.name})
                        else:
                            url = get_url2(
                                "The OGC server '{}'".format(ogc_server.name),
                                ogc_server.url, self.request, errors=all_errors
                            )
                    layers[id]['url'] = url

        return layers

    @view_config(route_name='jsapiloader')
    def apiloader(self):
        config = self.settings
        referrer = config["referrer"]
        if "sc" in self.request.params and \
           referrer is not None and \
           "cookie_name" in referrer and \
           "cookie_value" in referrer and \
           "cookie_domain" in referrer:
            cookie_name = referrer["cookie_name"]
            cookie_value = referrer["cookie_value"]
            cookie_domain = referrer["cookie_domain"]
            self.request.response.set_cookie(
                cookie_name, value=cookie_value, domain=cookie_domain)
        result = render('geoportailv3_geoportal:templates/api/apiv3loader.js',{},
                request=self.request)
        response = Response(result)
        response.content_type = 'application/javascript'
        return response

    @view_config(route_name='jsapiexample',
                 renderer='geoportailv3_geoportal:templates/api/apiv3example.html')
    def apiexample(self):
        return {}
    def _extract_layers_with_path(self, node, layers, came_from):
        for child in node.get('children'):
            if 'children' in child:
                came_from.append(child['name'])
                self._extract_layers_with_path(child, layers, came_from)
                came_from.pop()
            else:
                if child.get('id') not in layers:
                    layers[child.get('id')] = child
                if 'came_from' not in layers[child.get('id')]:
                    layers[child.get('id')]['came_from'] = []
                layers[child.get('id')]['came_from'].append(came_from.copy())

    def _extract_layers(self, node, layers, bg=False):
        for child in node.get('children'):
            if 'children' in child:
                self._extract_layers(child, layers)
            else:
                if bg:
                    child['isBgLayer'] = True
                layers[child.get('id')] = child
