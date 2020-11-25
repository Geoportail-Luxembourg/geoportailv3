from shapely.geometry import Polygon


def load_point(geometry):
    pass


def geom_type_is_implemented(geometry_type):
    return geometry_type in ['esriGeometryPoint', 'esriGeometryMultipoint', 'esriGeometryPath',
                             'esriGeometryPolyline', 'esriGeometryRing', 'esriGeometryPolygon',
                             'esriGeometryEnvelope']


def feature_to_geom(rawfeature, geometry_type):
    if geometry_type == 'esriGeometryNull':
        pass
    elif geometry_type == 'esriGeometryPoint':
        return {'type': 'Point',
                'coordinates': [rawfeature['geometry']['x'],
                                rawfeature['geometry']['y']]}
    elif geometry_type == 'esriGeometryMultipoint':
        return {'type': 'MultiPoint',
                'coordinates': rawfeature['geometry']['points']}
    elif geometry_type == 'esriGeometryLine':
        pass
    elif geometry_type == 'esriGeometryCircularArc':
        pass
    elif geometry_type == 'esriGeometryEllipticArc':
        pass
    elif geometry_type == 'esriGeometryBezier3Curve':
        pass
    elif geometry_type == 'esriGeometryPath':
        return {'type': 'LineString',
                'coordinates': rawfeature['geometry']['path']}
    elif geometry_type == 'esriGeometryPolyline':
        return {'type': 'MultiLineString',
                'coordinates': rawfeature['geometry']['paths']}
    elif geometry_type == 'esriGeometryRing':
        return {'type': 'Polygon',
                'coordinates': [rawfeature['geometry']['ring']]}
    elif geometry_type == 'esriGeometryPolygon':
        exteriors = []
        interiors = []
        for ring in rawfeature['geometry']['rings']:
            polygon = Polygon(ring)
            if polygon.exterior.is_ccw:
                interiors.append(polygon)
            else:
                exteriors.append(polygon)
        polygons = []
        for shell in exteriors:
            holes = []
            for i, interior in enumerate(interiors):
                if shell.contains(interior):
                    # append shell of ccw polygon
                    holes.append(interiors.pop(i).exterior)
            polygons.append([shell] + holes)
        return {'type': 'MultiPolygon',
                'coordinates': polygons}
    elif geometry_type == 'esriGeometryEnvelope':
        (xmin, ymin, xmax, ymax) = (rawfeature['geometry'][k] for k in ['xmin', 'ymin', 'xmax', 'ymax'])
        return {'type': 'Polygon',
                'coordinates': [[(xmin, ymin), (xmin, ymax), (xmax, ymax), (xmax, ymin), (xmin, ymin)]]}
    elif geometry_type == 'esriGeometryAny':
        pass
    elif geometry_type == 'esriGeometryBag':
        pass
    elif geometry_type == 'esriGeometryMultiPatch':
        pass
    elif geometry_type == 'esriGeometryTriangleStrip':
        pass
    elif geometry_type == 'esriGeometryTriangleFan':
        pass
    elif geometry_type == 'esriGeometryRay':
        pass
    elif geometry_type == 'esriGeometrySphere':
        pass
    elif geometry_type == 'esriGeometryTriangles':
        pass
