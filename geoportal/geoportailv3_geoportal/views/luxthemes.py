import logging
import re

from c2cgeoportal_commons.models import DBSession, main
from c2cgeoportal_geoportal.lib.caching import get_region
from c2cgeoportal_geoportal.lib.wmstparsing import TimeInformation
from c2cgeoportal_geoportal.views.theme import Theme
from pyramid.view import view_config

from geoportailv3_geoportal.models import LuxLayerInternalWMS

log = logging.getLogger(__name__)

CACHE_REGION = get_region("std")


class LuxThemes(Theme):

    @view_config(route_name='isthemeprivate', renderer='json')
    def is_theme_private(self):
        theme = self.request.params.get('theme', '')

        cnt = DBSession.query(main.Theme).filter(
            main.Theme.public == False).filter(
            main.Theme.name == theme).count()  # noqa

        if cnt == 1:
            return {'name': theme, 'is_private': True}

        return {'name': theme, 'is_private': False}

    @view_config(route_name="themes", renderer="json")
    def themes(self):
        """Fake capabilities for Internal WMS"""
        return super().themes()

    def _wms_layers(self, ogc_server):
        """Fake capabilities for Internal WMS"""
        if ogc_server.name == "Internal WMS":
            return self._wms_layers_internal(), set()

        return super()._wms_layers(ogc_server)

    @CACHE_REGION.cache_on_arguments()
    def _wms_layers_internal(self):
        """Fake capabilities for Internal WMS"""
        wms_layers = []
        for layer in DBSession.query(LuxLayerInternalWMS):
            wms_layers += layer.layers.split(",") if layer.layers else []

        return {
            "layers": {
                name: {
                    "children": [],
                    "info": [],
                }
                for name in set(wms_layers)
            }
        }
