# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
from io import StringIO
import urllib.request
import httplib2
from pyramid.httpexceptions import HTTPBadRequest, HTTPBadGateway
import logging
import json
import os

log = logging.getLogger(__name__)

class Metadata(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='get_metadata')
    def get_metadata(self):
        lang = self.request.params.get("lang", "fr")
        langs = {'fr': 'fre',
                 'de': 'ger',
                 'en': 'eng',
                 'lb': 'ltz'}

        id = self.request.params.get("uid", None)
        callback_param =  self.request.params.get("cb", None)
        if id is None:
            return HTTPBadRequest()
        base_url = os.environ["GEONETWORK_BASE_URL"]
        url = "{}/srv/{}/q?_content_type=json&_isTemplate=y+or+n&_uuid_OR__id={}&fast=index".format(base_url, langs[lang], id)
        timeout = 15
        try:
            f = urllib.request.urlopen(url, None, timeout)
            data = f.read()
        except Exception as e:
            log.exception(e)
            log.error(url)
            return HTTPBadGateway()

        if callback_param is None:
            headers = {"Content-Type": f.info()['Content-Type']}
            return Response(data, headers=headers)

        headers = {"Content-Type": "text/javascript"}
        return Response("{}({})".format(callback_param, json.dumps(json.loads(data))), headers=headers)
