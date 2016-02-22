# -*- coding: utf-8 -*-
from c2cgeoportal.lib.caching import set_common_headers, NO_CACHE
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPBadRequest


class Profile(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name="echocsv")
    def echo_csv(self):

        name = self.request.params.get("name")
        if name is None:
            return HTTPBadRequest("name parameter is required")

        csv = self.request.params.get("csv")
        if csv is None:
            return HTTPBadRequest("csv parameter is required")

        charset = "utf-8"
        response = self.request.response
        response.body = csv.encode(charset)
        response.charset = charset
        response.content_disposition = ("attachment; filename=%s.csv"
                                        % (name.replace(" ", "_")))
        return set_common_headers(
            self.request, "exportcsv", NO_CACHE,
            content_type="application/csv"
        )
