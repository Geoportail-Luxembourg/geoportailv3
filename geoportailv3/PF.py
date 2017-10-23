# -*- coding: utf-8 -*-
from suds.client import Client
from geoportailv3.models import LuxMeasurementLoginCommune
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
            Client('https://titan.etat.lu/xxpfoWS/ParcelDetailVer1' +
                   'Service/META-INF/wsdl/ParcelDetailVer1Service.wsdl')
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
            if town_info.get('inDirectory') is not None and \
               len(town_info.get('inDirectory')) > 0:
                path = "/mesurage/pdf/%s/%s/" % (town_info.get('inDirectory'),
                                                 town_info.get('name'))

            else:
                path = "/mesurage/pdf/%s/" % (town_info.get('name'))
            files = os.listdir(path)

            mes = self._add_char_before(5, measurement_number)
            files_list = []
            for curFile in files:
                if curFile.startswith(mes):
                    files_list.append({'filename': curFile,
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
        return self._get_town_list().get(town_code)

    def _get_town_by_name(self, town_name):
        town_list = self._get_town_list()
        for town, town_info in town_list.items():
            if (town_info.get("name") == town_name):
                return town_info
        return None

    def _get_town_list(self):
        town_codes = {
            1: {'name': "ARSDORF", "shortName": "ARSD",
                "townNum": "1", "inDirectory": "RAMBROUCH"},
            2: {'name': 'ASSELBORN', 'shortName': 'ASSE',
                "townNum": "2", "inDirectory": "WINCRANGE"},
            3: {'name': 'BASCHARAGE', 'shortName': 'BASC',
                "townNum": "3", "inDirectory": "KAERJENG"},
            4: {'name': 'BASTENDORF', 'shortName': 'BAST',
                "townNum": "4", "inDirectory": "TANDEL"},
            5: {'name': 'BEAUFORT', 'shortName': 'BEAU',
                "townNum": "5", "inDirectory": ""},
            6: {'name': 'BECH', 'shortName': 'BECH',
                "townNum": "6", "inDirectory": ""},
            7: {'name': 'BECKERICH', 'shortName': 'BECK',
                "townNum": "7", "inDirectory": ""},
            8: {'name': 'BERDORF', 'shortName': 'BERD',
                "townNum": "8", "inDirectory": ""},
            9: {'name': 'BERG', 'shortName': 'BERQ',
                "townNum": "9", "inDirectory": "COLMAR_BERG"},
            10: {'name': 'BERTRANGE', 'shortName': 'BERT',
                 "townNum": "10", "inDirectory": ""},
            11: {'name': 'BETTBORN', 'shortName': 'BETB',
                 "townNum": "11", "inDirectory": "PREIZERDAUL"},
            12: {'name': 'BETTEMBOURG', 'shortName': 'BETT',
                 "townNum": "12", "inDirectory": ""},
            13: {'name': 'BETTENDORF', 'shortName': 'BETD',
                 "townNum": "13", "inDirectory": ""},
            14: {'name': 'BETZDORF', 'shortName': 'BETZ',
                 "townNum": "14", "inDirectory": ""},
            15: {'name': 'BIGONVILLE', 'shortName': 'BIGO',
                 "townNum": "15", "inDirectory": "RAMBROUCH"},
            16: {'name': 'BISSEN', 'shortName': 'BISS',
                 "townNum": "16", "inDirectory": ""},
            17: {'name': 'BIWER', 'shortName': 'BIWE',
                 "townNum": "17", "inDirectory": ""},
            18: {'name': 'BOEVANGE_C', 'shortName': 'BOEC',
                 "townNum": "18", "inDirectory": "WINCRANGE"},
            19: {'name': 'BOEVANGE_M', 'shortName': 'BOEM',
                 "townNum": "19", "inDirectory": ""},
            20: {'name': 'BOULAIDE', 'shortName': 'BOUL',
                 "townNum": "20", "inDirectory": ""},
            21: {'name': 'BOURSCHEID', 'shortName': 'BOUR',
                 "townNum": "21", "inDirectory": ""},
            22: {'name': 'BOUS', 'shortName': 'BOUS',
                 "townNum": "22", "inDirectory": ""},
            23: {'name': 'BURMERANGE', 'shortName': 'BURM',
                 "townNum": "23", "inDirectory": "SCHENGEN"},
            24: {'name': 'CLEMENCY', 'shortName': 'CLEM',
                 "townNum": "24", "inDirectory": "KAERJENG"},
            25: {'name': 'CLERVAUX', 'shortName': 'CLER',
                 "townNum": "25", "inDirectory": "CLERVAUX"},
            26: {'name': 'CONSDORF', 'shortName': 'COND',
                 "townNum": "26", "inDirectory": ""},
            27: {'name': 'CONSTHUM', 'shortName': 'CONS',
                 "townNum": "27", "inDirectory": "PARC_HOSINGEN"},
            28: {'name': 'CONTERN', 'shortName': 'CONT',
                 "townNum": "28", "inDirectory": ""},
            29: {'name': 'DALHEIM', 'shortName': 'DELH',
                 "townNum": "29", "inDirectory": ""},
            30: {'name': 'DIEKIRCH', 'shortName': 'DIEK',
                 "townNum": "30", "inDirectory": ""},
            31: {'name': 'DIFFERDANGE', 'shortName': 'DIFF',
                 "townNum": "31", "inDirectory": ""},
            32: {'name': 'DIPPACH', 'shortName': 'DIPP',
                 "townNum": "32", "inDirectory": ""},
            33: {'name': 'DUDELANGE', 'shortName': 'DUDE',
                 "townNum": "33", "inDirectory": ""},
            34: {'name': 'ECHTERNACH', 'shortName': 'ECHT',
                 "townNum": "34", "inDirectory": ""},
            35: {'name': 'EICH', 'shortName': 'EICH',
                 "townNum": "35", "inDirectory": "LUXEMBOURG"},
            36: {'name': 'ELL', 'shortName': 'ELL_',
                 "townNum": "36", "inDirectory": ""},
            37: {'name': 'ERMSDORF', 'shortName': 'ERMS',
                 "townNum": "37", "inDirectory": "VALLEE_ERNZ"},
            38: {'name': 'ERPELDANGE', 'shortName': 'ERPE',
                 "townNum": "38", "inDirectory": ""},
            39: {'name': 'ESCH_ALZETTE', 'shortName': 'ESCH',
                 "townNum": "39", "inDirectory": ""},
            40: {'name': 'ESCH_SURE', 'shortName': 'ESCS',
                 "townNum": "40", "inDirectory": "ESCH_SURE"},
            41: {'name': 'ESCHWEILER', 'shortName': 'ESCW',
                 "townNum": "41", "inDirectory": "WILTZ"},
            42: {'name': 'ETTELBRUCK', 'shortName': 'ETTE',
                 "townNum": "42", "inDirectory": ""},
            43: {'name': 'FEULEN', 'shortName': 'FEUL',
                 "townNum": "43", "inDirectory": ""},
            44: {'name': 'FISCHBACH', 'shortName': 'FISC',
                 "townNum": "44", "inDirectory": ""},
            45: {'name': 'FLAXWEILER', 'shortName': 'FLAX',
                 "townNum": "45", "inDirectory": ""},
            46: {'name': 'FOLSCHETTE', 'shortName': 'FOLS',
                 "townNum": "46", "inDirectory": "RAMBROUCH"},
            47: {'name': 'FOUHREN', 'shortName': 'FOUH',
                 "townNum": "47", "inDirectory": "TANDEL"},
            48: {'name': 'FRISANGE', 'shortName': 'FRIS',
                 "townNum": "48", "inDirectory": ""},
            49: {'name': 'GARNICH', 'shortName': 'GARN',
                 "townNum": "49", "inDirectory": ""},
            50: {'name': 'GOESDORF', 'shortName': 'GOES',
                 "townNum": "50", "inDirectory": ""},
            51: {'name': 'GREVENMACHER', 'shortName': 'GREV',
                 "townNum": "51", "inDirectory": ""},
            52: {'name': 'GROSBOUS', 'shortName': 'GROS',
                 "townNum": "52", "inDirectory": ""},
            53: {'name': 'HACHIVILLE', 'shortName': 'HACH',
                 "townNum": "53", "inDirectory": "WINCRANGE"},
            54: {'name': 'HAMM', 'shortName': 'HAMM',
                 "townNum": "54", "inDirectory": "LUXEMBOURG"},
            55: {'name': 'HARLANGE', 'shortName': 'HARL',
                 "townNum": "55", "inDirectory": "LAC_HAUTE_SURE"},
            56: {'name': 'HEFFINGEN', 'shortName': 'HEFF',
                 "townNum": "56", "inDirectory": ""},
            57: {'name': 'HEIDERSCHEID', 'shortName': 'HEID',
                 "townNum": "57", "inDirectory": "ESCH_SURE"},
            58: {'name': 'HEINERSCHEID', 'shortName': 'HEIN',
                 "townNum": "58", "inDirectory": "CLERVAUX"},
            59: {'name': 'HESPERANGE', 'shortName': 'HESP',
                 "townNum": "59", "inDirectory": ""},
            60: {'name': 'HOBSCHEID', 'shortName': 'HOBS',
                 "townNum": "60", "inDirectory": ""},
            61: {'name': 'HOLLERICH', 'shortName': 'HOLL',
                 "townNum": "61", "inDirectory": "LUXEMBOURG"},
            62: {'name': 'HOSCHEID', 'shortName': 'HOSC',
                 "townNum": "62", "inDirectory": "PARC_HOSINGEN"},
            63: {'name': 'HOSINGEN', 'shortName': 'HOSI',
                 "townNum": "63", "inDirectory": "PARC_HOSINGEN"},
            64: {'name': 'JUNGLINSTER', 'shortName': 'JUNG',
                 "townNum": "64", "inDirectory": "JUNGLINSTER"},
            65: {'name': 'KAUTENBACH', 'shortName': 'KAUT',
                 "townNum": "65", "inDirectory": "KIISCHPELT"},
            66: {'name': 'KAYL', 'shortName': 'KAYL',
                 "townNum": "66", "inDirectory": ""},
            67: {'name': 'KEHLEN', 'shortName': 'KEHL',
                 "townNum": "67", "inDirectory": ""},
            68: {'name': 'KOERICH', 'shortName': 'KOER',
                 "townNum": "68", "inDirectory": ""},
            69: {'name': 'KOPSTAL', 'shortName': 'KOPS',
                 "townNum": "69", "inDirectory": ""},
            70: {'name': 'LAROCHETTE', 'shortName': 'LARO',
                 "townNum": "70", "inDirectory": ""},
            71: {'name': 'LENNINGEN', 'shortName': 'LENN',
                 "townNum": "71", "inDirectory": ""},
            72: {'name': 'LEUDELANGE', 'shortName': 'LEUD',
                 "townNum": "72", "inDirectory": ""},
            73: {'name': 'LINTGEN', 'shortName': 'LINT',
                 "townNum": "73", "inDirectory": ""},
            74: {'name': 'LORENTZWEILER', 'shortName': 'LORE',
                 "townNum": "74", "inDirectory": ""},
            75: {'name': 'LUXEMBOURG', 'shortName': 'LUXE',
                 "townNum": "75", "inDirectory": "LUXEMBOURG"},
            76: {'name': 'MAMER', 'shortName': 'MAME',
                 "townNum": "76", "inDirectory": ""},
            77: {'name': 'MANTERNACH', 'shortName': 'MANT',
                 "townNum": "77", "inDirectory": ""},
            78: {'name': 'MECHER', 'shortName': 'MECH',
                 "townNum": "78", "inDirectory": "LAC_HAUTE_SURE"},
            79: {'name': 'MEDERNACH', 'shortName': 'MEDE',
                 "townNum": "79", "inDirectory": "VALLEE_ERNZ"},
            80: {'name': 'MERSCH', 'shortName': 'MERS',
                 "townNum": "80", "inDirectory": ""},
            81: {'name': 'MERTERT', 'shortName': 'MERT',
                 "townNum": "81", "inDirectory": ""},
            82: {'name': 'MERTZIG', 'shortName': 'MERZ',
                 "townNum": "82", "inDirectory": ""},
            83: {'name': 'MOMPACH', 'shortName': 'MOMP',
                 "townNum": "83", "inDirectory": ""},
            84: {'name': 'MONDERCANGE', 'shortName': 'MONC',
                 "townNum": "84", "inDirectory": ""},
            85: {'name': 'MONDORF', 'shortName': 'MOND',
                 "townNum": "85", "inDirectory": ""},
            86: {'name': 'MUNSHAUSEN', 'shortName': 'MUNS',
                 "townNum": "86", "inDirectory": "CLERVAUX"},
            87: {'name': 'NEUNHAUSEN', 'shortName': 'NEUN',
                 "townNum": "87", "inDirectory": "ESCH_SURE"},
            88: {'name': 'NIEDERANVEN', 'shortName': 'NIED',
                 "townNum": "88", "inDirectory": ""},
            89: {'name': 'NOMMERN', 'shortName': 'NOMM',
                 "townNum": "89", "inDirectory": ""},
            90: {'name': 'OBERWAMPACH', 'shortName': 'OBER',
                 "townNum": "90", "inDirectory": "WINCRANGE"},
            91: {'name': 'PERLE', 'shortName': 'PERL',
                 "townNum": "91", "inDirectory": "RAMBROUCH"},
            92: {'name': 'PETANGE', 'shortName': 'PATA',
                 "townNum": "92", "inDirectory": ""},
            93: {'name': 'PUTSCHEID', 'shortName': 'PUTS',
                 "townNum": "93", "inDirectory": ""},
            94: {'name': 'RECKANGE', 'shortName': 'RECK',
                 "townNum": "94", "inDirectory": ""},
            95: {'name': 'REDANGE', 'shortName': 'REDA',
                 "townNum": "95", "inDirectory": ""},
            96: {'name': 'REISDORF', 'shortName': 'REIS',
                 "townNum": "96", "inDirectory": ""},
            97: {'name': 'REMERSCHEN', 'shortName': 'REME',
                 "townNum": "97", "inDirectory": "SCHENGEN"},
            98: {'name': 'REMICH', 'shortName': 'REMI',
                 "townNum": "98", "inDirectory": ""},
            99: {'name': 'RODENBOURG', 'shortName': 'RODE',
                 "townNum": "99", "inDirectory": "JUNGLINSTER"},
            100: {'name': 'ROESER', 'shortName': 'ROES',
                  "townNum": "100", "inDirectory": ""},
            101: {'name': 'ROLLINGERGRUND', 'shortName': 'ROLL',
                  "townNum": "101", "inDirectory": "LUXEMBOURG"},
            102: {'name': 'ROSPORT', 'shortName': 'ROSP',
                  "townNum": "102", "inDirectory": ""},
            103: {'name': 'RUMELANGE', 'shortName': 'RUME',
                  "townNum": "103", "inDirectory": ""},
            104: {'name': 'SAEUL', 'shortName': 'SAEU',
                  "townNum": "104", "inDirectory": ""},
            105: {'name': 'SANDWEILER', 'shortName': 'SAND',
                  "townNum": "105", "inDirectory": ""},
            106: {'name': 'SANEM', 'shortName': 'SANE',
                  "townNum": "106", "inDirectory": ""},
            107: {'name': 'SCHIEREN', 'shortName': 'SCHR',
                  "townNum": "107", "inDirectory": ""},
            108: {'name': 'SCHIFFLANGE', 'shortName': 'SCHI',
                  "townNum": "108", "inDirectory": ""},
            109: {'name': 'SCHUTTRANGE', 'shortName': 'SCHU',
                  "townNum": "109", "inDirectory": ""},
            110: {'name': 'SEPTFONTAINES', 'shortName': 'SEPT',
                  "townNum": "110", "inDirectory": ""},
            111: {'name': 'STADTBREDIMUS', 'shortName': 'STAD',
                  "townNum": "111", "inDirectory": ""},
            112: {'name': 'STEINFORT', 'shortName': 'STEI',
                  "townNum": "112", "inDirectory": ""},
            113: {'name': 'STEINSEL', 'shortName': 'STES',
                  "townNum": "113", "inDirectory": ""},
            114: {'name': 'STRASSEN', 'shortName': 'STRA',
                  "townNum": "114", "inDirectory": ""},
            115: {'name': 'TROISVIERGES', 'shortName': 'TROI',
                  "townNum": "115", "inDirectory": ""},
            116: {'name': 'TUNTANGE', 'shortName': 'TUNT',
                  "townNum": "116", "inDirectory": ""},
            117: {'name': 'USELDANGE', 'shortName': 'USEL',
                  "townNum": "117", "inDirectory": ""},
            118: {'name': 'VIANDEN', 'shortName': 'VIAN',
                  "townNum": "118", "inDirectory": ""},
            119: {'name': 'VICHTEN', 'shortName': 'VICH',
                  "townNum": "119", "inDirectory": ""},
            120: {'name': 'WAHL', 'shortName': 'WAHL',
                  "townNum": "120", "inDirectory": ""},
            121: {'name': 'WALDBILLIG', 'shortName': 'WALD',
                  "townNum": "121", "inDirectory": ""},
            122: {'name': 'WALDBREDIMUS', 'shortName': 'WALB',
                  "townNum": "122", "inDirectory": ""},
            123: {'name': 'WALFERDANGE', 'shortName': 'WALF',
                  "townNum": "123", "inDirectory": ""},
            124: {'name': 'WEILER_LA_TOUR', 'shortName': 'WEIL',
                  "townNum": "124", "inDirectory": ""},
            125: {'name': 'WEISWAMPACH', 'shortName': 'WEIS',
                  "townNum": "125", "inDirectory": ""},
            126: {'name': 'WELLENSTEIN', 'shortName': 'WELL',
                  "townNum": "126", "inDirectory": "SCHENGEN"},
            127: {'name': 'WILTZ', 'shortName': 'WILT',
                  "townNum": "127", "inDirectory": "WILTZ"},
            128: {'name': 'WILWERWILTZ', 'shortName': 'WILW',
                  "townNum": "128", "inDirectory": "KIISCHPELT"},
            129: {'name': 'WINSELER', 'shortName': 'WINS',
                  "townNum": "129", "inDirectory": ""},
            130: {'name': 'WORMELDANGE', 'shortName': 'WORM',
                  "townNum": "130", "inDirectory": ""}
            }
        return town_codes

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
                       town_info.get("townNum")).count() > 0):
            return True

        return False
