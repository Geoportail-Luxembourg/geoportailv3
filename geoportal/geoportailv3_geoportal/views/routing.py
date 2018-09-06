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
            DBSession.commit()
        except Exception as e:
            log.exception(e)
            DBSession.rollback()

        if routing_success:
            json = {
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
            json = {'success': routing_success,
                    'geometry': None,
                    'desc': [],
                    'dist': 0,
                    'time': 0,
                    'errorMessages': r.errorMessages,
                    'attribution': r.attribution}

        return json

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
