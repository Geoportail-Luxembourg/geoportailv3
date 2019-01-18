# -*- coding: UTF-8 -*-
from pyramid.i18n import get_localizer, TranslationStringFactory
from pyramid.view import view_config
from pyramid.response import Response
import logging
import owncloud
import shutil
import os
import smtplib
import urllib2
from email.mime.text import MIMEText
import time
import sys

_ = TranslationStringFactory("geoportailv3-server")
log = logging.getLogger(__name__)


class Casipo(object):

    def __init__(self, request):
        self.request = request
        self.config = self.request.registry.settings
        self.localizer = get_localizer(self.request)

    def __download(self, num):
        if self.staging:
            url = "%s?ids=%s&token=%s" % (
                 self.config["casipo"]["staging_url"],
                 num,
                 self.config["casipo"]["fme_token"])
        else:
            url = "%s?ids=%s&token=%s" % (
                 self.config["casipo"]["prod_url"],
                 num,
                 self.config["casipo"]["fme_token"])
        try:
            f = urllib2.urlopen(url, None, 1800)
            data = f
            self.filename = '/tmp/%s_%s.pdf' % (num, str(int(time.time())))
            with open(self.filename, 'wb') as fp:
                shutil.copyfileobj(data, fp)
        except:
            log.error(sys.exc_info()[0])
            data = None
            log.debug(url)
        return

    def __upload2owncloud(self):
        oc = owncloud.Client(self.config["casipo"]["owncloud_internal_url"])
        oc.login(self.config["casipo"]["owncloud_user"],
                 self.config["casipo"]["owncloud_password"])
        oc.put_file(os.path.basename(self.filename), self.filename)
        link_info = oc.share_file_with_link(os.path.basename(self.filename))
        self.link = link_info.get_link().replace(
            self.config["casipo"]["owncloud_internal_url"],
            self.config["casipo"]["owncloud_external_url"])
        self.link += "/download"
        os.remove(self.filename)
        return

    def __send_mail(self, email):
        if self.link == 'error':
            mailtext = _("CASIPO Error during report generation")
        else:
            mailtext = _("CASIPO Mail the report link ${link}",
                         mapping={'link': self.link})
        msg = MIMEText(self.localizer.translate(mailtext), 'html', 'utf-8')
        me = 'support@geoportail.lu'
        you = email
        mails = [you]
        if "bcc_address" in self.config["casipo"]:
            bcc = self.config["casipo"]["bcc_address"]
            msg['BCC'] = bcc
            mails.append(bcc)
        msg['Subject'] = 'Rapport CASIPO'
        msg['From'] = me
        msg['To'] = you

        s = smtplib.SMTP(self.config["casipo"]["smtp_server"])
        s.sendmail(me, mails, msg.as_string())
        s.quit()
        return

    def __log_download_stats(self, objectids, download_link):
        pass

    @view_config(route_name='casipo_report')
    def casipo_report(self):
        oid = self.request.matchdict.get('oid', None)
        email = self.request.params.get('email', None)
        self.staging =\
            self.request.params.get('staging', 'False').lower() == 'true'
        resp = _("CASIPO webservice response ${email}",
                 mapping={'email': email.encode('utf-8')})
        try:
            self.__download(oid)
            self.__upload2owncloud()
        except:
            log.error(sys.exc_info()[0])
            self.link = 'error'
        self.__log_download_stats(oid, self.link)
        self.__send_mail(email)
        headers = {"Content-Type": 'text/html'}
        return Response(self.localizer.translate(resp), headers=headers)
