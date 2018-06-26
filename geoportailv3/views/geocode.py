# -*- coding: utf-8 -*-

from pyramid.view import view_config
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.response import Response
from geojson import loads as geojson_loads
from geoalchemy2 import func
from geoalchemy2.elements import WKTElement, WKBElement
from geoportailv3.geocode import Address, WKPOI, Neighbourhood
from shapely.wkt import loads
from geojson import dumps as geojson_dumps
from geoalchemy2.shape import to_shape

import re
import difflib


import logging
log = logging.getLogger(__name__)


class Geocode(object):

    def __init__(self, request):
        self.request = request

    # View used to get an adress from a coordinate.
    @view_config(route_name="reverse_geocode", renderer="json")
    def reverse(self):
        easting = self.request.params.get('easting', None)
        northing = self.request.params.get('northing', None)

        if easting is None or northing is None or\
           len(easting) == 0 or len(northing) == 0 or\
           re.match("^[0-9]*[.]{0,1}[0-9]*$", easting) is None or\
           re.match("^[0-9]*[.]{0,1}[0-9]*$", northing) is None:

            return HTTPBadRequest("Missing or invalid coordinates")

        distcol = func.ST_distance(WKTElement('POINT(%(x)s %(y)s)' % {
            "x": easting,
            "y": northing
        }, srid=2169), Address.geom)

        results = []

        for feature in self.request.db_ecadastre.query(
                Address.id_caclr_rue.label("id_caclr_rue"),
                Address.id_caclr_bat.label("id_caclr_bat"),
                Address.rue.label("rue"),
                Address.numero.label("numero"),
                Address.localite.label("localite"),
                Address.code_postal.label("code_postal"),
                func.ST_AsGeoJSON(Address.geom).label("geom"),
                distcol.label("distance")).order_by(distcol).limit(1):
            results.append({"id_caclr_street": feature.id_caclr_rue,
                            "id_caclr_bat": feature.id_caclr_bat,
                            "street": feature.rue,
                            "number": feature.numero,
                            "locality": feature.localite,
                            "postal_code": feature.code_postal,
                            "distance": feature.distance,
                            "geom": geojson_loads(feature.geom)
                            })

        return {'count': len(results), 'results': results}

    def get_formatted_address(self, p_num, p_street, p_locality, p_zip):
        num = p_num
        if num is None:
            num = ""
        if p_street is None:
            p_street = ""
        if p_locality is None:
            p_locality = ""
        if p_zip is None:
            p_zip = ""
        return num + "," + p_street + " " + p_locality + " " + p_zip

    def replace_words(self, p_string):
        if p_string is None:
            return None

        p_string = p_string .replace("-", " ").strip()
        p_string = p_string .replace(".", " ").strip()
        p_string = p_string .replace(",", " ").strip()
        p_string = p_string .replace(";", " ").strip()
        p_string = p_string .replace(": ", " ").strip()

        abbreviations = {u"p\.": u"place",
                         u"pl": u"place",
                         u"av": u"avenue",
                         u"bd": u"boulevard",
                         u"bvd": u"boulevard",
                         u"bld": u"boulevard",
                         u"zi": u"zone industrielle",
                         u"z i": u"zone industrielle",
                         u"z a c": u"zone activité",
                         u"zac": u"zone activité",
                         u"z a e": u"zone activité",
                         u"zone activité commerciale": u"zone activité",
                         u"zae": u"zone activité",
                         u"ctre": u"zone centre",
                         u"r": u"rue",
                         u"rte": u"route",
                         u"r\.": u"rue",
                         u"rt": u"route",
                         u"ob": u"",
                         u"de": u"",
                         u"des": u"",
                         u"du": u"",
                         u"le": u"",
                         u"la": u"",
                         u"les": u"",
                         u"op": u"",
                         u"um": u"",
                         u"an": u"",
                         u"imp": u"",
                         u"imp.": u"",
                         u"chat": u"chateau",
                         u"zone industrielle": u"",
                         u"ch": u"",
                         u"a": u"",
                         u"d": u"",
                         u"l": u"",
                         u"'": u" ",
                         u"1er": u"",
                         u"1 er": u"",
                         u"I er": u"",
                         u"ier": u"",
                         u"er": u"",
                         u"premier": u"1",
                         u"ste": u"sainte",
                         u"i": u"1",
                         u"un": u"1",
                         u"ii": u"2",
                         u"deux": u"2",
                         u"iii": u"3",
                         u"trois": u"3",
                         u"X": u"10",
                         u"XX": u"20",
                         u"eme": u"",
                         u"ème": u"",
                         u"2eme": u"2",
                         u"2ème": u"2",
                         u"st": u"",
                         u"1st": u"1",
                         u"nd": u"",
                         u"2nd": u"2"
                         }

        for abbrev in abbreviations:
            p_string = re.sub(
                r'\b%s\b' % abbrev, abbreviations[abbrev], p_string)

        p_string = re.sub(r'\([^)]*\)', '', p_string)

        p_string = p_string.replace(u"'", u" ")
        return p_string

    # Returns the zip code corresponding to the locality
    def get_zips_code_from_locality(self, locality, p_session):
        zips = []
        for feature in p_session.query(Address.code_postal, Address.localite).\
                filter("code_postal is not null").\
                group_by(Address.code_postal, Address.localite):
            ratio = difflib.SequenceMatcher(
                None, self.supprime_accent(locality.strip().lower()),
                re.sub(r'\([^)]*\)', '',
                       self.supprime_accent(feature.localite)).
                strip().lower()).ratio()

            if ratio > 0.80:
                zips.append(str(feature.code_postal).strip())

        return zips

    def encoded_locality_result(self, locality):
        locality_info = self.get_best_locality_name(
            locality, self.request.db_ecadastre, True)
        if locality_info is not None:
            if locality_info['locality'] is None:
                locality_info['locality'] = ""
            if locality_info['geom'] is None:
                features = self.request.db_ecadastre.query((func.ST_AsText(
                    func.ST_Centroid(
                        func.ST_Collect(Address.geom)))).label("geom"),
                            Address.localite).filter(
                            " lower(localite) = lower('" + locality + "')").\
                            group_by(Address.localite).all()
                for feature in features:
                    locality_info.locality = feature.localite
                    if isinstance(feature.geom, unicode) or\
                       isinstance(feature.geom, str):
                        locality_info['geom'] = loads(feature.geom)
                        if isinstance(feature.geom, WKBElement):
                            locality_info['geom'] = to_shape(feature.geom)

        if locality_info is not None and locality_info['geom'] is not None\
           and locality_info['geom'].centroid is not None and\
           locality_info['locality'] is not None:
            result = self.transform_to_latlon(
                locality_info['geom'].centroid.x,
                locality_info['geom'].centroid.y)

            return ({'name': self.get_formatted_address(
                None, None, locality_info['locality'], None),
                     'accuracy': 5,
                     'address': locality_info['locality'] + ',Luxembourg',
                     'country': 'Luxembourg',
                     'matching street': None,
                     'ratio': 0,
                     "easting": locality_info['geom'].centroid.x,
                     "northing": locality_info['geom'].centroid.y,
                     "geom": locality_info['geom'].centroid,
                     "geomlonlat": result.geom.centroid,
                     'AddressDetails': {
                "postnumber": None,
                "street": None,
                "zip": None,
                "locality": locality_info['locality']
            }
            })

        return self.encoded_country_result()

    def encoded_post_code_result(self, p_zip):
        features = self.request.db_ecadastre.query(
            (func.ST_AsText(func.ST_Centroid(func.ST_Collect(Address.geom)))).
            label("geom"),
            Address.localite).\
            filter(" lower(code_postal) = lower('" + p_zip + "')").\
            group_by(Address.localite).all()
        res = Address()
        for feature in features:
            res.localite = feature.localite
            if res.localite is not None:
                res.localite = res.localite.strip()
            if isinstance(feature.geom, unicode) or\
               isinstance(feature.geom, str):
                res.geom = loads(feature.geom)
            if isinstance(feature.geom, WKBElement):
                res.geom = to_shape(feature.geom)

        if res is not None and res.geom is not None and\
           res.geom.centroid is not None:
            result = self.transform_to_latlon(
                res.geom.centroid.x, res.geom.centroid.y)
            return ({'name': self.get_formatted_address(
                        None, None, res.localite, p_zip),
                     'accuracy': 5,
                     'address': p_zip + ' ' + res.localite + ',Luxembourg',
                     'country': 'Luxembourg',
                     'matching street': None,
                     'ratio': 0,
                     'easting': res.geom.centroid.x,
                     'northing': res.geom.centroid.y,
                     'geom': res.geom.centroid,
                     "geomlonlat": result.geom.centroid,
                     'AddressDetails': {
                "postnumber": None,
                "street": None,
                "zip": p_zip,
                "locality": None
            }
            })
        return self.encoded_country_result()

    def encoded_post_code_locality_result(self, p_zip, p_locality):
        features = self.request.db_ecadastre.query(
            (func.ST_AsText(func.ST_Centroid(func.ST_Collect(Address.geom)))).
            label("geom"), Address.localite).\
            filter(" lower(code_postal) = lower('" + p_zip + "')").\
            group_by(Address.localite)

        res = Address()
        for feature in features.all():
            res.localite = feature.localite
            if isinstance(feature.geom, unicode) or\
               isinstance(feature.geom, str):
                res.geom = loads(feature.geom)
            if isinstance(feature.geom, WKBElement):
                res.geom = to_shape(feature.geom)

        if res.localite is None:
            res.localite = ''
            features = self.request.db_ecadastre.query(
                (func.ST_AsText(func.ST_Centroid(
                    func.ST_Collect(Address.geom)))).
                label("geom"), Address.localite).\
                filter(" lower(localite) = lower('" + p_locality + "')").\
                group_by(Address.localite)
            for feature in features.all():
                res.localite = feature.localite
                p_zip = ""
                if isinstance(feature.geom, unicode) or\
                   isinstance(feature.geom, str):
                    res.geom = loads(feature.geom)
                if isinstance(feature.geom, WKBElement):
                    res.geom = to_shape(feature.geom)

        if res.localite is not None:
            res.localite = res.localite.strip()
        if res.geom is not None:
            result = self.transform_to_latlon(
                res.geom.centroid.x, res.geom.centroid.y)

            return ({'name': self.get_formatted_address(
                None, None, res.localite, p_zip),
                     'accuracy': 5,
                     'address': p_zip + " " + res.localite + ',Luxembourg',
                     'country': 'Luxembourg',
                     'matching street': None,
                     'ratio': 0,
                     'easting': res.geom.centroid.x,
                     'northing': res.geom.centroid.y,
                     'geom': res.geom.centroid,
                     "geomlonlat": result.geom.centroid,
                     'AddressDetails': {
                "postnumber": None,
                "street": None,
                "zip": p_zip,
                "locality": res.localite
            }
            })
        return self.encoded_country_result()

    def encoded_country_result(self):
        return ({'name': self.get_formatted_address(None, None, None, None),
                 'accuracy': 1,
                 'address': 'Luxembourg',
                 'country': 'Luxembourg',
                 'matching street': None,
                 'ratio': 0,
                 "geom": None,
                 'AddressDetails': {
            "postnumber": None,
            "street": None,
            "zip": None,
            "locality": None
        }
        })

    def encode_result(self, feature):
        numero = feature.numero
        if numero is None:
            numero = ""

        caclr_rue = ""
        if hasattr(feature, 'id_caclr_rue'):
            caclr_rue = feature.id_caclr_rue
        if caclr_rue is None:
            caclr_rue = ""

        caclr_bat = ""
        if hasattr(feature, 'id_caclr_bat'):
            caclr_bat = feature.id_caclr_bat
        if caclr_bat is None:
            caclr_bat = ""

        cur_geom = feature.geom
        if isinstance(cur_geom, unicode) or isinstance(cur_geom, str):
            cur_geom = loads(cur_geom)

        if isinstance(cur_geom, WKBElement):
            cur_geom = to_shape(cur_geom)

        code_postal = feature.code_postal
        if code_postal is None:
            code_postal = ""

        result = self.transform_to_latlon(
            cur_geom.centroid.x, cur_geom.centroid.y)

        return ({'name': self.get_formatted_address(
            str(numero).strip(),
            str(feature.rue.encode('utf-8')).strip(),
            str(code_postal).strip(),
            str(feature.localite.encode('utf-8')).strip()),
                 'accuracy': feature.accuracy,
                 'address':
                 str(numero).strip() + " " +
                 str(feature.rue.encode('utf-8')).strip() + "," +
                 str(code_postal).strip() + " " +
                 str(feature.localite.encode('utf-8')).strip(),
                 'matching street': feature.rue.strip(),
                 'ratio': feature.ratio,
                 "easting": cur_geom.centroid.x,
                 "northing": cur_geom.centroid.y,
                 "geom": cur_geom.centroid,
                 "geomlonlat": result.geom.centroid,
                 'AddressDetails': {
            "postnumber": str(feature.numero).strip(),
            "street": feature.rue.encode('utf-8').strip(),
            "zip": str(code_postal).strip(),
            "locality": str(feature.localite.encode('utf-8')).strip(),
            "id_caclr_street": str(caclr_rue),
            "id_caclr_building": str(caclr_bat)
        }})

    def transform_to_latlon(self, x, y):
        try:
            geomwgs = func.ST_AsText(func.ST_Centroid(func.ST_Transform(
                WKTElement(
                    'POINT(%(x)s %(y)s)' % {"x": x, "y": y}, 2169), 4326)))
            result = self.request.db_ecadastre.query(geomwgs.label(
                "geom"), WKPOI.geom.label("geom2")).first()
            if isinstance(result.geom, unicode) or\
               isinstance(result.geom, str):
                result.geom = loads(result.geom)
            return result
        except Exception as e:
            log.exception(e)
            self.request.db_ecadastre.rollback()
        return None

    # Returns true if zip code exists in database
    # else returns false
    def is_zip_code_exists(self, p_zip, p_session):
        if p_zip is None or len(p_zip) == 0:
            return False
        try:
            p_zip = str(int(float(re.sub("[^0-9]", "", p_zip))))
        except:
            pass

        return p_session.query(Address).\
            filter("code_postal = '" + p_zip + "'").count() > 0

    # Returns the best matching loçcality name.
    # For instance Esch/Alzette should return Esch sur Alzette
    def get_best_locality_name(self, p_locality, p_session, get_geom=False):
        if p_locality is None:
            return None

        is_neighbourhood = False
        p_locality = p_locality.replace(" sur ", "-sur-")
        p_locality = p_locality.replace("/", "-sur-")
        best_locality_name = None
        best_locality_geom = None
        best_locality_ratio = 0

        for feature in p_session.query((func.ST_AsText(func.ST_Centroid(
                func.ST_Collect(Address.geom)))).label("geom"),
                Address.localite).group_by(Address.localite).all():
            ratio = difflib.SequenceMatcher(
                None,
                self.supprime_accent(p_locality.strip().lower()),
                re.sub(
                    r'\([^)]*\)', '',
                    self.supprime_accent(feature.localite)).
                strip().lower()).ratio()

            if ratio > best_locality_ratio:
                best_locality_ratio = ratio
                best_locality_name = feature.localite.strip().lower()
                best_locality_geom = feature.geom

        if best_locality_ratio != 1:
            for feature in p_session.query(
                    (func.ST_AsText(func.ST_Centroid(Neighbourhood.geom))).
                    label("geom"),
                    Neighbourhood.id,
                    Neighbourhood.locality,
                    Neighbourhood.name).all():
                name = feature.name.strip().lower()
                name = name.replace("-", " ")

                ratio = difflib.SequenceMatcher(
                    None,
                    self.supprime_accent(p_locality.strip().lower()),
                    self.supprime_accent(name)).ratio()
                if ratio > best_locality_ratio:
                    best_locality_ratio = ratio
                    best_locality_name = feature.locality.strip().lower()
                    best_locality_geom = feature.geom
                    is_neighbourhood = True

        if best_locality_name is None:
            return None
        best_locality_name = best_locality_name.lower().strip()
        best_locality_name = self.supprime_accent(best_locality_name)

        if "luxembourg" in best_locality_name:
            best_locality_name = "luxembourg"

        if isinstance(best_locality_geom, unicode) or\
           isinstance(best_locality_geom, str):
            best_locality_geom = loads(best_locality_geom)
        if isinstance(best_locality_geom, WKBElement):
            best_locality_geom = to_shape(best_locality_geom)
        if get_geom:
            if best_locality_geom is None and is_neighbourhood:
                best_locality_ratio = 0

                for feature in p_session.query(
                     (func.ST_AsText(func.ST_Centroid(
                        func.ST_Collect(Address.geom)))).label("geom"),
                     Address.localite).filter(
                         func.lower(Address.localite) ==
                         best_locality_name.lower()).\
                        group_by(Address.localite).all():

                    ratio = difflib.SequenceMatcher(
                        None,
                        self.supprime_accent(
                            best_locality_name.strip().lower()),
                        re.sub(
                            r'\([^)]*\)', '',
                            self.supprime_accent(feature.localite)).strip().
                        lower()).ratio()

                    if ratio > best_locality_ratio:
                        best_locality_ratio = ratio
                        best_locality_geom = feature.geom
                        best_locality_name = feature.localite.strip().lower()

            if isinstance(best_locality_geom, unicode) or\
               isinstance(best_locality_geom, str):
                best_locality_geom = loads(best_locality_geom)
            if isinstance(best_locality_geom, WKBElement):
                best_locality_geom = to_shape(best_locality_geom)

            return {'locality': best_locality_name, 'geom': best_locality_geom}
        else:
            return best_locality_name

    def get_main_word(self, string, p_debug=False):
        words = string.split()

        if len(words) == 0:
            return ""
        i = -1
        while i >= (-1 * len(words)):
            if not self.is_int(words[i]):
                return words[i]
            i = i - 1

        return words[-1]

    # Find the main word in the 2 search sentences and compare them together
    # to find the best one
    def search_for_street(self, features, search, ratio, p_debug=False):
        results = []
        if search is not None:
            string1 = self.replace_words(
                search.lower()).strip()
            mw1 = self.get_main_word(string1, True)
            for feature in features:
                string2 = self.replace_words(self.supprime_accent(
                    feature.rue.lower()).strip())
                mw2 = self.get_main_word(self.supprime_accent(string2))
                cur_ratio = difflib.SequenceMatcher(None, mw1, mw2).ratio()

                if (cur_ratio > ratio):
                    feature.ratio = cur_ratio
                    feature.accuracy = 8
                    results.append(feature)
        return results

    def search_by_zips_and_house_number(
            self, p_ratio, p_num, p_street, p_locality, p_session):
        results = []
        # List of zip code belonging to the locality
        zips = self.get_zips_code_from_locality(p_locality, p_session)
        if len(zips) > 0:
            features =\
                p_session.query(Address).filter(
                    " code_postal::integer  in (" + (",".join(zips)) +
                    ") and lower('" + str(p_num).replace("'", "") +
                    "') = ANY  (regexp_split_to_array (lower(numero), '-'))").\
                all()

            if len(features) > 0:
                features = self.search_for_street(features, p_street, p_ratio)
                # Is a corresponding street existing ?
                if len(features) > 0:
                    for feature in features:
                        # accuracy = 8   Address level accuracy.
                        feature.accuracy = 8
                        results.append(self.encode_result(feature))

        return results

    def search_by_locality_and_house_number(
            self, p_ratio, p_num, p_street, p_locality, p_session,
            ratio_malus=1):

        results = []
        # List of zip code belonging to the locality
        if len(p_locality) > 0:
            features = p_session.query(Address).filter(
                " lower(localite) = '" + p_locality +
                "' and lower('" + str(p_num).replace("'", "") +
                "') = ANY  (regexp_split_to_array (lower(numero), '-'))").all()

            if len(features) > 0:
                features = self.search_for_street(features, p_street, p_ratio)
                # Is a corresponding street existing ?
                if len(features) > 0:
                    for feature in features:
                        # accuracy = 8   Address level accuracy.
                        if feature.ratio is not None and ratio_malus != 1:
                            feature.ratio = feature.ratio * ratio_malus
                        feature.accuracy = 8
                        results.append(self.encode_result(feature))
        return results

    def search_by_locality(
            self, p_ratio, p_street, p_locality, p_session, ratio_malus=1):
        results = []
        # List of zip code belonging to the locality

        if len(p_locality) > 0:
            features = p_session.query(
                (func.ST_AsText(func.ST_Centroid(func.ST_Collect(
                    Address.geom)))).label("geom"),
                Address.id_caclr_rue, Address.rue,
                Address.code_postal, Address.localite).filter(
                " lower(localite) = lower('" + p_locality + "')").\
                group_by(
                    Address.id_caclr_rue,
                    Address.rue,
                    Address.code_postal,
                    Address.localite).order_by(Address.rue).all()

            if len(features) > 0:
                features = self.search_for_street(
                    features, p_street, p_ratio, True)
                # Is a corresponding street existing ?
                if len(features) > 0:
                    for feature in features:
                        # accuracy = 6   Street level accuracy.
                        if feature.ratio is not None and ratio_malus != 1:
                            feature.ratio = feature.ratio * ratio_malus

                        feature.accuracy = 6
                        feature.numero = None
                        results.append(self.encode_result(feature))

        return results

    def search_in_well_known_poi_table(
            self, p_ratio, p_street, p_zip, p_locality, p_session):
        results = []
        try:
            if p_zip is not None and len(p_zip) > 0:
                try:
                    p_zip = str(int(float(re.sub("[^0-9]", "", p_zip))))
                    for feature in p_session.query(WKPOI).\
                            filter(" zip = " + p_zip).all():
                        cur_ratio = difflib.SequenceMatcher(
                            None,
                            self.supprime_accent(
                                self.replace_words(
                                    feature.name).strip().lower()),
                            self.replace_words(self.supprime_accent(p_street)).
                            strip().lower()).ratio()
                        if (cur_ratio > p_ratio):
                            feature.ratio = cur_ratio
                            feature.numero = None
                            feature.localite = feature.locality
                            feature.code_postal = feature.zip
                            if feature.street is not None:
                                feature.rue = feature.street
                            else:
                                feature.rue = feature.name

                            feature.accuracy = 7
                            results.append(self.encode_result(feature))
                except:
                    p_session.rollback()
                    log.error("Zip code is not correct: " + p_zip)
            if len(results) == 0 and p_locality is not None:
                for feature in\
                        p_session.query(WKPOI).\
                        filter(
                        " lower(locality) = lower('" + p_locality + "')").\
                        all():
                    cur_ratio = difflib.SequenceMatcher(
                        None,
                        self.supprime_accent(
                            self.replace_words(feature.name).strip().lower()),
                        self.replace_words(
                            self.supprime_accent(p_street)).strip().lower()).\
                        ratio()
                    if (cur_ratio > p_ratio):
                        feature.ratio = cur_ratio
                        feature.numero = None
                        feature.localite = feature.locality
                        feature.code_postal = feature.zip
                        if feature.street is not None:
                            feature.rue = feature.street
                        else:
                            feature.rue = feature.name

                        feature.accuracy = 7
                        results.append(self.encode_result(feature))

        except Exception as e:
            log.exception(e)
            p_session.rollback()

        return results

    def search_by_zips(self, p_ratio, p_street, p_locality, p_session):

        results = []
        # List of zip code belonging to the locality
        zips = self.get_zips_code_from_locality(p_locality, p_session)
        if len(zips) > 0:
            features = p_session.query(
                (func.ST_AsText(func.ST_Centroid(
                    func.ST_Collect(Address.geom)))).label("geom"),
                Address.id_caclr_rue, Address.rue,
                Address.code_postal, Address.localite).\
                filter(
                    " code_postal::integer  in (" + (",".join(zips)) + ")").\
                group_by(
                    Address.id_caclr_rue,
                    Address.rue,
                    Address.code_postal,
                    Address.localite).all()

            if len(features) > 0:
                features = self.search_for_street(features, p_street, p_ratio)
                # Is a corresponding street existing ?
                if len(features) > 0:
                    for feature in features:
                        """
                            accuracy = 6   Street level accuracy.
                        """
                        feature.accuracy = 6
                        feature.numero = None
                        results.append(self.encode_result(feature))

        return results

    def search_by_zip(
            self, p_ratio, p_street, p_zip, p_session, ratio_malus=1):
        results = []
        if p_zip is None:
            return results

        features = p_session.query(
            Address.id_caclr_rue,
            Address.rue,
            Address.code_postal,
            Address.localite,
            (func.ST_AsText(func.ST_Centroid(func.ST_Collect(Address.geom)))).
            label('geom')).\
            filter(" code_postal::integer  = (" + str(p_zip) + ") ").\
            group_by(
                Address.id_caclr_rue,
                Address.rue,
                Address.code_postal,
                Address.localite).all()
        if len(features) > 0:
            features = self.search_for_street(
                features, p_street, p_ratio, True)

            # Is a corresponding street existing ?
            if len(features) > 0:
                for feature in features:
                    """
                        accuracy = 6  Street level accuracy
                    """
                    if feature.ratio is not None and ratio_malus != 1:
                        feature.ratio = feature.ratio * ratio_malus

                    feature.accuracy = 6
                    feature.numero = None
                    results.append(self.encode_result(feature))

        return results

    def search_in_all_streets(self, p_ratio, p_street, p_session):
        results = []

        features = p_session.query(
            (func.ST_AsText(func.ST_Centroid(
                func.ST_Collect(Address.geom)))).label('geom'),
            Address.id_caclr_rue, Address.rue,
            Address.code_postal, Address.localite).\
            group_by(
                Address.id_caclr_rue,
                Address.rue,
                Address.code_postal,
                Address.localite).all()

        if len(features) > 0:
            features = self.search_for_street(features, p_street, p_ratio)
            # Is a corresponding street existing ?
            if len(features) > 0:
                # accuracy = 6   Street level accuracy.
                for feature in features:
                    feature.accuracy = 6
                    feature.numero = ""
                    results.append(self.encode_result(feature))
        return results

    def search_by_house_number(self, p_ratio, p_num, p_street, p_session):
        results = []
        if p_num is not None and len(p_num) > 0:
            features = p_session.query(Address).filter(
                " lower('" + str(p_num).replace("'", "") +
                "') = ANY  (regexp_split_to_array (lower(numero), '-'))").all()

            if len(features) > 0:
                features = self.search_for_street(features, p_street, p_ratio)
                # Is a corresponding street existing ?
                if len(features) > 0:
                    # accuracy = 8   Address level accuracy.
                    for feature in features:
                        feature.accuracy = 8
                        results.append(self.encode_result(feature))
        return results

    def search_alternative_by_zip_and_house_num(
            self, p_ratio, p_num, p_street, p_zip, p_session):
        results = []
        try:
            p_zip = str(int(float(re.sub("[^0-9]", "", p_zip))))
        except:
            return results

        features = p_session.query(Address).\
            filter(
                " code_postal::integer  = (" + str(p_zip) +
                ") and lower(numero) = (lower('" +
                str(p_num).replace("'", "") + "'))").all()

        if len(features) > 0:
            # accuracy = 8   Address level accuracy.
            for feature in features:
                feature.accuracy = 8
                feature.ratio = 0.5
                results.append(self.encode_result(feature))

        return results

    def search_by_zip_and_house_num(
            self, p_ratio, p_num, p_street, p_zip, p_session):
        results = []
        try:
            p_zip = str(int(float(re.sub("[^0-9]", "", p_zip))))
        except:
            return results

        features = p_session.query(Address).filter(
            " code_postal::integer  = (" + str(p_zip) +
            ") and lower('" + str(p_num).replace("'", "") +
            "') = ANY  (regexp_split_to_array (lower(numero), '-'))").all()

        if len(features) > 0:
            for feature in features:

                cur_ratio = difflib.SequenceMatcher(
                    None,
                    self.supprime_accent(
                        feature.rue.lower()),
                    self.supprime_accent(p_street)).ratio()
                if cur_ratio > 0.7:
                    mw1 = self.get_main_word(self.replace_words(
                        self.supprime_accent(
                            feature.rue.lower())).strip(), True)
                    mw2 = self.get_main_word(self.supprime_accent(
                        self.replace_words(
                            p_street.strip())))
                    cur_ratio = difflib.SequenceMatcher(None, mw1, mw2).ratio()
                    feature.ratio = cur_ratio
                    feature.accuracy = 8
                    results.append(self.encode_result(feature))

        if len(results) == 0 and len(features) > 0:
            features = self.search_for_street(
                features, p_street, p_ratio, p_session)
            # Is a corresponding street existing ?

            if len(features) > 0:
                # accuracy = 8   Address level accuracy.
                for feature in features:
                    feature.accuracy = 8
                    results.append(self.encode_result(feature))
        return results

    # Compare with the streets in parameter
    # and keep the best result
    # If several results are existing keep the one with the best accuracy
    def keep_the_best_result(self, results, p_street):
        outputs = []
        ratio = 0
        accuracy = 0
        for result in results:
            if (result['ratio'] > ratio):
                outputs = []
                ratio = result['ratio']
                accuracy = result['accuracy']

            if (result['ratio'] == ratio):
                if result['accuracy'] > accuracy:
                    outputs = [result]
                else:
                    if result['accuracy'] == accuracy:
                        outputs.append(result)

        ratio = 0
        outputs2 = []
        for output in outputs:
            cur_ratio = difflib.SequenceMatcher(
                None,
                self.supprime_accent(p_street.strip().lower()),
                self.supprime_accent(
                    output['matching street']).strip().lower()).ratio()

            if (cur_ratio > ratio):
                outputs2 = []
                ratio = cur_ratio

            if (cur_ratio == ratio):
                # output['ratio']=cur_ratio
                outputs2.append(output)

        return outputs2

    def supprime_accent(self, ligne):
        if ligne is None:
            return None
        """ supprime les accents du texte source """
        accents = {u'a': [u'à', u'ã', u'á', u'â'],
                   u'e': [u'é', u'è', u'ê', u'ë'],
                   u'i': [u'î', u'ï'],
                   u'u': [u'ù', u'ü', u'û'],
                   u'o': [u'ô', u'ö']}
        for (char, accented_chars) in accents.iteritems():
            for accented_char in accented_chars:
                ligne = ligne.replace(accented_char, char)
        return ligne

    def start_search(
            self, p_ratio, p_num, p_street, p_zip, p_locality,
            p_country, p_session):
        results = []

        if p_street is not None:
            p_street = p_street.lower()

        p_street = self.supprime_accent(p_street)

        if p_zip is None:
            p_zip = ""
        try:
            p_zip = str(int(float(re.sub("[^0-9]", "", p_zip))))
        except:
            p_zip = p_zip.replace("L", "").replace("-", "").replace(" ", "")

        zip_exist = self.is_zip_code_exists(p_zip, p_session)

        if p_num is not None and len(p_num) > 0:
            # If the number has many components, (ex: 7 à 17 or 7-17)i
            # Then only use the first one
            nums = None
            if p_num.find(u"à") >= 0:
                nums = p_num.split(u"à")
                p_num = (nums[0])
            if p_num.find("-") >= 0:
                nums = p_num.split("-")
                p_num = (nums[0])
            if p_num.find("/") >= 0:
                nums = p_num.split("/")
                p_num = (nums[0])

            p_num = p_num.replace(" ", "")

            # Accuracy expected address level
            if zip_exist and p_zip is not None and len(p_zip) > 0:
                results = self.search_by_zip_and_house_num(
                    p_ratio, p_num, p_street, p_zip, p_session)
                if len(results) == 0 and nums is not None and len(nums) > 1:
                    try:
                        for p_num in range(int(nums[0].replace(" ", "")) + 1,
                                           int(nums[1].replace(" ", ""))):
                            p_num = nums[0].replace(" ", "")
                            results =\
                                self.search_by_zip_and_house_num(
                                    p_ratio,
                                    str(p_num),
                                    p_street,
                                    p_zip,
                                    p_session)
                            if len(results) > 0:
                                break
                    except:
                        pass
                        results = self.search_by_zip_and_house_num(
                            p_ratio, str(p_num), p_street, p_zip, p_session)

            if zip_exist and p_zip is not None and\
               len(results) == 0 and len(p_zip) > 0:
                results = self.search_by_zip(
                    p_ratio, p_street, p_zip, p_session, 0.8)
            p_locality = self.get_best_locality_name(p_locality, p_session)

            if p_locality is not None and len(p_locality) > 0 and\
               len(results) == 0:

                if len(results) == 0:
                    ratio_malus = 1
                    if p_zip is not None and len(p_zip) > 0:
                        ratio_malus = 0.8

                    results1 = self.search_by_locality_and_house_number(
                        p_ratio, p_num, p_street,
                        p_locality, p_session, ratio_malus)
                    results2 = self.search_by_locality(
                        p_ratio, p_street, p_locality,
                        p_session, ratio_malus)
                    results = results1 + results2

            if len(results) == 0 and zip_exist and len(p_zip) > 0:
                results = self.search_alternative_by_zip_and_house_num(
                    p_ratio, p_num, p_street, p_zip, p_session)

            if len(results) == 0:
                p_locality = self.get_best_locality_name(p_locality, p_session)
                results = results + \
                    self.search_in_well_known_poi_table(
                        p_ratio, p_street, p_zip, p_locality, p_session)
        else:
            if len(results) == 0 and p_street is not None and\
               len(p_street) > 0:
                results = self.search_in_well_known_poi_table(
                    p_ratio, p_street, p_zip,
                    self.get_best_locality_name(p_locality, p_session),
                    p_session)

            if zip_exist and p_zip is not None and len(results) == 0:
                results = self.search_by_zip(
                    p_ratio, p_street, p_zip, p_session)

            if len(results) == 0 and p_locality is not None and\
               len(p_locality) > 0:

                ratio_malus = 1
                if p_zip is not None and len(p_zip) > 0:
                    ratio_malus = 0.8
                if p_street is not None and len(p_street) > 0:
                    results = self.search_by_locality(
                        p_ratio, p_street, self.get_best_locality_name(
                            p_locality, p_session),
                        p_session, ratio_malus)

        return results

    @view_config(route_name="geocode")
    def search(self):
        results = []
        try:
            querystring = self.request.params.get('queryString', None)
            if querystring is not None:
                res = self._split_address(querystring)
                p_zip = res['zip']
                p_locality = res['locality']
                p_country = 'lu'
                p_street = res['street']
                p_num = res['num']
            else:
                p_zip = self.request.params.get('zip', '').lower().\
                    strip().replace("l", "").replace(" ", "").replace("-", "")
                p_locality = self.request.params.get('locality', '').\
                    lower().strip()
                p_country = self.request.params.get('country', 'lu').\
                    lower().strip()
                p_street = self.request.params.get('street', '').\
                    lower().strip()
                p_num = self.request.params.get('num', '').lower().strip()

            results = self.start_search(
                0.7, p_num, p_street, p_zip, p_locality, p_country,
                self.request.db_ecadastre)
            results = self.keep_the_best_result(results, p_street)

            if results is not None and p_zip is not None and\
               p_locality is not None and len(results) == 0 and\
               len(p_zip) > 0 and len(p_locality) > 0:
                results.append(
                    self.encoded_post_code_locality_result(p_zip, p_locality))

            if results is not None and p_zip is not None and\
               len(results) == 0 and len(p_zip) > 0:
                results.append(self.encoded_post_code_result(p_zip))

            if results is not None and p_locality is not None and\
               len(results) == 0 and len(p_locality) > 0:
                results.append(self.encoded_locality_result(p_locality))

            if results is not None and len(results) == 0:
                results.append(self.encoded_country_result())

        except Exception as e:
            log.exception(e)
            self.request.db_ecadastre.rollback()
            results = [self.encoded_country_result()]

        if 'cb' not in self.request.params:
            headers = {'Content-Type': 'application/json'}
            if querystring is not None:
                return Response(geojson_dumps({
                    'success': True,
                    'count': len(results),
                    'request': querystring,
                    'results': results}), headers=headers)
            else:
                return Response(geojson_dumps({
                    'success': True,
                    'count': len(results),
                    'request': {
                        'zip': p_zip,
                        'locality': p_locality,
                        'country': p_country,
                        'street': p_street,
                        'num': p_num},
                    'results': results}), headers=headers)

        headers = {'Content-Type': 'text/javascript; charset=utf-8'}
        if querystring is not None:
            return Response(
                self.request.params['cb'] + '(' +
                geojson_dumps(
                    {'success': True,
                     'count': len(results),
                     'request': querystring,
                     'results': results}) + ');', headers=headers)
        else:
            return Response(
                self.request.params['cb'] + '(' +
                geojson_dumps(
                    {'success': True,
                     'count': len(results),
                     'request': {
                        'zip': p_zip,
                        'locality': p_locality,
                        'country': p_country,
                        'street': p_street,
                        'num': p_num
                        }, 'results': results}) + ');', headers=headers)

    def is_int(self, s):
        try:
            int(s)
            return True
        except:
            return False

    def split_address(self):
        address = self.request.params.get('address', None)

        result = self._split_address(address)

        return {'success': True, 'count': 1, 'results': [result]}

    def split_street_and_house_number(self, streetandhouse):

        nums = re.findall(r'\d+', streetandhouse)

        street = None
        house_num = None
        if nums is not None and len(nums) > 0:
            idx = streetandhouse.find(nums[0])
            if idx == 0:
                house_num = nums[0]

                if streetandhouse[idx + len(house_num):
                                  idx + len(house_num) + 1] != " " and\
                   streetandhouse[idx + len(house_num):
                                  idx + len(house_num) + 1] != ",":
                    if streetandhouse[idx + len(house_num):
                                      idx + len(house_num) + 1] == "-":
                        part2 = streetandhouse[len(house_num) + 1:]

                        nums2 = re.findall(r'\d+', part2)
                        idx2 = streetandhouse.find(nums2[0])
                        house_num = streetandhouse[idx:idx2 + len(nums2[0])]
                    else:
                        try:
                            if streetandhouse[idx + len(house_num) + 1:
                                              idx + len(house_num) + 2] != " ":
                                house_num = streetandhouse[
                                    idx:idx + len(house_num)]
                            else:
                                house_num = streetandhouse[
                                    idx:idx + len(house_num) + 1]
                        except:
                            house_num = streetandhouse[
                                idx:idx + len(house_num) + 1]
                            log.debug('error - split_street_and_house_number')
                street = streetandhouse[len(house_num) + 1:]
            else:
                # Rue du 9 mai
                house_num = nums[len(nums) - 1]
                if streetandhouse[idx + len(house_num):
                                  idx + len(house_num) + 1] != " " and\
                   streetandhouse[idx + len(house_num):
                                  idx + len(house_num) + 1] != ",":
                    try:
                        if streetandhouse[idx + len(house_num):
                                          idx + len(house_num) + 2] != " ":
                            house_num = streetandhouse[idx:
                                                       idx + len(house_num)]
                        else:
                            house_num = streetandhouse[
                                idx:idx + len(house_num) + 1]
                    except:
                        house_num = streetandhouse[idx:
                                                   idx + len(house_num) + 1]
                        log.debug('error - split_street_and_house_number')
                street = streetandhouse[len(house_num) + 1:]
        else:
            street = streetandhouse
        return house_num, street

    def _split_zip_and_town(self, address):
        zip = None
        town = None

        nums = re.findall(r'\d+', address)
        if nums is not None and len(nums) > 0:
            for num in nums:
                if len(num) == 4:
                    zip = num
                    town = self.get_locality_from_zip(zip)
                    if town is not None:
                        break
            if town is None:
                for num in nums:
                    if len(num) == 4:
                        zip = num
                        town = address[address.find(str(zip)):]
                        break
        return zip, town

    # Split address
    # Fist number is house number
    # Then street
    # Then post code
    # Then locality
    def _simple_split_address(self, address):

        street = None
        house_num = None
        zip = None
        locality = None

        if address is None:
            return {
                    'street': street,
                    'num': house_num,
                    'zip': zip,
                    'locality': locality}

        stripped_address = address.strip()
        stripped_address = stripped_address.replace(",", " ")
        stripped_address = stripped_address.replace("L-", "")
        stripped_address = stripped_address.replace("l-", "")

        house_num, rest = self.split_street_and_house_number(stripped_address)
        zip, locality = self._split_zip_and_town(rest)
        idx = rest.find(str(zip))
        street = rest[0:idx]

        return {
                'street': street,
                'num': house_num,
                'zip': zip,
                'locality': locality}

    # We start with house number + street or street + house number
    # 54 avenue G. Diderich or avenue G. Diderich 54
    # Post code 4 digits
    # House number after or before the street
    # House number composed of digit but sometimes letter 54A
    # Post code is followed by locality
    # 54 Avenue gaston diedrich 1420 luxembourg
    # Avenue gaston diedrich 54 , 1420 luxembourg
    # 14 Allée de la Jeunesse Sacrifiée 1940-1945 5863 Alzinghen
    # 2A Rue du 9 mai 1944 2112 Howald
    def _split_address(self, address):
        street = None
        house_num = None
        zip = None
        locality = None

        if address is None:
            return {
                'street': street,
                'num': house_num,
                'zip': zip,
                'locality': locality}

        address = re.sub(r'\([^)]*\)', '',  address.strip())

        stripped_address = address.strip()
        stripped_address = stripped_address.replace(",", " ")
        stripped_address = stripped_address.replace("L-", "")
        stripped_address = stripped_address.replace("l-", "")

        # Last word always locality name except if only a number
        words = stripped_address.split(" ")
        locality = words[len(words) - 1]

        if locality is not None and locality.isdigit():
            zip = locality
            locality = self.get_locality_from_zip(zip)

        # Next to the last word, if 4 digits then this is the post code
        if zip is None:
            t_zip = words[len(words) - 2]
            if t_zip.isdigit() and len(t_zip) == 4:
                zip = t_zip

        if zip is not None:
            parts = stripped_address.split(zip)
            street = parts[0]
        else:
            if locality is not None:
                street = stripped_address[
                    0:len(stripped_address) - len(locality)]
            else:
                street = stripped_address

        house_num, street = self.split_street_and_house_number(street)

        if street is not None:
            street = street.replace(",", "")
            street = street.replace("L-", "")
            street = street.replace("l-", "")
            street = street.strip().lower()

        if house_num is not None:
            house_num = house_num.replace(",", "")
            house_num = house_num.replace("L-", "")
            house_num = house_num.replace("l-", "")
            house_num = house_num.strip()

        if zip is not None:
            zip = zip.replace(",", "")
            zip = zip.replace("L-", "")
            zip = zip.replace("l-", "")
            zip = zip.strip()

        if locality is not None:
            locality = locality.replace(",", "")
            locality = locality.replace("L-", "")
            locality = locality.replace("l-", "")
            locality = locality.strip().lower()
            locality = locality.replace(" sur ", "-sur-")
            locality = locality.replace("/", "-sur-")

        return {
                'street': street,
                'num': house_num,
                'zip': zip,
                'locality': locality}

        nums = re.findall(r'\d+', stripped_address)

        # No numbers: Always locality after street
        if len(nums) == 0:
            street = stripped_address
            words = street.split(" ")
            words = words[len(words) - 1].split(",")
            locality = words[len(words) - 1]
            locality = locality.replace(",", "")
            locality = locality.strip()
            street = street[0:len(street) - len(locality)]

            return {
                'street': street,
                'num': house_num,
                'zip': zip,
                'locality': locality}

        # 2 numbers: 1 of 4 digits and
        # one with less than 4 digits
        # The one with 4 digits is the post code,
        # other is house number
        if len(nums) == 2:
            for num in nums:
                if len(num) == 4:
                    zip = num
                    locality = self.get_locality_from_zip(zip)
                else:
                    house_num = num
                    idx = stripped_address.find(house_num)

                    if idx >= 0 and\
                       stripped_address[idx + len(house_num):
                                        idx + len(house_num) + 1] != " " and\
                       stripped_address[idx + len(house_num):
                                        idx + len(house_num) + 1] != ",":
                        house_num = stripped_address[
                            idx:idx + len(house_num) + 1]

            if zip is not None and house_num is not None:
                parts = stripped_address.split(zip)

                if len(parts[0]) > 0:
                    street = parts[0].replace(house_num, "")
                    street = street.replace(",", "")
                    street = street.replace("L-", "")
                    street = street.replace("l-", "")
                    street = street.strip()
                return {
                    'street': street,
                    'num': house_num,
                    'zip': zip,
                    'locality': locality}

        # 1 number
        # If 4 digits Then this is the post code
        # If less then this is the house number
        if len(nums) == 1:
            num = nums[0]
            if len(num) == 4:
                zip = num
                locality = self.get_locality_from_zip(zip)
                # The part before the post code is the street
                parts = stripped_address.split(zip)

                street = parts[0].replace(num, "")
                street = street.replace(",", "")
                street = street.replace("L-", "")
                street = street.replace("l-", "")
                street = street.strip()

                return {
                    'street': street,
                    'num': house_num,
                    'zip': zip,
                    'locality': locality}
            if len(num) > 4:
                # House number has a maximum of 3 digits
                street = stripped_address
                street = street.replace(",", "")
                street = street.replace("L-", "")
                street = street.replace("l-", "")
                street = street.strip()

                return {
                    'street': street,
                    'num': house_num,
                    'zip': zip,
                    'locality': locality}

            # Todo: Find the street and find if the number is the house number
            if len(num) < 4:
                street = stripped_address
                # Le numéro est au début de la chaine
                if stripped_address[0:len(num)].isdigit():
                    house_num = stripped_address[0:len(num)]
                    idx = stripped_address.find(house_num)
                    if idx >= 0 and\
                       stripped_address[idx + len(house_num):
                                        idx + len(house_num) + 1] != " " and\
                       stripped_address[idx + len(house_num):
                                        idx + len(house_num) + 1] != ",":
                        house_num = stripped_address[
                            idx:idx + len(house_num) + 1]

                    street = stripped_address[len(house_num):]

                    # The last word is probably locality
                    words = street.split(" ")
                    words = words[len(words) - 1].split(",")

                    locality = words[len(words) - 1]
                    locality = locality.replace(",", "")
                    locality = locality.strip()

                    street = street[0:len(street) - len(locality)]
                else:
                    # The number is inside the string
                    house_num = num
                    idx = stripped_address.find(house_num)
                    if idx >= 0 and\
                       stripped_address[idx + len(house_num):
                                        idx + len(house_num) + 1] != " " and\
                       stripped_address[idx + len(house_num):
                                        idx + len(house_num) + 1] != ",":
                        house_num = stripped_address[
                            idx:idx + len(house_num) + 1]

                    parts = stripped_address.split(house_num)
                    street = parts[0]
                    locality = parts[1]
                    locality = locality.strip()

                street = street.replace(house_num, "")
                street = street.replace(",", "")
                street = street.replace("L-", "")
                street = street.replace("l-", "")
                street = street.strip()

                return {
                    'street': street,
                    'num': house_num,
                    'zip': zip,
                    'locality': locality}

        # Plus que 2 nombres:
        if len(nums) > 2:
            # Find the one with 4 digits that is the post code
            for num in nums:
                if len(num) == 4:
                    t_zip = num
                    t_locality = self.get_locality_from_zip(t_zip)
                    parts = stripped_address.split(" ")
                    for part in parts:
                        cur_ratio = difflib.SequenceMatcher(
                                None, self.supprime_accent(part),
                                self.supprime_accent(t_locality)).ratio()
                        # If ratio is ok that probably means this is
                        # the post code
                        if (cur_ratio > 0.8):
                            zip = t_zip
                            locality = t_locality
                            break

            if zip is not None:
                parts = stripped_address.split(zip)
                for num in nums:
                    if len(num) < 4:
                        # To be the house number, it should be first or last
                        if parts[0][0:len(num)].isdigit():
                            house_num = parts[0][0:len(num)]
                            if house_num is not None:
                                idx = stripped_address.find(house_num)
                                if idx >= 0 and\
                                   stripped_address[
                                        idx + len(house_num):
                                        idx + len(house_num) + 1] != " " and\
                                   stripped_address[
                                        idx + len(house_num):
                                        idx + len(house_num) + 1] != ",":
                                    house_num = stripped_address[
                                        idx:idx + len(house_num) + 1]

                            street = parts[0].replace(house_num, "")
                            street = street.replace(",", "")
                            street = street.replace("L-", "")
                            street = street.replace("l-", "")
                            street = street.strip()
                            break
            return {
                'street': street,
                'num': house_num,
                'zip': zip,
                'locality': locality}
        return {
            'street': street,
            'num': house_num,
            'zip': zip,
            'locality': locality}

        if zip is not None and house_num is not None:
            parts = stripped_address.split(zip)

            if len(parts[0]) > 0:
                street = parts[0].strip()
            if len(parts[1]) > 0:
                street = parts[1].strip()
            return {
                'street': street,
                'num': house_num,
                'zip': zip,
                'locality': locality}

        for num in nums:
            # If this number has 4 digits this is a good candidate
            # to be post code
            if len(num) == 4:
                zip = num

        # If the first char is a number then this is the beginning of
        # the house number
        for i in range(1, len(stripped_address)):
            if stripped_address[0:i].isdigit():
                num = stripped_address[0:i]
                stripped_address = stripped_address[i:]
            else:
                break

        # Si L is followed by a number this is the post code
        # And what is before is the street and the nouse number
        if stripped_address.lower().find("l-") > 0:
            cp = stripped_address[stripped_address.lower().find("l-"):]
            for i in range(1, len(cp)):
                if cp[0:i].isdigit():
                    zip = cp[0:i]
                    locality = cp[i:]
                else:
                    if zip is not None:
                        street = stripped_address[
                            0:stripped_address.lower().find("l-")]
                    break

        # We start with street name
        for i in range(1, len(stripped_address)):
            if stripped_address[0:i].isdigit():
                num = stripped_address[0:i]
                stripped_address = stripped_address[i:]
                break

        return {
                'street': street,
                'num': house_num,
                'zip': zip,
                'locality': locality}

    def get_locality_from_zip(self, p_zip):
        features = self.request.db_ecadastre.query(Address.localite).filter(
            " lower(code_postal) = lower('" + p_zip + "')").\
            group_by(Address.localite).all()

        for feature in features:
            return feature.localite.strip()

        return None
