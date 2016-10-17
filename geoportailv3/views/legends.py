# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from cStringIO import StringIO
import weasyprint


class Legends(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='get_png')
    def get_png(self):
        css = weasyprint.CSS(
            string="img {max-height: 450px}"
        )

        lang = self.request.params.get("lang")
        name = self.request.params.get("name")

        url = \
            "http://wiki.geoportail.lu/doku.php?" \
            "id=%s:legend:%s&do=export_html" % \
            (lang, name)

        legend_buffer = StringIO()
        weasyprint.HTML(url, media_type="screen").write_png(
            legend_buffer,
            stylesheets=[css]
        )

        headers = {"Content-Type": "image/png"}

        return Response(legend_buffer.getvalue(), headers=headers)
