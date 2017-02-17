# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from cStringIO import StringIO
from bs4 import BeautifulSoup
import weasyprint
import urllib2


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
            "https://wiki.geoportail.lu/doku.php?" \
            "id=%s:legend:%s&do=export_html" % \
            (lang, name)

        legend_buffer = StringIO()
        weasyprint.HTML(url, media_type="screen").write_png(
            legend_buffer,
            stylesheets=[css]
        )

        headers = {"Content-Type": "image/png"}

        return Response(legend_buffer.getvalue(), headers=headers)

    @view_config(route_name='get_html')
    def get_html(self):
        lang = self.request.params.get("lang")
        name = self.request.params.get("name")
        if lang == 'lb':
            lang = 'lu'
        url = \
            "https://wiki.geoportail.lu/doku.php?" \
            "id=%s:legend:%s&do=export_html" % \
            (lang, name)

        f = urllib2.urlopen(url, None, 15)
        data = f.read()
        data = data.replace(
            "/lib/exe/fetch.php",
            "https://wiki.geoportail.lu/lib/exe/fetch.php")
        data = data.replace(
            "src=\"img/", "src=\"https://wiki.geoportail.lu/img/")
        data = data.replace(
            "/lib/exe/detail.php",
            "https://wiki.geoportail.lu/lib/exe/detail.php")

        soup = BeautifulSoup(data, "lxml")
        a_tags = soup.find_all("a")
        for a_tag in a_tags:
            if a_tag.get('class') is not None and\
               'media' in a_tag.get('class'):
                a_tag['target'] = '_blank'
        img_tags = soup.find_all("img")
        for img_tag in img_tags:
            if img_tag.get('style') is None:
                img_tag['style'] = 'max-width:290px;'

        res = soup.find("div", {"class": "dokuwiki export"})
        data = res.encode_contents()

        headers = {"Content-Type": f.info()['Content-Type']}

        return Response(data, headers=headers)
