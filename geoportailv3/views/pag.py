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
from geoportailv3.portail import PortailSession
from geoportailv3.portail import PagDownload

_ = TranslationStringFactory("geoportailv3-server")
log = logging.getLogger(__name__)


class Pag(object):

    def __init__(self, request):
        self.request = request
        self.config = self.request.registry.settings
        self.localizer = get_localizer(self.request)

    def __download(self, num):
        if self.staging:
            url = "%s?PAG_PCN_OBJECTID=%s&token=%s" % (
                 self.config["pag"]["staging_url"],
                 num,
                 self.config["pag"]["fme_token"])
        else:
            url = "%s?PAG_PCN_OBJECTID=%s&token=%s" % (
                 self.config["pag"]["prod_url"],
                 num,
                 self.config["pag"]["fme_token"])
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
        oc = owncloud.Client(self.config["pag"]["owncloud_internal_url"])
        oc.login(self.config["pag"]["owncloud_user"],
                 self.config["pag"]["owncloud_password"])
        oc.put_file(os.path.basename(self.filename), self.filename)
        link_info = oc.share_file_with_link(os.path.basename(self.filename))
        self.link = link_info.link.replace(
            self.config["pag"]["owncloud_internal_url"],
            self.config["pag"]["owncloud_external_url"])
        self.link += "&download"
        os.remove(self.filename)
        return

    def __send_mail(self, email):
        if self.link == 'error':
            mailtext = _("PAG Error during report generation")
        else:
            mailtext = _("PAG Mail the report link ${link}",
                         mapping={'link': self.link})
        msg = MIMEText(self.localizer.translate(mailtext), 'html', 'utf-8')
        me = 'support@geoportail.lu'
        you = email
        mails = [you]
        if "bcc_address" in self.config["pag"]:
            bcc = self.config["pag"]["bcc_address"]
            msg['BCC'] = bcc
            mails.append(bcc)
        msg['Subject'] = 'Rapport PAG'
        msg['From'] = me
        msg['To'] = you

        s = smtplib.SMTP(self.config["pag"]["smtp_server"])
        s.sendmail(me, mails, msg.as_string())
        s.quit()
        return

    def __log_download_stats(self, objectids, download_link):
        pag_download = PagDownload()
        pag_download.objectids = objectids
        pag_download.download_link = download_link
        PortailSession.add(pag_download)
        PortailSession.commit()

    @view_config(route_name='pag_files')
    def pag_files(self, ):
        _file = self.request.matchdict.get('_file', None)
        if _file.find("_PE_") > -1:
            folder = "PartieEcrite"
        else:
            folder = "PartieGraphique"
        url = "%s/%s/%s" % (self.config["pag"]["file_server"], folder, _file)
        try:
            req = urllib2.Request(url)
            req.add_header('Cache-Control', 'max-age=0')
            f = urllib2.urlopen(req, None, 15)
            data = f.read()
        except:
            log.error(sys.exc_info()[0])
            data = None
            log.debug(url)
        headers = {'Content-Type': 'document/pdf'}
        return Response(data, headers=headers)

    @view_config(route_name='pag_report')
    def pag_report(self):
        oid = self.request.matchdict.get('oid', None)
        email = self.request.params.get('email', None)
        self.staging = self.request.params.get('staging', False)
        resp = _("PAG webservice response ${email}",
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
