from pyramid.view import view_config
import logging
from c2cgeoportal.views.entry import Entry

log = logging.getLogger(__name__)


class JsapiEntry(Entry):

    @view_config(route_name='jsapilayers',
                 renderer='json')
    def apilayers(self):
        '''
        View to return a list of layers.
        Same as the theme service but in a flat representation.
        '''
        themes, errors = self._themes(None, u'desktop', True, 2, True)

        layers = {}

        # get themes layers
        for theme in themes:
            self._extract_layers(theme, layers)

        # get background layers
        group, errors = self._get_group(u'bglayers', None, u'desktop', 2)
        self._extract_layers(group, layers)
        return layers

    @view_config(route_name='jsapiloader',
                 renderer='geoportailv3:templates/api/apiv3loader.js')
    def apiloader(self):
        return {}

    @view_config(route_name='jsapiexample',
                 renderer='geoportailv3:templates/api/apiv3example.html')
    def apiexample(self):
        return {}

    def _extract_layers(self, node, layers):
        for child in node.get('children'):
            if 'children' in child:
                self._extract_layers(child, layers)
            else:
                layers[child.get('id')] = child
