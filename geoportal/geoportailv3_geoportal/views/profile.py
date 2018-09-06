# -*- coding: utf-8 -*-
from c2cgeoportal_geoportal.lib.caching import set_common_headers, NO_CACHE
from c2cgeoportal_geoportal.views.raster import Raster
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.view import view_config
from pyramid.response import Response
from pyramid.i18n import TranslationStringFactory
from shapely.ops import linemerge

import geojson
import math
from decimal import Decimal


_ = TranslationStringFactory("c2cgeoportal")


class Profile(Raster):

    def __init__(self, request):
        self.request = request
        if "geom" in self.request.params:
            geoms = self.request.params["geom"]
            self.valid_request = True
            geom = geojson.loads(
                geoms,
                object_hook=geojson.GeoJSON.to_instance)
            if geom.type not in ["MultiLineString", "LineString"]:
                self.valid_request = False
            Raster.__init__(self, request)

    @view_config(route_name="echocsv")
    def echo_csv(self):

        name = self.request.params.get("name")
        if name is None:
            return HTTPBadRequest("name parameter is required")

        csv = self.request.params.get("csv")
        if csv is None:
            return HTTPBadRequest("csv parameter is required")

        charset = "utf-8"
        response = self.request.response
        response.body = csv.encode(charset)
        response.charset = charset
        response.content_disposition = ("attachment; filename=%s.csv"
                                        % (name.replace(" ", "_")))
        return set_common_headers(
            self.request, "exportcsv", NO_CACHE,
            content_type="application/csv"
        )

    @view_config(route_name="profile.json", renderer="decimaljson")
    def json(self):
        if self.valid_request:
            """answers to /profile.json"""
            layer, points = self._compute_points()
            set_common_headers(
                self.request, "profile", NO_CACHE
            )
            return {"profile": points}
        else:
            return {"profile": []}

    @view_config(route_name="profile.csv")
    def csv(self):
        """answers to /profile.csv"""
        layers, points = self._compute_points()

        result = _("distance") + "," + ",".join(layers) + ",x,y"
        template = ",".join("%s" for l in layers)
        for point in points:
            # Handles cases when a layer is undefined, thus when not all raster
            # have the same geographical coverage
            for l in layers:
                if l not in point["values"]:
                    point["values"][l] = -9999

            r = template % tuple((str(point["values"][l]) for l in layers))
            result += "\n%s,%s,%d,%d" % \
                (str(point["dist"]), r, point["x"], point["y"])

        return set_common_headers(
            self.request, "profile", NO_CACHE,
            response=Response(result, headers={
                "Content-Disposition": 'attachment; filename="profile.csv"',
            }), content_type="text/csv; charset=utf-8", vary=True
        )

    def _create_geom(self, request_geom):
        lines = []
        geom = geojson.loads(
            request_geom,
            object_hook=geojson.GeoJSON.to_instance)
        if geom.type == "MultiLineString":
            # In case of MultiLineString try to merge
            # the different components
            lines_to_merge = []
            for line in geom.coordinates:
                lines_to_merge.append(line)
            merged_lines = linemerge(lines_to_merge)
            if merged_lines.geom_type == "MultiLineString":
                for line in merged_lines.geoms:
                    lines.append(geojson.loads(
                        geojson.dumps(line),
                        object_hook=geojson.GeoJSON.to_instance))
            else:
                lines.append(geojson.loads(
                    geojson.dumps(merged_lines),
                    object_hook=geojson.GeoJSON.to_instance))

        if geom.type == "LineString":
            lines.append(geom)

        ordered_lines = []
        is_reverse = False
        line_no = 0
        j = 0
        biggest_distance = 0

        # Il faut rechercher la première ligne.
        # C'est celle qui a son premier ou dernier point
        # le plus loin de tous les autres points.
        for i in range(len(lines)):
            shortest_distance = None
            is_reverse_loc = False
            for j in range(len(lines)):
                if i == j:
                    continue
                dist1a = self._dist(lines[i].coordinates[0],
                                    lines[j].coordinates[0])
                dist1b = self._dist(lines[i].coordinates[0],
                                    lines[j].coordinates[-1])
                if shortest_distance is None \
                        or dist1a < shortest_distance or dist1b:
                    shortest_distance = dist1a
                    is_reverse_loc = False
                if dist1b < shortest_distance:
                    shortest_distance = dist1b
                    is_reverse_loc = False
            if shortest_distance > biggest_distance:
                biggest_distance = shortest_distance
                is_reverse = is_reverse_loc
                line_no = i
            for j in range(len(lines)):
                if i == j:
                    continue
                dist1a = self._dist(lines[i].coordinates[-1],
                                    lines[j].coordinates[0])
                dist1b = self._dist(lines[i].coordinates[-1],
                                    lines[j].coordinates[-1])
                if shortest_distance is None \
                        or dist1a < shortest_distance or dist1b:
                    shortest_distance = dist1a
                    is_reverse_loc = True
                if dist1b < shortest_distance:
                    shortest_distance = dist1b
                    is_reverse_loc = True
            if shortest_distance > biggest_distance:
                biggest_distance = shortest_distance
                is_reverse = is_reverse_loc
                line_no = i

        if len(lines) > 0:
            ordered_lines.append(lines[line_no])
            lines.pop(line_no)

        if is_reverse:
            if len(ordered_lines) > 0:
                ordered_lines[-1].coordinates = \
                    list(ordered_lines[-1].coordinates)[::-1]

        while (len(lines) > 0):
            shortest_dist = None
            line_index = None
            i = 0
            for line in lines:
                d1a = self._dist(ordered_lines[-1].coordinates[-1],
                                 line.coordinates[0])
                d1b = self._dist(ordered_lines[-1].coordinates[-1],
                                 line.coordinates[-1])
                d1 = d1a
                if d1a >= d1b:
                    line.coordinates = list(line.coordinates)[::-1]
                    d1 = d1b
                if shortest_dist is None or d1 <= shortest_dist:
                    shortest_dist = d1
                    line_index = i
                i = i + 1
            ordered_lines.append(lines[line_index])
            lines.pop(line_index)

        return ordered_lines

    def _compute_points(self):
        """Compute the alt=fct(dist) array"""
        geoms = self._create_geom(self.request.params["geom"])
        points = []
        rasters = self.rasters
        nb_points = int(self.request.params["nbPoints"]) / len(geoms)
        dist = 0
        for geom in geoms:
            coords = self._create_points(geom.coordinates, nb_points)
            prev_coord = None

            for coord in coords:
                if prev_coord is not None:
                    dist += self._dist(prev_coord, coord)

                values = {}
                has_one = False
                for ref in rasters.keys():
                    value = self._get_raster_value(
                        self.rasters[ref],
                        ref, coord[0], coord[1])

                    if value is not None and value != 0:
                        values[ref] = value
                        has_one = True

                if has_one:
                    # 10cm accuracy is enough for distances
                    rounded_dist = Decimal(str(dist)).quantize(Decimal("0.1"))
                    points.append({
                        "dist": rounded_dist,
                        "values": values,
                        "x": coord[0],
                        "y": coord[1]
                    })
                prev_coord = coord

        return rasters.keys(), points

    def _dist(self, coord1, coord2):
        """Compute the distance between 2 points"""
        return math.sqrt(math.pow(coord1[0] - coord2[0], 2.0) +
                         math.pow(coord1[1] - coord2[1], 2.0))

    def _create_points(self, coords, nb_points):
        """Add some points in order to reach roughly asked number of points"""
        total_length = 0
        prev_coord = None
        for coord in coords:
            if prev_coord is not None:
                total_length += self._dist(prev_coord, coord)
            prev_coord = coord

        if total_length == 0.0:
            return coords

        result = []
        prev_coord = None
        for coord in coords:
            if prev_coord is not None:
                cur_length = self._dist(prev_coord, coord)
                cur_nb_points = \
                    int(nb_points * cur_length / total_length + 0.5)
                if cur_nb_points < 1:
                    cur_nb_points = 1
                dx = (coord[0] - prev_coord[0]) / float(cur_nb_points)
                dy = (coord[1] - prev_coord[1]) / float(cur_nb_points)
                for i in range(1, cur_nb_points + 1):
                    result.append([prev_coord[0] + dx * i,
                                  prev_coord[1] + dy * i])
            else:
                result.append([coord[0], coord[1]])
            prev_coord = coord
        return result
