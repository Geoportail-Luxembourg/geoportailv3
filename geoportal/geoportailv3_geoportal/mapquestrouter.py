# -*- coding: utf-8 -*-
# written by elbe
# reviewed by koje
# reviewed by mire

import geojson
import logging
import urllib.request
from urllib.parse import quote as urlquote

try:
    from json import loads as json_loads
except:
    from simplejson import loads as json_loads

log = logging.getLogger(__name__)


class MapquestRouter:
    """ Class that interacts with the mapquest routing api
       to calculate the optimal route. """

    def __init__(self, config):
        """constructor"""
        logging.basicConfig(level=logging.INFO)
        # mapquest API Key
        self.__apikey = config['api_key']
        self.__url = config['url']
        self.waypoints = []

        self.geom = None
        self.desc = []
        self.dist = 0
        self.time = 0
        self.locations = []

        self.lang = 'fr'
        self.transport_mode = 0
        self.criteria = 0
        self.avoid = []

        self.errorMessages = []

        self.attribution = '<p>Routing Data OpenStreetMap contributors' +\
            '</p><p>Directions Courtesy of <a href="http://www.mapquest.' +\
            'com/" target="_blank">MapQuest</a> <img src="http://develop' +\
            'er.mapquest.com/content/osm/mq_logo.png"></p>'

    def __send_request(self):
        """method that actually sends the routing request to the webservice"""
        request_url = "%s?key=%s" % (self.__url, self.__apikey) +\
            "&manMaps=false&shapeFormat=raw&generalize=5&unit=k&doRevers" +\
            "eGeocode=false"

        # Starting point
        request_url = request_url + "&from=%s,%s"\
            % (self.waypoints[0][0], self.waypoints[0][1])

        # Via and end points
        for waypoint in self.waypoints[1:]:
            request_url = request_url + "&to=%s,%s"\
                % (waypoint[0], waypoint[1])

        # Language
        request_url = request_url + "&locale=%s" % (self.__lu_lang(self.lang))

        # Transport mode and criteria
        request_url = request_url + "&routeType=%s"\
            % (self.__route_type(self.transport_mode, self.criteria))
        # Bike settings
        if self.transport_mode == 2:
            # Cycling road factor
            if self.preferBikeRoad == 1:
                request_url = request_url + "&cyclingRoadFactor=5"

            if self.bikeAvoidHills == 1:
                request_url = request_url +\
                    "&roadGradeStrategy=AVOID_ALL_HILLS"

        # Avoid
        for type in self.avoid:
            request_url = request_url + "&avoids=%s"\
                % (urlquote(self.__lu_avoid(type)))
        res = json_loads(urllib.request.urlopen(request_url).read())
        return res

    def __get_route(self):
        """ Method that will coordinate the sending of requests and
            set the result to the self attributes. """
        result = self.__send_request()

        if result["info"]["statuscode"] != 0:
            self.errorMessages.extend(result["info"]["messages"])
            return

        if "route" in result:

            if result["route"]["routeError"]["message"]:
                self.errorMessages.extend(
                    result["route"]["routeError"]["message"])

            # Route LineString
            if "shape" in result["route"]:
                line = []

                for i in xrange(
                        0,
                        len(result["route"]["shape"]["shapePoints"]),
                        2):
                    line.append([result["route"]["shape"]["shapePoints"][i+1],
                                 result["route"]["shape"]["shapePoints"][i]])

                g = geojson.LineString(line)
                self.geom = g

            # Instructions
            if "legs" in result["route"]:
                instructions = []

                i = 0
                for leg in result["route"]["legs"]:

                    for maneuver in leg["maneuvers"]:

                        instruction = {}
                        if maneuver["narrative"]:
                            instruction["description"] =\
                                maneuver["narrative"].encode("utf-8")
                        else:
                            instruction["description"] = "-"

                        instruction["direction"] =\
                            self.__lu_turn_type(maneuver["turnType"])

                        instruction["distance"] =\
                            int(maneuver["distance"] * 1000)
                        instruction["lat"] = maneuver["startPoint"]["lat"]
                        instruction["lon"] = maneuver["startPoint"]["lng"]
                        instruction["time"] = maneuver["time"]
                        instruction["leg"] = i
                        instructions.append(instruction)

                    i = i + 1

                self.desc = instructions

            if "distance" in result["route"]:
                self.dist = int(result["route"]["distance"] * 1000)

            if "time" in result["route"]:
                self.time = result["route"]["time"]

        else:
            self.errorMessages.append("Error")

    def add_point(self, lat, lon):
        """ public method that can be called to add a point to the viaPts
            array."""
        self.waypoints.append([lat, lon])

    def execute(self):
        """public method used to execute the call"""
        self.__get_route()

    def __route_type(self, transport_mode, criteria):
        if transport_mode == 0:
            return self.__lu_criteria(criteria)
        else:
            return self.__lu_transport_mode(transport_mode)

    def __lu_lang(self, lang):
        lang_mapping = {
            'fr': 'fr_FR',
            'de': 'de_DE',
            'en': 'en_US',
            'lb': 'de_DE'
        }
        return lang_mapping[lang]

    def __lu_turn_type(self, turn_type):
        turn_type_mapping = {
            -1: 0,  # arrival etc.
            0: 0,   # staight
            1: 7,   # slight right
            2: 6,   # right
            3: 5,   # sharp right
            4: 4,   # reverse
            5: 3,   # sharp left
            6: 2,   # left
            7: 1,   # slight left
            8: 4,   # right u-turn
            9: 4,   # left u-turn
            10: 7,  # right merge
            11: 1,  # left merge
            12: 6,  # right on ramp
            13: 2,  # left on ramp
            14: 7,  # right off ramp
            15: 1,  # left off ramp
            16: 7,  # right fork
            17: 1,  # left fork
            18: 0,  # straight fork
            19: 0,  # take transit
            20: 0,  # transfer transit
            21: 0,  # port transit
            22: 0,  # enter transit
            23: 0,  # exit transit
        }
        return turn_type_mapping[turn_type]

    def __lu_transport_mode(self, mode):
        transport_mode_mapping = {
            0: 'car',
            1: 'pedestrian',
            2: 'bicycle',
        }
        return transport_mode_mapping[mode]

    def __lu_criteria(self, criteria):
        criteria_mapping = {
            0: 'fastest',
            1: 'shortest'
        }
        return criteria_mapping[criteria]

    def __lu_avoid(self, criteria):
        avoid_mapping = {
            '': '',
            'limited': 'Limited Access',
            'toll': 'Toll Road',
            'ferry': 'Ferry',
            'unpaved': 'Unpaved',
            'seasonal': 'Approximate Seasonal Closure',
            'border': 'Country Border Crossing'
        }
        return avoid_mapping[criteria]
