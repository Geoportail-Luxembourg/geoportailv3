# -*- coding: utf-8 -*-


from pyramid.view import view_config
from pyramid.httpexceptions import HTTPBadRequest
from geojson import loads as geojson_loads
from geoalchemy2 import func
from geoalchemy2.elements import WKTElement
from geoportailv3.geocode import DBSession, Address


class Geocode(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name="reverse_geocode", renderer="json")
    def reverse(self):
        """
        View used to get an adress from a coordinate.
        """

        easting = self.request.params.get('easting', None)
        northing = self.request.params.get('northing', None)

        if easting is None or northing is None or\
           len(easting) == 0 or len(northing) == 0:
            return HTTPBadRequest("Coordinates are missing")

        distcol = func.ST_distance(WKTElement('POINT(%(x)s %(y)s)' % {
                                           "x": easting,
                                           "y": northing
                                           }, srid=2169), Address.geom)

        results = []
        for feature in DBSession.query(
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
