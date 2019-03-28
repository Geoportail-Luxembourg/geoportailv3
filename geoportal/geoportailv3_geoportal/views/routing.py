# -*- coding: utf-8 -*-
# adapted by elbe
# reviewed by koje
# reviewed by mire

from geoportailv3_geoportal.mapquestrouter import MapquestRouter
from geoportailv3_geoportal.graphhopperrouter import GraphhopperRouter
from pyramid.view import view_config
from urllib.error import HTTPError
from pyramid.httpexceptions import HTTPBadRequest
from geoportailv3_geoportal.portail import RoutingStats
from c2cgeoportal_commons.models import DBSession

import os
import json
import transaction
import logging
log = logging.getLogger(__name__)


class RouterController(object):
    def __init__(self, request):
        self.request = request
        self.config = self.request.registry.settings

    @view_config(route_name="getremoteroute", renderer="json")
    def get_route(self):
        coords = self.request.params.get('waypoints', '').split(',')
        lang = self.request.params.get('lang', 'fr')
        transport_mode = int(self.request.params.get('transportMode', 0))
        criteria = int(self.request.params.get('criteria', 0))
        avoid = self.request.params.get('avoid', '').split(',')
        prefer_bike_road =\
            int(self.request.params.get('preferBikeRoad', False))
        bike_avoid_hills =\
            int(self.request.params.get('bikeAvoidHills', False))
        if coords == ['']:
            coords = []

        # At least two waypoints (4 coordinates) are required
        if len(coords) < 4:
            routing_success = False
            return HTTPBadRequest("Not enough waypoints (At least 2 required)")
        else:
            if os.environ.get('FAKE_GETROUTE', None):
                fake_response = \
'{"type": "FeatureCollection", "features": [{"geometry": {"type": "LineString", "coordinates": [[6.133983, 49.600628], [6.134012, 49.600857], [6.134012, 49.600857], [6.133503, 49.600929], [6.133347, 49.600864], [6.133347, 49.600864], [6.133135, 49.60191], [6.133033, 49.603046], [6.13364, 49.605274], [6.133626, 49.606693], [6.133626, 49.606693], [6.133451, 49.607311], [6.13295, 49.608166], [6.13276, 49.608936], [6.132754, 49.609619], [6.1331, 49.611263], [6.133089, 49.611778], [6.132948, 49.612358], [6.132702, 49.612854], [6.132126, 49.613533], [6.130913, 49.614372], [6.130913, 49.614372], [6.130574, 49.614582], [6.13038, 49.61462], [6.13038, 49.61462], [6.130032, 49.614574], [6.127786, 49.613766], [6.127786, 49.613766], [6.126136, 49.616936], [6.126136, 49.616936], [6.137467, 49.618546], [6.137467, 49.618546], [6.138996, 49.618622], [6.141353, 49.619118], [6.141353, 49.619118], [6.141753, 49.617985]]}, "type": "Feature", "properties": {"attribution": "<p>Routing Data OpenStreetMap contributors</p><p>Directions Courtesy of <a href=\'http://www.mapquest.com/\' target=\'_blank\'>MapQuest</a> <img src=\'http://developer.mapquest.com/content/osm/mq_logo.png\'></p>", "success": true, "errorMessages": [], "time": 337, "dist": 3534, "desc": [{"distance": 25, "direction": 0, "description": "Pour commencer, allez dans la direction nord à Gare Centrale - Quai 5 vers Place de la Gare.", "leg": 0, "lon": 6.133983, "time": 4, "lat": 49.600628}, {"distance": 51, "direction": 2, "description": "Tournez à gauche sur Place de la Gare.", "leg": 0, "lon": 6.134012, "time": 27, "lat": 49.600857}, {"distance": 655, "direction": 6, "description": "Tournez à droite sur N50/Avenue de la Gare. Continuez sur N50.", "leg": 0, "lon": 6.133347, "time": 75, "lat": 49.600864}, {"distance": 915, "direction": 0, "description": "Continuez tout droit pour aller sur N57/Tunnel René Konen.", "leg": 0, "lon": 6.133626, "time": 58, "lat": 49.606693}, {"distance": 48, "direction": 1, "description": "Continuez à gauche à la bifurcation pour continuer sur N57/Tunnel René Konen.", "leg": 0, "lon": 6.130913, "time": 9, "lat": 49.614372}, {"distance": 210, "direction": 1, "description": "Tournez légèrement à gauche sur N7/Boulevard Royal/E421.", "leg": 0, "lon": 6.13038, "time": 22, "lat": 49.61462}, {"distance": 371, "direction": 6, "description": "Tournez à droite sur N52/Avenue de la Porte-Neuve.", "leg": 0, "lon": 6.127786, "time": 42, "lat": 49.613766}, {"distance": 836, "direction": 6, "description": "Tournez à droite sur N51/Boulevard Robert Schuman. Continuez sur N51.", "leg": 0, "lon": 6.126136, "time": 58, "lat": 49.616936}, {"distance": 289, "direction": 7, "description": "Continuez à droite à la bifurcation pour aller sur N51/Avenue John F. Kennedy.", "leg": 0, "lon": 6.137467, "time": 25, "lat": 49.618546}, {"distance": 128, "direction": 6, "description": "Tournez à droite sur Desserte Schuman.", "leg": 0, "lon": 6.141353, "time": 17, "lat": 49.619118}, {"distance": 0, "direction": 0, "description": "Vous êtes arrivé à destination.", "leg": 0, "lon": 6.141753, "time": 0, "lat": 49.617985}]}}]}' #  noqa
                return json.loads(fake_response)

            # Use Graphhopper for bicycle routing, Mapquest for all other modes
            if len(coords) <= 10 and transport_mode in [2]:
                r = GraphhopperRouter(self.config['routing']['graphhopper'])

                self.__setup_router(coords, lang, transport_mode, criteria,
                                    avoid, prefer_bike_road, bike_avoid_hills,
                                    r)
                try:
                    r.execute()
                except HTTPError as e:
                    if e.code == 429:
                        r = MapquestRouter(self.config['routing']['mapquest'])
                        self.__setup_router(
                            coords, lang, transport_mode,
                            criteria, avoid, prefer_bike_road,
                            bike_avoid_hills, r)
                        r.execute()
                    else:
                        raise e

            else:
                r = MapquestRouter(self.config['routing']['mapquest'])
                self.__setup_router(
                    coords, lang, transport_mode, criteria,
                    avoid, prefer_bike_road, bike_avoid_hills, r)
                r.execute()

            if r.geom and len(r.geom) > 0:
                routing_success = True
            else:
                routing_success = False
                r.errorMessages.append('An error occured')
        try:
            routing_stats = RoutingStats()
            routing_stats.transport_mode = transport_mode
            routing_stats.transport_criteria = criteria
            DBSession.add(routing_stats)
            transaction.commit()
        except Exception as e:
            log.exception(e)
            transaction.abort()

        if routing_success:
            json_response = {
                "type": "FeatureCollection",
                "features": [
                    {'type': "Feature",
                     'properties': {
                        'success': routing_success,
                        'desc': r.desc, 'dist': int(r.dist),
                        'time': r.time,
                        'errorMessages': r.errorMessages,
                        'attribution': r.attribution},
                     'geometry': r.geom}]}
        else:
            json_response = {'success': routing_success,
                    'geometry': None,
                    'desc': [],
                    'dist': 0,
                    'time': 0,
                    'errorMessages': r.errorMessages,
                    'attribution': r.attribution}

        return json_response

    def __setup_router(
            self, coords, lang, transport_mode, criteria,
            avoid, prefer_bike_road, bike_avoid_hills, router):

        i = 0
        while i < len(coords):
            router.add_point(float(coords[i]), float(coords[i+1]))
            i += 2

        router.lang = lang
        router.transport_mode = transport_mode
        router.criteria = criteria
        router.avoid = avoid
        router.preferBikeRoad = prefer_bike_road
        router.bikeAvoidHills = bike_avoid_hills
