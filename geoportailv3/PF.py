# -*- coding: utf-8 -*-
from suds.client import Client
from geoportailv3.models import LuxMeasurementLoginCommune
from geoportailv3.models import LuxMeasurementDirectory
from sqlalchemy import func
import sqlahelper
import logging
import os
import sys


log = logging.getLogger(__name__)


# Classe pour accéder aux attributs de la publicité foncière##
# Les classes importées en haut ont été générées par wsdl2py
# dépendances: pyxml,fpconst,ZSI

class PF():
    def __init__(self):
        self.client = \
            Client('https://titan.etat.lu/xxpfoWS/ParcelDetailVer1Service/ParcelDetailVer1Service.wsdl')
        self.client_mesurage = \
            Client('https://titan.etat.lu/xxpfoWS/Measure' +
                   'mentVer1Service/META-INF/wsdl/MeasurementVer1Service.wsdl')
        self.log = logging.getLogger(__name__)
        self.dbsession = sqlahelper.get_session()

    def get_client(self):
        return self.client

    def get_client_mesurage(self):
        return self.client_mesurage

    def get_detail(self, code_commune, code_section,
                   numero_principal, numero_supplementaire):

        req = self.client.factory.create('parcelDetailRequestVer1')
        req.townCode = code_commune
        req.sectionCode = code_section
        req.mainNumber = numero_principal
        req.additionalNumber = numero_supplementaire
        resp = self.client.service.getParcelDetail(req)
        d = resp.parcelDetail
        return d

    def get_measurement_list(self, number_prim, number_sec,
                             section_code, town_code, user, referer):

        req = self.client_mesurage.factory.create('measurementRequestVer1')
        req.numberFrom = number_prim
        req.numberTo = number_prim
        req.numberSuppFrom = number_sec
        req.numberSuppTo = number_sec
        req.sectionCode = section_code
        req.townCode = town_code
        try:
            resp = self.client_mesurage.service.searchMeasurement(req)
        except Exception as e:
            log.exception(e)
            return []

        if not hasattr(resp, 'measurementList'):
                return []

        measurements = resp.measurementList

        if len(town_code) == 0:
            self.log.debug("Erreur le town code ne peut pas �tre vide")

        parc_id = self._add_char_before(3, town_code)

        parc_id = parc_id + section_code
        parc_id = parc_id + self._add_char_before(5, number_prim)
        parc_id = parc_id + self._add_char_before(6, number_sec)

        measurement_list = []

        for measurement in measurements:
            if measurement.parcelId == parc_id:
                if measurement.measurementNumber > 0:
                    measurement_files = \
                        self._get_pdf_file_path(town_code,
                                                measurement.measurementNumber,
                                                user, referer)

                    measurement.files = measurement_files['files'] if 'files' \
                        in measurement_files else None
                    measurement.town_info = measurement_files['town_info'] \
                        if 'town_info' in measurement_files else None
                    measurement_list.append(dict(measurement))

        return measurement_list

    def _get_pdf_file_path(self, town_code, measurement_number, user, referer):
        try:
            town_info = self._get_town_by_code(int(town_code))
            if town_info is None:
                return {}
            files = os.listdir(town_info.get('path'))

            mes = self._add_char_before(5, measurement_number)
            files_list = []
            for cur_file in files:
                if cur_file.startswith(mes):
                    files_list.append({'filename': cur_file,
                                       'is_downloadable':
                                       self._is_download_authorized(
                                           town_info.get('name'),
                                           user, referer)
                                       })

            if len(files_list) == 0:
                return {}

            return {"town_info": town_info,
                    "files": files_list}
        except:
            print sys.exc_info()
            return {}

    def _add_char_before(self, max_length, the_string):
        tmp = ""
        for i in range(max_length - len(str(the_string))):
            tmp = tmp + "0"
        return str(tmp) + str(the_string)

    # retourne l'information sur une commune
    def _get_town_by_code(self, town_code):
        cur_record = self.dbsession.query(LuxMeasurementDirectory).\
            filter(LuxMeasurementDirectory.town_code == town_code).first()
        if cur_record is not None:
            return {
                'name': cur_record.name,
                'town_code': cur_record.town_code,
                'path': cur_record.path
                }
        return None

    def _get_town_by_name(self, town_name):
        cur_record = self.dbsession.query(LuxMeasurementDirectory).\
            filter(LuxMeasurementDirectory.name == town_name).first()
        if cur_record is not None:
            return {
                'name': cur_record.name,
                'town_code': cur_record.town_code,
                'path': cur_record.path
                }
        return None

    def _is_download_authorized(self, town_name, user, referer):
        if referer is not None:
            if "bodfeature" in referer and "search4naila" in referer:
                return True
            if "weboffice_um" in referer:
                return True
        town_info = self._get_town_by_name(town_name)

        if (town_info is None or user is None or user.username is None):
            return False

        if (self.dbsession.query(LuxMeasurementLoginCommune).
                filter(func.lower(LuxMeasurementLoginCommune.login) ==
                       func.lower(func.geov3.getMainAccount(user.username))).
                filter(LuxMeasurementLoginCommune.num_commune ==
                       str(town_info.get('town_code'))).count() > 0):
            return True

        return False
