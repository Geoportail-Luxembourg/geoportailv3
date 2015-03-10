from pyramid.view import view_config
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest
import logging
import urllib2
from urlparse import urljoin
import html5lib

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
        document = html5lib.parse(html)
        for img in document.iter("{http://www.w3.org/1999/xhtml}img"):
            img.set("src", urljoin(url, img.get("src")))
        for link in document.iter("{http://www.w3.org/1999/xhtml}link"):
            link.set("href", urljoin(url, link.get("href")))
        headers = {"Content-Type": 'text/html'}
        output = html5lib.serialize(document,
                                    quote_attr_values=True,
                                    omit_optional_tags=False,
                                    use_trailing_solidus=True,
                                    quote_char=u"'")
        return Response(output, headers=headers)
