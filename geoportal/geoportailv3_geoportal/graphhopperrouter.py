# -*- coding: utf-8 -*-
# written by elbe
# reviewed by koje
# reviewed by mire

import logging
import urllib.request
import urllib.error

try:
    from json import loads as json_loads
except:
    from simplejson import loads as json_loads

log = logging.getLogger(__name__)


class GraphhopperRouter:
    """class that interacts with the graphhopper routing api to calculate the
       optimal route"""

    def __init__(self, config):
        """constructor"""
        logging.basicConfig(level=logging.INFO)

        # graphhopper API Key
        self.__apiKey = config['api_key']
        self.__apiEndpoint = config['url']

        self.waypoints = []

        self.geom = None
        self.desc = []
        self.locations = []
        self.dist = 0
        self.time = 0

        self.lang = 'fr'
        self.transport_mode = 0
        self.criteria = 0
        self.avoid = []

        self.errorMessages = []

        self.attribution = '<p>Routing Data OpenStreetMap contributors</p>' +\
            '<p>powered by <a href="https://graphhopper.com/' +\
            '#directions-api">GraphHopper API</a></p>'

    def __send_request(self):
        """method that actually sends the routing request to the webservice"""
        request_url = "%s?key=%s&points_encoded=false"\
            % (self.__apiEndpoint, self.__apiKey)

        # Waypoints
        for waypoint in self.waypoints:
            request_url = request_url + "&points=%s,%s"\
                % (waypoint[0], waypoint[1])

        # Language
        request_url = request_url + "&locale=%s" % (self.__lu_lang(self.lang))

        # Transport mode and criteria
        request_url = request_url + "&vehicle=%s"\
            % (self.__lu_transport_mode(self.transport_mode))

        # log.info(request_url)

        res = json_loads(urllib.request.urlopen(request_url).read())
        # log.info(res)
        return res

    def __get_route(self):
        """method that will coordinate the sending of requests and set the
           result to the self attributes"""

        try:
            result = self.__send_request()

        except urllib.error.HTTPError as e:

            # Bad Request
            if e.code == 400:
                result = json_loads(e.read())
                self.errorMessages.append("Error: %s" % (result["message"]))

            # API Limit Exceeded
            elif e.code == 429:
                raise e
            else:
                # log.error(e)
                self.errorMessages.append("Error")

        else:

            if "paths" in result:

                path = result["paths"][0]

                # Route LineString
                self.geom = path["points"]

                # Instructions
                if "instructions" in path:
                    instructions = []

                    i = 0
                    for maneuver in path["instructions"]:

                        instruction = {}
                        if maneuver["text"]:
                            instruction["description"] =\
                                maneuver["text"].encode("utf-8")
                        else:
                            instruction["description"] = "-"

                        instruction["direction"] =\
                            self.__lu_turn_type(maneuver["sign"])

                        instruction["distance"] = int(maneuver["distance"])

                        # Get the coordinates of the point which this
                        # instruction applies to from the route LineString
                        instruction["lat"] = path["points"]["coordinates"][
                            maneuver["interval"][0]][1]
                        instruction["lon"] = path["points"]["coordinates"][
                            maneuver["interval"][0]][0]

                        instruction["time"] = int(maneuver["time"] / 1e3)
                        instruction["leg"] = i
                        instructions.append(instruction)

                        # Arrival at a waypoint i.e. the end of a leg
                        # This is needed to maintain the order of the waypoints
                        # when dragging the route
                        if maneuver["sign"] == 5:
                            i = i + 1

                    self.desc = instructions

                if "distance" in path:
                    self.dist = int(path["distance"])

                if "time" in path:
                    self.time = path["time"] / 1000

            else:
                self.errorMessages.append("Error")

    def add_point(self, lat, lon):
        """public method that can be called to add a point to
           the viaPts array"""
        self.waypoints.append([lat, lon])

    def execute(self):
        """public method used to execute the call"""
        self.__get_route()

    def __lu_lang(self, lang):
        lang_mapping = {
            'fr': 'fr_FR',
            'de': 'de_DE',
            'en': 'en_US',
            'lb': 'de_DE',
        }
        return lang_mapping[lang]

    def __lu_turn_type(self, turn_type):
        turn_type_mapping = {
            -3: 3,  # sharp left
            -2: 2,  # left
            -1: 1,  # slight left
            -7: 2,  # keep left
            0: 0,   # staight
            1: 7,   # slight right
            2: 6,   # right
            3: 5,   # sharp right
            4: 0,   # arrival etc.
            5: 0,   # arrival at via point
            6: 0,   # roundabout
            7: 6,   # keep right
        }
        return turn_type_mapping[turn_type]

    def __lu_transport_mode(self, mode):
        transport_mode_mapping = {
            0: 'car',
            1: 'foot',
            2: 'bike',
        }
        return transport_mode_mapping[mode]

    def __lu_criteria(self, criteria):
        criteria_mapping = {
            0: 'fastest',
            1: 'shortest',  # not available on the public api (2015-04-07)
        }
        return criteria_mapping[criteria]
