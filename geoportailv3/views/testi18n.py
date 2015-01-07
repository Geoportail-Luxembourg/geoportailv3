from pyramid.view import view_config
from pyramid.response import Response
from pyramid.threadlocal import get_current_registry

class I18n(object):
    def __init__(self,request):
            self.request = request

    @view_config(route_name='testi18n', renderer='testi18n.html')
    def testi18n(self):
        _ = self.request.translate
        return {'title': _('title i18n'), 'language': self.request.locale_name }
