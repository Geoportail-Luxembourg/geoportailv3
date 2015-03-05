from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest
import logging
import urllib2
log = logging.getLogger(__name__)


class LegendPreparer(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='preparelegend')
    def preparelegend(self):
        legendname = self.request.params.get('legendName', '')
        lang = self.request.params.get('lang', 'fr')
        if len(legendname) == 0:
            return HTTPBadRequest()
        url = 'http://wiki.geoportail.lu/doku.php?\
              id=%s:legend:%s&do=export_html' % (lang, legendname)

        response = urllib2.urlopen(url)
        html = response.read()
        html = html.replace("\"", "'")
        html = html.replace("href='/", "href='http://wiki.geoportail.lu/")
        html = html.replace("src='/", "src='http://wiki.geoportail.lu/")
        headers = {"Content-Type": 'text/html'}
        return Response(html, headers=headers)
