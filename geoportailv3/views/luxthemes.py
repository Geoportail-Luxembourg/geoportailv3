from pyramid.view import view_config
from c2cgeoportal.models import DBSession, Theme
import logging

log = logging.getLogger(__name__)


class LuxThemes(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='isthemeprivate', renderer='json')
    def is_theme_private(self):
        theme = self.request.params.get('theme', '')

        cnt = DBSession.query(Theme).filter(
            Theme.public == False).filter(
            Theme.name == theme).count()  # noqa

        if cnt == 1:
            return {'name': theme, 'is_private': True}

        return {'name': theme, 'is_private': False}
