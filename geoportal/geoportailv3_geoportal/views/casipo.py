﻿# -*- coding: UTF-8 -*-
from pyramid.i18n import get_localizer, TranslationStringFactory
from pyramid.view import view_config
from pyramid.response import Response
from c2cgeoportal_commons.models import DBSessions, DBSession
import logging
import owncloud
import shutil
import os
import smtplib
import urllib.request
from email.mime.text import MIMEText
import time
import datetime
import sys

_ = TranslationStringFactory("geoportailv3_geoportal-server")
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
        db_ecadastre = DBSessions['ecadastre']
        cnt = 0
        try:
            sql = "select nextval_daily ('casipo_seq')"
            results = DBSession.execute(sql)
            for res in results:
                cnt = res[0]
        except Exception as e:
            log.exception(e)
        try:
            f = urllib.request.urlopen(url, None, 1800)
            data = f
            # YYYYMMJJ_Commune_Extrait_CASIPO_nn.pdf
            commune = ""
            sql = "select commune_administrative FROM DIFFDATA.communes_adm_cad_sections WHERE code_commune = " + str(int(num[0:3])) + " GROUP BY commune_administrative"
            results = db_ecadastre.execute(sql)
            for res in results:
                commune = res['commune_administrative']

            self.filename = '/tmp/%s_%s_Extrait_CASIPO_%s.pdf' % (str(datetime.datetime.now().strftime("%Y%m%d")), commune, str(cnt))
            with open(self.filename, 'wb') as fp:
                shutil.copyfileobj(data, fp)
        except Exception as e:
            log.exception(e)
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
        except Exception as e:
            log.exception(e)
            self.link = 'error'
        self.__log_download_stats(oid, self.link)
        self.__send_mail(email)
        headers = {"Content-Type": 'text/html'}
        return Response(self.localizer.translate(resp), headers=headers)
