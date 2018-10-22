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
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import time
import sys

_ = TranslationStringFactory("geoportailv3-server")
log = logging.getLogger(__name__)


class Pds(object):

    def __init__(self, request):
        self.request = request
        self.config = self.request.registry.settings
        self.localizer = get_localizer(self.request)
        self.error = False
        self.filenames = []

    def __download(self, num):
        url = "%s?parcelid=%s" % (
             self.config["pds"]["prod_url"],
             num
             )
        try:
            f = urllib2.urlopen(url, None, 1800)
            data = f
            filename = '/tmp/%s_%s.pdf' % (num, str(int(time.time())))
            with open(filename, 'wb') as fp:
                shutil.copyfileobj(data, fp)
            self.filenames.append(filename)
        except:
            self.error = True
            log.error(sys.exc_info()[0])
            data = None
            log.debug(url)
        return


    def __send_mail(self, email, files):
        if self.error == True:
            mailtext = _(u'Bonjour,\n Il y a eu un souci lors de la '
                         + u'creation de votre '
                         + u'attestation "Plans directeurs '
                         + u'sectoriels".\n\nVeuillez essayer '
                         + u'plus tard".\n\nMeilleures salutations,\n'
                         + u'L\'Equipe de geoportail.lu et du DAT'
                         )        
        else:
            mailtext = _(u'Bonjour,\n Veuillez trouver en annexe '
                         + u'votre attestation "Plans directeurs '
                         + u'sectoriels".\n\nMeilleures salutations,\n'
                         + u'L\'Equipe de geoportail.lu et du DAT'
                         )
        msg = MIMEMultipart()
        me = 'support@geoportail.lu'
        you = email
        mails = [you]
        if "bcc_address" in self.config["pds"]:
            bcc = self.config["pds"]["bcc_address"]
            msg['BCC'] = bcc
            mails.append(bcc)
        else:
            print "no bcc_address in" + str(self.config["pds"])
        msg['Subject'] = 'Attestation PDS '
        msg['From'] = me
        msg['To'] = you
        msg.attach(MIMEText(mailtext))
        for f in files or []:
            with open(f, "rb") as fil:
                part = MIMEApplication(
                              fil.read(),
                              Name=os.path.basename(f)
                              )
                # After the file is closed
                a = 'attachment; filename="%s"' % os.path.basename(f)
                part['Content-Disposition'] = a
                msg.attach(part)
        s = smtplib.SMTP(self.config["pds"]["smtp_server"])
        s.sendmail(me, mails, msg.as_string())
        s.quit()
        return

    @view_config(route_name='pds_report')
    def pds_report(self):
        oid = self.request.matchdict.get('oid', None)
        email = self.request.params.get('email', None)

        resp = _("PDS webservice response ${email}",
                 mapping={'email': email.encode('utf-8')})
        oids = oid.split(",")
        for curOid in oids:
            try:
                self.__download(curOid)
            except:
                log.error(sys.exc_info()[0])
        self.__send_mail(email, self.filenames)
        headers = {"Content-Type": 'text/html'}
        return Response(self.localizer.translate(resp), headers=headers)
