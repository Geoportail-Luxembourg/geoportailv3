# -*- coding: utf-8 -*-
from pyramid.response import Response
from pyramid.view import view_config
from c2cgeoportal_geoportal.lib.caching import set_common_headers, NO_CACHE

class Ping(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name="ping")
    def ping(self):
        response = self.request.response
        response.text = "pong"

        return set_common_headers(
            self.request, "ping", NO_CACHE
        )
