# -*- coding: utf-8 -*-

# Copyright (c) 2011-2015, Camptocamp SA
# All rights reserved.

# Redistribution and use in source and
# binary forms, with or without
# modification, are permitted provided
# that the following conditions are met:

# 1.    Redistributions of source code must
#       retain the above copyright notice, this
#       list of conditions and the following disclaimer.
# 2.    Redistributions in binary form mustg
#       reproduce the above copyright notice,
#       this list of conditions and theg
#       following disclaimer in the documentation
#       and/or other materials provided
#       with the distribution.

# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT
# HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES,
# INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND
# FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE
# COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
# EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
# OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND
# ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.

# The views and conclusions contained in the
# software and documentation are those
# of the authors and should not be interpreted
# as representing official policies,
# either expressed or implied, of the FreeBSD Project.

import json
import logging
from cStringIO import StringIO

from pyramid.view import view_config

from PyPDF2 import PdfFileMerger
import weasyprint

from c2cgeoportal.views.printproxy import PrintProxy
from c2cgeoportal.lib.caching import NO_CACHE, get_region

log = logging.getLogger(__name__)
cache_region = get_region()


class LuxPrintProxy(PrintProxy):

    ref_spec = {}

    @view_config(route_name="lux_printproxy_report_create")
    def lux_report_create(self):
        resp, content = self._proxy("%s/report.%s" % (
            self.config["print_url"],
            self.request.matchdict.get("format")
        ))

        job = json.loads(content)
        self.ref_spec[job["ref"]] = json.loads(
            self.request.body
        )["attributes"]

        return self._build_response(
            resp, content, False, "print"
        )

    @view_config(route_name="lux_printproxy_report_cancel")
    def lux_cancel(self):
        ref = self.request.matchdict.get("ref")
        del self.ref_spec[ref]
        return self.cancel()

    @cache_region.cache_on_arguments()
    def _get_legend(self, name, lang):
        css = weasyprint.CSS(
            string="@attributes{ size: 595px 842px; margin: 20px; } "
            "img {max-height: 800px}"
        )

        url = \
            "http://wiki.geoportail.lu/doku.php?" \
            "id=%s:legend:%s&do=export_html" % \
            (lang, name)
        log.info("Get legend from URL:\n%s." % url)

        legend_buffer = StringIO()
        weasyprint.HTML(url).write_pdf(
            legend_buffer,
            stylesheets=[css]
        )
        return legend_buffer

    @view_config(route_name="lux_printproxy_report_get")
    def lux_report_get(self):
        ref = self.request.matchdict.get("ref")
        resp, content = self._proxy("%s/report/%s" % (
            self.config["print_url"], ref
        ))

        attributes = self.ref_spec[ref]

        if "legend" in attributes:
            merger = PdfFileMerger()
            merger.append(StringIO(content))

            lang = attributes.get("lang")

            for item in attributes["legend"]:
                merger.append(self._get_legend(item["name"], lang))

            content = StringIO()
            merger.write(content)
            content = content.getvalue()

        del self.ref_spec[ref]

        return self._build_response(
            resp, content, NO_CACHE, "print"
        )
