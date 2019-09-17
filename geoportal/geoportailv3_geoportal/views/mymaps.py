# -*- coding: utf-8 -*-
import os
import stat
import uuid
import imghdr
import ldap3 as ldap

import geojson
import transaction

from sqlalchemy.sql import text

try:
    from json import dumps as json_dumps
except:
    from simplejson import dumps as json_dumps

from marrow.mailer import Message
from geoportailv3_geoportal.mymaps import Category, Map, Feature, Role, Symbols, Images,\
    RoleCategories, MapUser, CategoryUser
from pyramid.httpexceptions import HTTPBadRequest, HTTPInternalServerError
from pyramid.httpexceptions import HTTPNotFound, HTTPUnauthorized
from pyramid_ldap3 import get_ldap_connector
from pyramid.response import Response
from pyramid.view import view_config
from PIL import Image
from io import BytesIO
from sqlalchemy.orm import make_transient
from sqlalchemy import and_, or_, func
from shapely.wkt import loads
from shapely.ops import linemerge
from shapely.geometry import Point, LineString
from c2cgeoportal_geoportal.lib.caching import set_common_headers, NO_CACHE
from c2cgeoportal_commons.models import DBSessions
from geoportailv3_geoportal import mailer

import logging
import urllib.request
import json
import base64

log = logging.getLogger(__name__)


_CONTENT_TYPES = {
    "gpx": "application/gpx",
    "kml": "application/vnd.google-earth.kml+xml",
}


class Mymaps(object):

    def __init__(self, request):
        self.request = request
        self.config = self.request.registry.settings
        self.db_mymaps = DBSessions['mymaps']
        self.db_pgroute = DBSessions['pgroute']

    @view_config(route_name="get_arrow_color")
    def get_arrow_color(self):
        color = self.request.params.get("color")
        if color is None or len(color) == 0:
            color = "ffffff"
        color = color.replace("#", "")

        dir = "/tmp/arrows"
        if not os.path.exists(dir):
            os.mkdir(dir)
        temp_file_path = dir + "/" + color + ".png"
        # If the colored arrow does not exist then
        # gets the default one, colorizes it and saves it
        if not os.path.exists(temp_file_path):
            url = self.request.static_url(
                'geoportailv3_geoportal:static-ngeo/images/arrow.png')
            orig_arrow = urllib.request.urlopen(url, None, 15)
            content = orig_arrow.read()
            image = Image.open(BytesIO(content))

            pixdata = image.load()
            for y in range(image.size[1]):
                for x in range(image.size[0]):
                    if pixdata[x, y] == (255, 255, 255, 255):
                        pixdata[x, y] =\
                            tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
            image.save(temp_file_path)

        f = open(temp_file_path, "rb")

        return Response(f.read(), headers={'Content-Type': 'image/png'})

    @view_config(route_name="getroute", renderer="json")
    def getroute(self):
        waypoints = self.request.params.get('waypoints', '')
        if len(waypoints) == 0:
            return {"success": False,
                    "errorMessages": ["Waypoints are missing"]}
        waypoints = waypoints.split(",")
        fallback_line = LineString(
                    [Point(float(waypoints[1]), float(waypoints[0])),
                     Point(float(waypoints[3]), float(waypoints[2]))])

        lines_sql = """select ST_ASTEXT(ST_Transform(ST_SetSRID(geom,3857),4326)) geom,
                ST_ASTEXT(ST_Transform(
                st_LineSubstring(ST_SetSRID(geom,3857),0,COALESCE(fraction,1)
                ),4326)) geom_part1,
                ST_ASTEXT(ST_Transform(
                st_LineSubstring(ST_SetSRID(geom,3857),COALESCE(fraction,1),1
                ),4326)) geom_part2,
                ST_ASTEXT(ST_Transform(
                st_LineSubstring(ST_SetSRID(geom,3857),
                    CASE WHEN COALESCE(fraction,1) < COALESCE(fraction2,1)
                         THEN COALESCE(fraction,1) else COALESCE(fraction2,1)
                    END,
                    CASE WHEN COALESCE(fraction,1) < COALESCE(fraction2,1)
                         THEN COALESCE(fraction2,1) else COALESCE(fraction,1)
                    END
                ),4326)) geom_part3,
                COALESCE(fraction,1) fraction from (pgr_withpoints(
               'SELECT gid as id, source, target,
                       st_length(geom) as cost,
                       st_length(geom) as reverse_cost
                FROM public.reseau order by gid',
               '(select 1 as pid, gid as edge_id,
                        ST_LineLocatePoint(reseau.geom,poi1) as fraction
                   from ST_Transform(
                            ST_SetSRID(
                                ST_MakePoint({wp3},{wp2}),4326),3857) as poi1,
                        reseau
                   where st_dwithin(poi1,reseau.geom,100)
                   order by st_distance(poi1,reseau.geom) asc limit 1)
            union
            (select 2 as pid, gid as edge_id,
                    ST_LineLocatePoint(reseau.geom,poi2) as fraction
                   from ST_Transform(
                            ST_SetSRID(
                                ST_MakePoint({wp1},{wp0}),4326),3857) as poi2,
                        reseau
                   where st_dwithin(poi2,reseau.geom,100)
                   order by st_distance(poi2,reseau.geom) asc limit 1)',
            -1,
            -2) as di
            JOIN reseau pt
            ON di.edge = pt.gid
            LEFT JOIN ((select gid as edge_id,
                            ST_LineLocatePoint(reseau.geom,poi1) as fraction,
                            ST_LineLocatePoint(reseau.geom,poi2) as fraction2
                   from ST_Transform(
                            ST_SetSRID(
                                ST_MakePoint({wp3},{wp2}),4326),3857) as poi1,
                        reseau,
                        ST_Transform(
                            ST_SetSRID(
                                ST_MakePoint({wp1},{wp0}),4326),3857) as poi2
                   where st_dwithin(poi1,reseau.geom,100)
                   order by st_distance(poi1,reseau.geom) asc limit 1)
            union
            (select gid as edge_id,
                    ST_LineLocatePoint(reseau.geom,poi2) as fraction,
                    ST_LineLocatePoint(reseau.geom,poi1) as fraction2
                   from ST_Transform(
                            ST_SetSRID(
                                ST_MakePoint({wp1},{wp0}),4326),3857) as poi2,
                        reseau,
                        ST_Transform(
                            ST_SetSRID(
                                ST_MakePoint({wp3},{wp2}),4326),3857) as poi1
                   where st_dwithin(poi2,reseau.geom,100)
                   order by st_distance(poi2,reseau.geom) asc limit 1)) d2
            ON di.edge = d2.edge_id)
            ORDER BY SEQ""".format(wp3=waypoints[3],
                                   wp2=waypoints[2],
                                   wp1=waypoints[1],
                                   wp0=waypoints[0])
        try:
            lines = self.db_pgroute.execute(lines_sql)
        except Exception as e:
            log.exception(e)
            transaction.abort()
            lines = []
            the_line = fallback_line
        new_line = None
        lines_array = []
        for l1 in lines:
            lines_array.append(l1)
        idx = 0
        if len(lines_array) == 2 and\
           lines_array[0].geom == lines_array[1].geom:
            the_line = loads(lines_array[0].geom_part3)
        else:
            for cur_line in lines_array:
                if idx < len(lines_array)-1:
                    next_line = lines_array[idx + 1]
                else:
                    next_line = None
                if new_line is None and next_line is not None:
                    next_geom = loads(next_line.geom)
                    cur_geom = loads(cur_line.geom)

                    if next_geom.coords[0] == cur_geom.coords[0] or\
                       next_geom.coords[-1] == cur_geom.coords[0]:
                        new_line = loads(cur_line.geom_part1)
                    else:
                        new_line = loads(cur_line.geom_part2)
                else:
                    if next_line is None:
                        cur_geom = loads(cur_line.geom)
                        previous_geom = loads(lines_array[idx - 1].geom)
                        if previous_geom.coords[0] == cur_geom.coords[0] or\
                           previous_geom.coords[-1] == cur_geom.coords[0]:
                            new_line = new_line.union(
                                        loads(cur_line.geom_part1))
                        else:
                            new_line = new_line.union(
                                        loads(cur_line.geom_part2))
                    else:
                        new_line = new_line.union(loads(cur_line.geom))
                idx = idx + 1

            if new_line is None:
                the_line = fallback_line
            else:
                the_line = linemerge(new_line)
                # the_line = the_line.simplify(0.00004, preserve_topology=True)
        if not (the_line.geom_type == 'LineString'):
            the_line = fallback_line
        distance1 = Point(float(waypoints[1]), float(waypoints[0])).\
            distance(Point(the_line.coords[0]))
        distance2 = Point(float(waypoints[1]), float(waypoints[0])).\
            distance(Point(the_line.coords[-1]))

        if distance1 > distance2:
            the_line.coords = list(the_line.coords)[::-1]
        geom = geojson.Feature(geometry=the_line, properties={})

        return {"success": True,
                "errorMessages": [],
                "geom": geom.geometry}

    def getroute_old(self):
        waypoints = self.request.params.get('waypoints', '')
        criteria = self.request.params.get('criteria', '1')
        transport_mode = self.request.params.get('transportMode', '1')
        url = "http://routing.geoportail.lu/router/getRoute?criteria=" +\
            criteria + "&transport_mode=" + transport_mode + "&waypoints=" +\
            waypoints
        timeout = 15
        f = urllib.request.urlopen(url, None, timeout)
        data = f.read()
        headers = {"Content-Type": f.info()['Content-Type']}
        return Response(data, headers=headers)

    @view_config(route_name="exportgpxkml")
    def exportgpxkml(self):
        """
        View used to export a GPX or KML document.
        """

        fmt = self.request.params.get("format")
        if fmt is None:
            return HTTPBadRequest("format parameter is required")
        if fmt not in _CONTENT_TYPES:
            return HTTPBadRequest("format is not supported")

        name = self.request.params.get("name")
        if name is None:
            return HTTPBadRequest("name parameter is required")

        doc = self.request.params.get("doc")
        if doc is None:
            return HTTPBadRequest("doc parameter is required")

        charset = "utf-8"
        response = self.request.response
        response.body = doc.encode(charset)
        response.charset = charset
        response.content_disposition = ("attachment; filename=%s.%s"
                                        % (name.replace(" ", "_"), fmt))
        return set_common_headers(
            self.request, "exportgpxkml", NO_CACHE,
            content_type=_CONTENT_TYPES[fmt]
        )

    @view_config(route_name="mymaps_getcategories", renderer="json")
    def categories(self):
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()
        return self._categories(self.db_mymaps, user)

    def _categories(self, session, user):
        if getattr(user, 'is_mymaps_admin', False):
            return self._categories_for_admin(session)
        else:
            return self._categories_for_non_admin(session, user)

    def _categories_for_admin(self, session):
        unique_categ = []
        categories = []
        for usercateg in self.getuserscategories():
            for categ in usercateg['categories']:
                if categ not in unique_categ:
                    unique_categ.append(categ)
                    query = session.query(Category).\
                        filter(Category.id == categ).all()
                    for category in query:
                        categories.append(category.todict())
        return categories

    def _categories_for_non_admin(self, session, user):
        return Category.belonging_to(user, session)

    @view_config(route_name="mymaps_getallcategories", renderer="json")
    def allcategories(self):
        return Category.all(self.db_mymaps)

    @view_config(route_name="mymaps_getpublicmaps", renderer='json')
    def public_maps(self):
        query = self.db_mymaps.query(Map).filter(Map.public == True) # noqa

        category = None
        if 'category' in self.request.params and\
           len(self.request.params['category']) > 0:
            category = self.request.params['category']

        if category is not None:
            query = query.filter(
                func.coalesce(Map.category_id, 999) == category)
        query = query.join(Feature).group_by(Map)
        maps = query.order_by("title asc").all()
        return [{'title': map.title,
                 'uuid': map.uuid,
                 'public': map.public,
                 'create_date': map.create_date,
                 'update_date': map.update_date,
                 'last_feature_update': self.db_mymaps.query(
                    func.max(Feature.update_date)).filter(
                    Feature.map_id == map.uuid).one()[0]
                 if self.db_mymaps.query(
                    func.max(Feature.update_date)).
                 filter(Feature.map_id == map.uuid).one()[0]
                 is not None else map.update_date,
                 'category': map.category.name
                 if map.category_id is not None else None} for map in maps]

    @view_config(route_name="mymaps_getpublicategories", renderer='json')
    def public_categories(self):
        db_mymaps = self.db_mymaps
        categories = self.db_mymaps.query(Category)
        categories = categories.filter(Category.id != 999).\
            filter(Category.list == True) # noqa
        categories = categories.order_by("name asc")
        categ = []
        for category in categories.all():
            map_cnt = db_mymaps.query(Map).\
                filter(Map.public == True).filter( # noqa
                func.coalesce(Map.category_id, 999) == category.id).\
                join(Feature).group_by(Map).count()
            if map_cnt > 0:
                categ.append(
                    {'id': category.id,
                     'name': category.name,
                     'public_map_cnt': map_cnt})
        return categ

    @view_config(route_name="mymaps_getmaps", renderer='json')
    def maps(self):
        session = self.db_mymaps
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()

        params = self.request.params
        owner = None
        category = None
        if 'owner' in params and len(params['owner']) > 0:
            owner = params['owner']

        if 'category' in params and len(params['category']) > 0:
            category = params['category']
        return self._maps(session, user, owner, category)

    def _maps(self, session, user, owner=None, category=None):
        query = None
        is_mymaps_admin = getattr(user, 'is_mymaps_admin', False)
        user_role_id = getattr(user, 'mymaps_role', user.role.id)

        if not is_mymaps_admin:
            owner = user.username

        user_role = session.query(Role).get(user_role_id)
        if user_role is None:
            settings = self.request.registry.settings
            default_mymaps_role = int(settings['default_mymaps_role'])
            user_role = session.query(Role).get(default_mymaps_role)


        allowed_categories = [c.id for c in user_role.categories]

        if allowed_categories is not None and len(allowed_categories) > 0:
            if owner is None:
                if is_mymaps_admin and user_role_id == 1:
                    if category is not None:
                        if category not in allowed_categories:
                            return HTTPUnauthorized()
                        else:
                            query = session.query(Map.uuid).filter(
                                func.coalesce(Map.category_id, 999) ==
                                category)
                    else:
                        query = session.query(Map.uuid).filter(
                            or_(
                                and_(func.coalesce(Map.category_id, 999).in_(
                                    allowed_categories),
                                     func.lower(Map.user_login) !=
                                     func.lower(user.username)),
                                func.lower(Map.user_login) ==
                                func.lower(user.username)
                                ))
                if is_mymaps_admin and user_role_id != 1:
                    if category is not None:
                        if category in allowed_categories:
                            query = session.query(Map.uuid).filter(
                                or_(
                                    and_(func.coalesce(Map.category_id, 999) ==
                                         category,
                                         Map.public == True,
                                         func.lower(Map.user_login) !=
                                         func.lower(user.username)),
                                    and_(func.coalesce(Map.category_id, 999) ==
                                         category,
                                         func.lower(Map.user_login) ==
                                         func.lower(user.username))
                                    )) # noqa
                        else:
                            query = session.query(Map.uuid).filter(
                                and_(func.coalesce(Map.category_id, 999) ==
                                     category,
                                     func.lower(Map.user_login) ==
                                     func.lower(user.username)))
                    else:
                        query = session.query(Map.uuid).filter(
                            or_(
                                and_(func.coalesce(Map.category_id, 999).in_(
                                     allowed_categories),
                                     Map.public == True,
                                     func.lower(Map.user_login) !=
                                     func.lower(user.username)),
                                func.lower(Map.user_login) ==
                                func.lower(user.username)
                                )) # noqa
            else:
                if is_mymaps_admin and user_role_id == 1:
                    if category is not None:
                        if owner != user.username and\
                           category not in allowed_categories:
                            return HTTPUnauthorized()
                        query = session.query(Map.uuid).filter(
                            func.coalesce(Map.category_id, 999) == category)\
                            .filter(func.lower(Map.user_login) ==
                                    func.lower(owner))
                    else:
                        if owner != user.username:
                            query = session.query(Map.uuid).filter(
                                and_(func.coalesce(Map.category_id, 999).in_(
                                     allowed_categories),
                                     func.lower(Map.user_login) ==
                                     func.lower(owner)))
                        else:
                            query = session.query(Map.uuid).\
                                filter(func.lower(Map.user_login) ==
                                       func.lower(user.username))

                if is_mymaps_admin and user_role_id != 1 and owner == user.username:
                    if category is not None:
                        query = session.query(Map.uuid).filter(
                            and_(func.coalesce(Map.category_id, 999) ==
                                 category,
                                 func.lower(Map.user_login) ==
                                 func.lower(user.username)))
                    else:
                        query = session.query(Map.uuid).\
                            filter(func.lower(Map.user_login) ==
                                   func.lower(user.username))
                if is_mymaps_admin and user_role_id != 1 and owner != user.username:
                    if category is not None:
                        if category in allowed_categories:
                            query = session.query(Map.uuid).filter(
                                and_(func.coalesce(Map.category_id, 999) ==
                                     category, Map.public == True,
                                     func.lower(Map.user_login) == func.lower(owner))) # noqa
                        else:
                            return HTTPUnauthorized()

                    else:
                        query = session.query(Map.uuid).filter(
                            and_(Map.public == True,
                                 func.lower(Map.user_login) == func.lower(owner))) # noqa
                if not is_mymaps_admin and owner == user.username:
                    if category is not None:
                        query = session.query(Map.uuid).filter(
                            and_(func.coalesce(Map.category_id, 999) ==
                                 category,
                                 func.lower(Map.user_login) == func.lower(owner))) # noqa
                    else:
                        query = session.query(Map.uuid).\
                            filter(func.lower(Map.user_login) ==
                                   func.lower(owner))

        if query is not None:
            # Get all the mymaps id shared with the current user
            query = session.query(Map.uuid).filter(or_(
                Map.uuid.in_(session.query(MapUser.map_uuid).filter(
                    func.lower(MapUser.user_login) == func.lower(owner))),
                Map.uuid.in_(query),
                Map.uuid.in_(session.query(Map.uuid).filter(
                    func.coalesce(Map.category_id, 999).in_(
                        session.query(CategoryUser.category_id).filter(
                            func.lower(CategoryUser.user_login) ==
                            func.lower(owner))
                    )))))

            db_mymaps = self.db_mymaps

            shared_maps_uuid_query = db_mymaps.query(MapUser.map_uuid).filter(
                    func.lower(MapUser.user_login) == func.lower(owner))
            # Get all the mymaps id shared with the current user
            maps_uuid_query = db_mymaps.query(Map).filter(or_(
                Map.uuid.in_(shared_maps_uuid_query),
                Map.uuid.in_(query)
            ))

            maps = maps_uuid_query.order_by(text("category_id asc,title asc")).all()
            return [{'title': map.title,
                     'uuid': map.uuid,
                     'public': map.public,
                     'create_date': map.create_date,
                     'update_date': map.update_date,
                     'last_feature_update': session.query(
                        func.max(Feature.update_date)).filter(
                        Feature.map_id == map.uuid).one()[0]
                     if session.query(func.max(Feature.update_date)).
                     filter(Feature.map_id == map.uuid).one()[0]
                     is not None else map.update_date,
                     'category': map.category.name
                     if map.category_id is not None else None,
                     'owner': map.user_login.lower()} for map in maps]
        return []

    @view_config(route_name="mymaps_users_categories", renderer='json')
    def getuserscategories(self):
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()
        session = self.db_mymaps
        return self._getuserscategories(session, user)

    def _getuserscategories(self, session, user):
        is_admin = getattr(user, 'is_mymaps_admin', False)
        role_id = getattr(user, 'mymaps_role', user.role.id)
        user_role = session.query(Role).get(role_id)
        if is_admin:
            if role_id == 1:
                return self._getuserscategories_for_first_admin(
                        session, user_role)
            else:
                return self._getuserscategories_for_admin(
                        session, user_role, user)

        return self._getuserscategories_for_non_admin(session, user)

    def _getuserscategories_for_first_admin(self, session, user_role):
        users = session.query(
                func.lower(Map.user_login).label("user_login"),
                func.coalesce(Map.category_id, 999).label("category_id")).\
            filter(func.coalesce(Map.category_id, 999).in_(
                [c.id for c in user_role.categories])).\
            group_by(func.lower(Map.user_login),
                     func.coalesce(Map.category_id, 999)).all()
        user_categories = {}
        for cur_user in users:
            if cur_user.user_login not in user_categories:
                user_categories[cur_user.user_login] =\
                    [cur_user.category_id]
            else:
                user_categories[cur_user.user_login].append(
                    cur_user.category_id)

        return [{'username': cur_user,
                 'categories': user_categories[cur_user]}
                for cur_user in user_categories]

    def _getuserscategories_for_admin(self, session, user_role, user):
        users = session.query(
                func.lower(Map.user_login).label("user_login"),
                func.coalesce(Map.category_id, 999).label("category_id")).\
            filter((and_(func.coalesce(Map.category_id, 999).in_(
                [c.id for c in user_role.categories]),
                Map.public == True)) |
                and_(Map.public == False,
                     func.lower(Map.user_login) ==
                     func.lower(user.username))).\
            group_by(func.lower(Map.user_login),
                     func.coalesce(Map.category_id, 999)).all() # noqa
        user_categories = {}
        for cur_user in users:
            if cur_user.user_login not in user_categories:
                user_categories[cur_user.user_login] =\
                    [cur_user.category_id]
            else:
                user_categories[cur_user.user_login].append(
                    cur_user.category_id)

        return [{'username': cur_user,
                 'categories': user_categories[cur_user]}
                for cur_user in user_categories]

    def _getuserscategories_for_non_admin(self, session, user):
        categies_id = session.query(
            func.coalesce(Map.category_id, 999).label("category_id")).\
            filter(func.lower(Map.user_login) == func.lower(user.username)).\
            group_by(func.coalesce(Map.category_id, 999)).all() # noqa

        return [{'username': user.username, 'categories':
                [c.category_id for c in categies_id]}]

    @view_config(route_name="mymaps_features")
    def features(self):
        id = self.request.matchdict.get("map_id")
        features = self._features(self.db_mymaps, id)

        if features is None:
            return HTTPNotFound()

        gjson_features = geojson.dumps(geojson.FeatureCollection(features))

        if 'cb' in self.request.params:
            cb = self.request.params['cb']
            headers = {'Content-Type': 'text/javascript; charset=utf-8'}
            return Response("%s(%s);" % (cb, gjson_features), headers=headers)

        headers = {'Content-Type': 'application/json'}
        return Response(gjson_features, headers=headers)

    def _features(self, session, id):
        map = Map.get(id, session)

        if map is None:
            return None

        return session.query(Feature).filter(
                Feature.map_id == map.uuid
            ).order_by(
                Feature.display_order
            ).all()

    @view_config(route_name="mymaps_map_info")
    def map_info(self):
        id = self.request.matchdict.get("map_id")
        map = self.db_mymaps.query(Map).filter(Map.uuid == id).first()

        if map is None:
            return HTTPNotFound()
        if 'cb' in self.request.params:
            headers = {'Content-Type': 'text/javascript; charset=utf-8'}
            return Response("%s(%s);"
                            % (self.request.params['cb'],
                               json_dumps({'uuid': map.uuid,
                                           'title': map.title})),
                            headers=headers)
        else:
            headers = {'Content-Type': 'application/json'}
            return Response(json_dumps({'uuid': map.uuid, 'title': map.title}),
                            headers=headers)

    @view_config(route_name="mymaps_create", renderer='json')
    def create(self):
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()
        map = Map()
        map.user_login = user.username

        return self.save(map, self.request.params)

    @view_config(route_name="mymaps_copy", renderer='json')
    def copy(self):
        id = self.request.matchdict.get("map_id")
        map = self.db_mymaps.query(Map).get(id)
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()

        if map is None:
            return HTTPNotFound()

        self.db_mymaps.expunge(map)

        make_transient(map)
        map.uuid = None
        params = self.request.params
        if 'title' in params:
            map.title = str(params.get('title'))
        if 'description' in params:
            map.description = str(params.get('description'))
        map.public = False
        map.user_login = user.username
        map.category_id = None
        if 'category_id' in params:
            cat = params.get('category_id')
            map.category_id = None if cat == '' else cat
        trigger_fme = False

        if 'public' in params:
            public_str = str(params.get('public'))
            if public_str.lower() == u'true':
                map.public = True
                trigger_fme = True
        map.create_date = None
        map.update_date = None
        self.db_mymaps.add(map)
        self.db_mymaps.flush()

        if map.uuid is not None:
            features = self.db_mymaps.query(Feature).filter(
                Feature.map_id == id).all()
            for f in features:
                self.db_mymaps.expunge(f)
                make_transient(f)
                f.id = None
                map.features.append(f)
            self.db_mymaps.flush()
        try:
            if trigger_fme:
                self.notify_at_save(map, map.user_login, map.uuid, map.title,
                                    map.category.name)
        except Exception as e:
            log.exception(e)

        return {'success': map.uuid is not None, 'uuid': map.uuid}

    @view_config(route_name="mymaps_update", renderer='json')
    def update(self):
        id = self.request.matchdict.get("map_id")
        map = self.db_mymaps.query(Map).get(id)

        if map is None:
            return HTTPNotFound()

        if not self.has_write_permission(self.request.user, map):
            return HTTPUnauthorized()

        return self.save(map, self.request.params)

    @view_config(route_name="mymaps_rate", renderer='json')
    def rate(self):
        id = self.request.matchdict.get("map_id")
        if 'rating' not in self.request.params:
            return HTTPBadRequest()
        rating = int(self.request.params.get('rating'))
        if rating < 0 or rating > 5:
            return HTTPBadRequest('Rating value should be between 0 and 5')

        map = self.db_mymaps.query(Map).get(id)
        if map is None:
            return HTTPBadRequest('Map does not exist')
        map.rating = ((map.rating * map.rating_count + rating) /
                      (map.rating_count + 1))
        map.rating_count = map.rating_count + 1
        try:
            self.db_mymaps.add(map)
            return {
                'success': True,
                'rating': map.rating,
                'rating_count': map.rating_count
            }
        except Exception:
            return {'success': False}

    @view_config(route_name="mymaps_save_feature", renderer='json')
    def save_feature(self):
        db_mymaps = self.db_mymaps
        try:
            map_id = self.request.matchdict.get("map_id")
            map = db_mymaps.query(Map).get(map_id)
            if map is None:
                return HTTPNotFound()

            if not self.has_write_permission(self.request.user, map):
                return HTTPUnauthorized()

            if 'feature' not in self.request.params:
                return HTTPBadRequest()

            feature = self.request.params.get('feature').\
                replace(u'\ufffd', '?')
            feature = geojson.loads(feature,
                                    object_hook=geojson.GeoJSON.to_instance)
            feature_id = feature.properties.get('fid')

            obj = Feature(feature)
            obj.last_modified_by = self.request.user.username
            if feature_id:
                cur_feature = db_mymaps.query(Feature).get(feature_id)
                if cur_feature is not None:
                    db_mymaps.delete(cur_feature)
                obj.id = feature_id

            map.features.append(obj)
            db_mymaps.add(obj)
            db_mymaps.flush()
            return {'success': True, 'id': obj.id}
        except Exception as e:
            log.exception(e)
            transaction.abort()
            return {'success': False, 'id': None}

    @view_config(route_name="mymaps_save_offline", renderer='json')
    def save_offline(self):
        db_mymaps = self.db_mymaps
        try:
            user = self.request.user
            if user is None:
                return HTTPUnauthorized()
            data = self.request.json_body
            map_id = data['map']['uuid']
            if map_id[0] == '-':  # starts with a minus / is a new map
                map = Map()
                self.db_mymaps.add(map)
                map.user_login = user.username
                success = self.save(map, data['map'])
                if not success['success']:
                    raise HTTPInternalServerError(
                        'Error with saving the map.'
                    )
                map_uuid = success.get('uuid')
                success = self._save_features_helper(
                    map_uuid, data['features']
                )
                if not success['success']:
                    raise HTTPInternalServerError(
                        'Error saving the features in the map.'
                    )
                db_features = db_mymaps.query(Feature).filter(
                    Feature.map_id == map_uuid
                ).order_by(
                    Feature.display_order
                ).all()
                synched_map = dict()
                self.db_mymaps.flush()
                synched_map['map'] = self._map_formatter(user, map)
                synched_map['features'] = geojson.dumps(
                    geojson.FeatureCollection(db_features)
                )
            elif data['map'].get('deletedWhileOffline', False):
                delete_result = self._delete_helper(map_id)
                if isinstance(delete_result, Exception):
                    return Exception()
                synched_map = {
                    'uuid': map_id,
                    'deletedWhileOffline': True
                }
            else:
                db_mymaps.query(Feature).filter(
                    Feature.map_id == map_id
                ).delete()
                self.db_mymaps.flush()

                if data['features'] is not "":
                    success = self._save_features_helper(
                        map_id, data['features']
                    )
                    if not success['success']:
                        raise HTTPInternalServerError(
                            'Error updating the features in the map.'
                        )

                map = self.db_mymaps.query(Map).get(map_id)
                map.user_login = user.username
                success = self.save(map, data['map'])
                if not success['success']:
                    raise HTTPInternalServerError(
                        'Error with saving the map.'
                    )

                db_features = db_mymaps.query(Feature).filter(
                    Feature.map_id == map_id
                ).order_by(
                    Feature.display_order
                ).all()
                synched_map = dict()
                synched_map['map'] = self._map_formatter(user, map)
                synched_map['features'] = geojson.dumps(
                    geojson.FeatureCollection(db_features)
                )

            return {'success': True, 'data': synched_map}
        except Exception as e:
            log.exception(e)
            db_mymaps.rollback()
            return {'success': False, 'id': None}

    def _map_formatter(self, user, map):
        return {
            'title': map.title,
            'uuid': map.uuid,
            'public': map.public,
            'create_date': map.create_date,
            'update_date': map.update_date,
            'category': map.category.name
            if map.category_id is not None else None,
            'is_editable': self.has_write_permission(user, map),
            'owner': map.user_login.lower(),
            'label': map.label,
            'layers': map.layers,
            'layers_indices': map.layers_indices,
            'layers_opacity': map.layers_opacity,
            'layers_visibility': map.layers_visibility,
            'bg_layer': map.bg_layer,
            'bg_opacity': map.bg_opacity,
            'description': map.description,
            'last_feature_update': self.db_mymaps.query(
                func.max(Feature.update_date)).filter(
                Feature.map_id == map.uuid).one()[0],
            'x': map.x,
            'y': map.y,
            'zoom': map.zoom
        }

    @view_config(route_name="mymaps_save_features", renderer='json')
    def save_features(self):
        try:
            map_id = self.request.matchdict.get("map_id")
            features = self.request.params.get('features'). \
                replace(u'\ufffd', '?')
            return self._save_features_helper(map_id, features)
        except Exception as e:
            log.exception(e)
            self.db_mymaps.rollback()
        return {'success': False}

    def _save_features_helper(self, map_id, features):
        try:
            map = self.db_mymaps.query(Map).get(map_id)
            if map is None:
                return HTTPNotFound()

            if not self.has_write_permission(self.request.user, map):
                return HTTPUnauthorized()

            if not features:
                return HTTPBadRequest()

            feature_collection = geojson.\
                loads(features, object_hook=geojson.GeoJSON.to_instance)

            for feature in feature_collection['features']:
                if 'image' in feature['properties'] and \
                   feature['properties']['image'] is not None and \
                   feature['properties']['image'].startswith('data:image'):
                   # ICI
                    imgstring = feature['properties']['image'].split(",", 1)
                    ext = "." + imgstring[0][11:imgstring[0].find(";base64")]

                    image_name = uuid.uuid4().hex + ext
                    image_name = "/mymaps/images/" + image_name
                    cur_file = Images()
                    cur_file.name = image_name
                    cur_file.image = base64.b64decode(imgstring[1])
                    cur_file.login_owner = self.request.user.username
                    self.db_mymaps.add(cur_file)
                    feature['properties']['image'] = image_name
                    feature['properties']['thumbnail'] = image_name
                feature_id = feature.properties.get('fid')
                obj = None
                try:
                    obj = Feature(feature)
                    obj.last_modified_by = self.request.user.username
                except Exception as e:
                    log.exception(e)
                if obj is not None:
                    if feature_id:
                        cur_feature = self.db_mymaps.query(Feature).\
                            get(feature_id)
                        if cur_feature:
                            self.db_mymaps.delete(cur_feature)

                    map.features.append(obj)

            self.db_mymaps.flush()

            return {'success': True}
        except Exception as e:
            log.exception(e)
            transaction.abort()
            return {'success': False}

    @view_config(route_name="mymaps_save_order", renderer='json')
    def save_order(self):
        db_mymaps = self.db_mymaps
        map_id = self.request.matchdict.get("map_id")
        map = db_mymaps.query(Map).get(map_id)
        if map is None:
            return HTTPNotFound()

        if not self.has_write_permission(self.request.user, map):
            return HTTPUnauthorized()

        if 'orders' not in self.request.params:
            return HTTPBadRequest("Orders param is not available")
        orders = json.loads(self.request.params.get('orders'))
        for order in orders:
            feature_id = order['fid']
            display_order = order['display_order']
            try:
                cur_feature = db_mymaps.query(Feature).get(feature_id)
                cur_feature.display_order = display_order
            except Exception as e:
                log.exception(e)
                transaction.abort()
                return {'success': False}
        return {'success': True}

    @view_config(route_name="mymaps_delete_feature", renderer='json')
    def delete_feature(self):
        id = self.request.matchdict.get("feature_id")

        feature = self.db_mymaps.query(Feature).get(id)
        if feature is None:
            return HTTPNotFound()

        map = self.db_mymaps.query(Map).get(feature.map_id)
        if map is None:
            return HTTPNotFound()

        if not self.has_write_permission(self.request.user, map):
            return HTTPUnauthorized()

        self.db_mymaps.delete(feature)
        return {'success': True}

    def has_write_permission(self, user, map):
        if user is None:
            return False
        if map.user_login.lower() != user.username.lower():
            user = self.request.user
            map_count = self.db_mymaps.query(MapUser).filter(
                MapUser.read_only == False).filter( # noqa
                func.lower(MapUser.user_login) == func.lower(user.username))\
                .filter(MapUser.map_uuid == map.uuid).count()
            if map_count > 0:
                return True

            map_count = self.db_mymaps.query(CategoryUser).filter(
                CategoryUser.read_only == False).filter( # noqa
                func.lower(CategoryUser.user_login) ==
                func.lower(user.username))\
                .filter(CategoryUser.category_id ==
                        func.coalesce(map.category_id, 999)).count()
            if map_count > 0:
                return True

            if not getattr(user, 'is_mymaps_admin', False):
                return False
            user_role = self.db_mymaps.query(Role).get(getattr(
                user, 'mymaps_role', user.role.id))
            if map.category is None and 999 in\
                    [cat.id for cat in user_role.categories]:
                return True
            if map.category is None or map.category.id not in\
                    [cat.id for cat in user_role.categories]:
                return False
        return True

    @view_config(route_name="mymaps_delete", renderer='json')
    def delete(self):
        id = self.request.matchdict.get("map_id")
        return self._delete_helper(id)

    def _delete_helper(self, id):
        map = self.db_mymaps.query(Map).get(id)
        if map is None:
            return HTTPNotFound()
        if not self.has_write_permission(self.request.user, map):
            return HTTPUnauthorized()
        # Remove the shared users
        self.db_mymaps.query(MapUser).\
            filter(MapUser.map_uuid == map.uuid).delete()

        # remove the features associated to the map
        features = self.db_mymaps.query(Feature).filter(
            Feature.map_id == map.uuid).all()
        for f in features:
            self.db_mymaps.delete(f)
        self.db_mymaps.delete(map)
        self.db_mymaps.flush()

        return {'success': True}

    @view_config(route_name="mymaps_delete_all_features", renderer='json')
    def delete_all_features(self):
        id = self.request.matchdict.get("map_id")

        map = self.db_mymaps.query(Map).get(id)
        if map is None:
            return HTTPNotFound()
        if not self.has_write_permission(self.request.user, map):
            return HTTPUnauthorized()

        # remove the features associated to the map
        features = self.db_mymaps.query(Feature).filter(
            Feature.map_id == map.uuid).all()
        for f in features:
            self.db_mymaps.delete(f)

        return {'success': True}

    def save(self, map, params, id=None):
        #
        # deal with the map itself
        #
        if 'X' in params:
            try:
                map.x = float(params.get('X'))
            except ValueError:
                return HTTPBadRequest()
        if 'Y' in params:
            try:
                map.y = float(params.get('Y'))
            except ValueError:
                return HTTPBadRequest()
        if 'zoom' in params:
            map.zoom = int(params.get('zoom') or '0')
        if 'title' in params:
            map.title = str(params.get('title'))
        if 'description' in params:
            map.description = str(params.get('description'))
        if 'theme' in params:
            map.theme = str(params.get('theme'))
        if 'bgLayer' in params:  # online (permalink) save a map
            map.bg_layer = str(params.get('bgLayer'))
        if 'bg_layer' in params:  # offline save a map
            map.bg_layer = str(params.get('bg_layer'))
        if 'bgOpacity' in params:
            map.bg_opacity = params.get('bgOpacity')\
                if params.get('bgOpacity') != '' else 100
        if 'layers' in params:
            map.layers = str(params.get('layers'))
        if 'layers_indices' in params:
            map.layers_indices = str(params.get('layers_indices'))
        if 'layers_opacity' in params:
            map.layers_opacity = str(params.get('layers_opacity'))
        if 'layers_visibility' in params:
            map.layers_visibility = str(params.get('layers_visibility'))
        if 'selectedNode' in params:
            map.selected_node =\
                str(params.get('selectedNode'))
        if 'category_id' in params:
            cat = params.get('category_id')
            map.category_id = None if cat == '' else cat
        trigger_fme = False
        if 'public' in params:
            public_str = str(params.get('public')).lower()
            if public_str == u'true':
                if not map.public:
                    trigger_fme = True
                map.public = True
            elif public_str == u'false':
                map.public = False
        if 'label' in params:
            map.label = str(params.get('label'))

        try:
            self.db_mymaps.add(map)
            self.db_mymaps.flush()
        except Exception as e:
            log.exception(e)
            return {'success': False}

        try:
            if trigger_fme:
                self.notify_at_save(map, map.user_login, map.uuid, map.title,
                                    map.category.name)
        except Exception as e:
            log.exception(e)

        return {'success': True, 'uuid': map.uuid}

    @view_config(route_name="mymaps_map", renderer='json')
    def map(self):
        id = self.request.matchdict.get("map_id")
        user = self.request.user
        map = self._map(self.db_mymaps, user, id)

        if map is None:
            return HTTPNotFound()

        json = json_dumps(map)

        if 'cb' in self.request.params:
            cb = self.request.params['cb']
            headers = {'Content-Type': 'text/javascript; charset=utf-8'}
            return Response("%s(%s);" % (cb, json), headers=headers)

        headers = {'Content-Type': 'application/json'}
        return Response(json, headers=headers)

    def _map(self, session, user, id):
        map = Map.get(id, session)

        if map is None:
            return None

        dict_map = dict(map)
        dict_map["is_editable"] = self.has_write_permission(user, map)
        return dict_map

    @view_config(route_name="mymaps_get_image")
    def image(self):
        filename = self.request.matchdict.get("filename")
        if self.db_mymaps.query(Images).\
                filter(Images.name == filename).count() > 0:
            cur_file = self.db_mymaps.query(Images).\
                filter(Images.name == filename).one()
            the_image = cur_file.image
            lower_file_name = cur_file.name.lower()
            if "." in lower_file_name:
                splitted_name = cur_file.name.lower().split(".")
                headers = {'Content-Type': 'image/'+splitted_name[-1]}
            if lower_file_name.endswith(".jpg"):
                headers = {'Content-Type': 'image/jpeg'}
            if lower_file_name.endswith(".jpeg"):
                headers = {'Content-Type': 'image/jpeg'}
            if lower_file_name.endswith(".gif"):
                headers = {'Content-Type': 'image/gif'}
            if lower_file_name.endswith(".png"):
                headers = {'Content-Type': 'image/png'}
            if lower_file_name.endswith(".bmp"):
                headers = {'Content-Type': 'image/bmp'}

            return Response(the_image, headers=headers)

        return HTTPNotFound()

    @view_config(route_name="mymaps_upload_image", renderer='json')
    def upload_image(self):
        thumb_size = 80, 80
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()

        file = self.request.POST['file']

        # type checking
        if file != '' and not imghdr.what(file.file):
            return {'success': False, 'msg': 'Bad image'}

        # image resizing
        image = Image.open(file.file)
        thumbnail = image.copy()
        thumbnail.thumbnail(thumb_size, Image.ANTIALIAS)

        _, ext = os.path.splitext(file.filename)
        name = uuid.uuid4().hex

        image_name = name + ext
        thumbnail_name = name + '_thumb' + ext

        # we need to convert to ascii, or routes.url
        # will shout at us
        try:
            image_name = image_name.encode('ascii')
            thumbnail_name = thumbnail_name.encode('ascii')
        except UnicodeEncodeError:
            return {'success': False, 'msg': 'Bad image name'}

        path = '/tmp'
        # create the directory if it doesn't exist
        if not os.path.exists(path):
            os.makedirs(path)

        try:
            image.save(os.path.join(path, image_name.decode('utf-8')))
            thumbnail.save(os.path.join(path, thumbnail_name.decode('utf-8')))
        except Exception as e:
            log.exception(e)
            return {'success': False, 'msg': 'Bad image'}
        finally:
            file.file.close()

        try:
            f_image = open(os.path.join(path, image_name.decode('utf-8')), 'rb')
            f_thumbnail = open(os.path.join(path, thumbnail_name.decode('utf-8')), 'rb')
            user = self.request.user.username

            cur_file = Images()
            cur_file.name = image_name.decode('utf-8')
            cur_file.image = f_image.read()
            cur_file.login_owner = user
            self.db_mymaps.add(cur_file)

            cur_file = Images()
            cur_file.name = thumbnail_name.decode('utf-8')
            cur_file.image = f_thumbnail.read()
            cur_file.login_owner = user
            self.db_mymaps.add(cur_file)

        except Exception as e:
            log.exception(e)
            return {'success': False, 'msg': 'Bad image'}
        finally:
            f_image.close()
            f_thumbnail.close()

        os.remove(os.path.join(path, image_name.decode('utf-8')))
        os.remove(os.path.join(path, thumbnail_name.decode('utf-8')))

        return {'success': True,
                'image': '/mymaps/images/' + image_name.decode('utf-8'),
                'thumbnail': '/mymaps/images/' + thumbnail_name.decode('utf-8')}


    @view_config(route_name="generate_symbol_file")
    def generate_symbol_file(self):

        user = self.request.user
        if user is None:
            return HTTPUnauthorized()

        dir = self.config["temp_mapfile"]
        if not os.path.exists(dir):
            os.mkdir(dir)
        symbolsmap = ""
        for symbol in self.db_mymaps.query(Symbols).all():
            _, ext = os.path.splitext(symbol.symbol_name)
            symbolsmap = symbolsmap + """
                SYMBOL
                      NAME "%s"
                      TYPE pixmap
                      IMAGE "/home/mapserver/config/MYMAPS/symbols/%s"
                END
            """ % (symbol.id, str(symbol.id) + ext)

        the_file = open(dir+"/symbols.map", 'w+')
        the_file.write(symbolsmap)
        the_file.close()
        script_file = open(dir+"/script.sh", 'w+')
        script_ms = self.config["sync_ms_path"]

        script_file.write('sh %s %s \n'
                          % (script_ms, dir + "/" + "/symbols.map"))

        for symbol in self.db_mymaps.query(Symbols).\
                filter(Symbols.synchronized == False).all():  # noqa

            _, ext = os.path.splitext(symbol.symbol_name)

            the_name = str(symbol.id)+ext
            the_file = open(dir+"/"+the_name, 'w+')

            the_file.write(symbol.symbol)
            the_file.close()
            symbol.synchronized = True
            script_file.write('sh %s %s remove \n'
                              % (script_ms, dir + "/" + the_name))
        script_file.close()

        st = os.stat("%s/script.sh" % (dir))
        os.chmod("%s/script.sh" % (dir),
                 st.st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    @view_config(route_name="mymaps_get_symbol")
    def get_symbol(self):
        id = self.request.matchdict.get("symbol_id")
        scale = self.request.params.get("scale")
        if scale is None:
            scale = 100

        try:
            symbol = self.db_mymaps.query(Symbols).\
                filter(Symbols.id == id).one()
            try:
                headers = {'Content-Type': 'application/octet-stream',
                           'Content-Disposition': 'filename=\"%s\";'
                           % (symbol.symbol_name)
                           }
            except:
                headers = {'Content-Type': 'application/octet-stream',
                           'Content-Disposition': 'filename=\"%s\";'
                           % (str(symbol.id))
                           }
            format = ""
            if symbol.symbol_name.lower().endswith(".jpg"):
                headers = {'Content-Type': 'image/jpeg'}
                format = "PNG"
            if symbol.symbol_name.lower().endswith(".jpeg"):
                headers = {'Content-Type': 'image/jpeg'}
                format = "JPEG"
            if symbol.symbol_name.lower().endswith(".gif"):
                headers = {'Content-Type': 'image/gif'}
                format = "GIF"
            if symbol.symbol_name.lower().endswith(".png"):
                headers = {'Content-Type': 'image/png'}
                format = "PNG"
            if scale != 100:
                from PIL import Image
                import io
                image = Image.open(io.BytesIO(symbol.symbol))
                img_byte_arr = io.BytesIO()

                thumbnail = image.resize(
                    (round(image.size[0] * int(scale)/100),
                     round(image.size[1] * int(scale)/100)))
                thumbnail.save(img_byte_arr, format=format)
                return Response(img_byte_arr.getvalue(), headers=headers)
            return Response(symbol.symbol, headers=headers)
        except Exception as e:
            log.exception(e)

            from PIL import Image, ImageDraw

            img = Image.new('RGBA', (40, 40))
            ImageDraw.Draw(img)

            buf = BytesIO()
            img.save(buf, 'GIF', transparency=0)
            content = buf.getvalue()
            buf.close()
            headers = {'Content-Type': 'image/gif'}
            return Response(content, headers=headers)

    @view_config(route_name="mymaps_get_symbols")
    def get_symbols(self):

        results = []
        try:
            symbol_type = self.request.params.get('symboltype', 'pixmap')
            if symbol_type == 'public':
                for symbol in self.db_mymaps.query(Symbols).\
                        filter(Symbols.is_public == True).all():  # noqa
                    results.append({'id': symbol.id,
                                    'name': symbol.symbol_name,
                                    'url': "/symbol/%s"
                                    % (str(symbol.id)),
                                    'symboltype': 'public'})

            if symbol_type == 'us':
                user = self.request.user
                if user is None:
                    return HTTPUnauthorized()
                for symbol in self.db_mymaps.query(Symbols).\
                        filter(func.lower(Symbols.login_owner) ==
                               func.lower(user.username)).all():
                    results.append({'id': symbol.id,
                                    'name': symbol.symbol_name,
                                    'url': "/symbol/%s"
                                    % (str(symbol.id)),
                                    'symboltype': 'us'})
        except Exception as e:
            log.exception(e)

        if 'cb' not in self.request.params:
            headers = {'Content-Type': 'application/json;charset=utf-8;'}
            return Response(json_dumps({'success': True,
                                        'count': len(results),
                                        'results': results}),
                            headers=headers)
        else:
            headers = {'Content-Type': 'text/javascript; charset=utf-8'}
            return Response((self.request.params['cb'] +
                             '(' + json_dumps({'success': True,
                                               'count': len(results),
                                               'results': results}) + ');'),
                            headers=headers)

    @view_config(route_name="mymaps_upload_symbol", renderer='json')
    def upload_symbol(self):

        user = self.request.user
        if user is None:
            return HTTPUnauthorized()
        username = user.username
        file = self.request.POST['file']

        # type checking
        if file != '' and not imghdr.what(file.file):
            return {'success': True, 'msg': 'Bad image'}

        if file is None:
            return json_dumps({'ok': 'false',
                               'description': 'No file to save'})

        filename = file.filename
        input_file = file.file
        if not os.path.exists("/tmp/"+username):
            os.makedirs("/tmp/"+username)
        file_path = os.path.join("/tmp/"+username, filename)

        temp_file_path = file_path + '~'
        output_file = open(temp_file_path, 'wb')

        input_file.seek(0)
        while True:
            data = input_file.read(2 << 16)
            if not data:
                break
            output_file.write(data)

        output_file.close()

        im1 = Image.open(temp_file_path)
        scaled_width = 900
        scaled_height = 900

        width, height = im1.size
        if width > scaled_width:
            ratio = width/scaled_width
            scaled_height = round(height / ratio)
            im2 = im1.resize((scaled_width, scaled_height), Image.NEAREST)
            im2.save(file_path)
            f = open(file_path, "rb")
        else:
            f = open(temp_file_path, "rb")
        try:
            cur_file = Symbols()
            cur_file.symbol_name = file.filename
            cur_file.symbol = f.read()
            cur_file.login_owner = username
            cur_file.is_public = False
            self.db_mymaps.add(cur_file)
            self.db_mymaps.flush()
            file_id = cur_file.id
            transaction.commit()

        except Exception as e:
            log.exception(e)
            transaction.abort()

        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        if os.path.exists(file_path):
            os.remove(file_path)

        try:
            self.generate_symbol_file()
        except Exception as e:
            log.exception(e)
            transaction.abort()

        return {'success': 'true',
                'description': 'file added',
                'result': {
                    'url': "/symbol/" + str(file_id),
                    'id': file_id,
                    'symboltype': 'us',
                    'name': filename}}

    @view_config(route_name="mymaps_comment", renderer='json')
    def comment(self):
        id = self.request.matchdict.get("map_id")
        map = Map.get(id)
        if map is None:
            return HTTPNotFound()

        # read the map author's email address from LDAP
        author = self.get_user_info(map.user_login.lower())

        comment = self.request.params.get('comment')

        if self.request.params.get('name') and self.request.params.get('mail'):
            # feedback anonymous user
            feedback_name = self.request.params.get('name')
            feedback_mail = self.request.params.get('mail')
        else:
            # feedback loggedin user
            user = self.get_user_info(self.request.user.username)
            feedback_name = user[0]
            feedback_mail = user[1]
        try:
            message = Message(
                author='support@geoportail.lu',
                to=author[1],
                bcc='ecadastre@act.etat.lu',
                subject=(u'comment_email_subject')
                    % {'title': map.title +
                       " ( http://map.geoportail.lu/?map_id="+map.uuid+" ) ",
                       'feedback_name': feedback_name,
                       'feedback_mail': feedback_mail},
                plain=comment)
        except Exception as e:
            log.exception(e)
            return HTTPNotFound()
        message.encoding = 'utf-8'
        mailer.send(message)
        return {'success': True}

    def strip_accents(self, string):
        import unicodedata
        return unicodedata.normalize('NFKD', str(string)).\
            encode('ASCII', 'ignore').replace(' ', '_')

    def get_user_info(self, user):
         connector = get_ldap_connector(self.request)
         cm = connector.manager
         with cm.connection() as conn:
             dn_list = conn.search_s('ou=portail,dc=act,dc=lu',
                                     ldap.SUBTREE, '(login=%s)' % user)
             if len(dn_list) != 1:
                 return HTTPInternalServerError()

             dn = dn_list[0][0]
             attributes = conn.search_s(dn,
                                        ldap.SCOPE_BASE,
                                        '(objectClass=*)',
                                        ['mail'])
             if len(attributes) == 0 or len(attributes[0]) != 2:
                 return HTTPInternalServerError()
             attributes = attributes[0][1]
             if 'mail' not in attributes or len(attributes['mail']) == 0:
                 return HTTPNotFound()
             mail_address = attributes['mail'][0]
             if not mail_address:
                 return HTTPNotFound()
             conn.unbind()
             return (user, mail_address)

    def notify_at_save(self, map, username, id, name, category):

        if self.config["modify_notification"]["url"] is not None and\
           "admin_email" in self.config["modify_notification"]:
            url = self.config["modify_notification"]["url"]
            admin_email = self.config["modify_notification"]["admin_email"]
            email_cc = ""
            if "email_cc" in self.config["modify_notification"]:
                email_cc = self.config["modify_notification"]["email_cc"]
            if map.category_id is not None and map.category.id == 302 and\
               map.public:
                email_content = u"""Bonjour,<br>l\'utilisateur %s a
                modifié une carte publique de la catégorie %s:<br>
                <a href='http://map.geoportail.lu?map_id=%s'>%s</a><br>
                Cordialement,<br>Le géoportail"""\
                    % (username, category, id, name)
                data = {'email_to': admin_email,
                        'subscriber_content': email_content,
                        'email_cc': email_cc}
                req = urllib.request.Request(url)
                req.add_header('Content-Type', 'application/json')
                urllib.request.urlopen(req, json.dumps(data))

    @view_config(route_name="mymaps_get_full_mymaps", renderer='json')
    def get_all_maps(self):
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()
        session = self.db_mymaps
        return self._get_all_maps(session, user)

    def _get_all_maps(self, session, user):
        full_mymaps = {}
        full_mymaps['users_categories'] = self._getuserscategories(session,
                                                                   user)
        maps = self._maps(session, user)
        full_mymaps['maps'] = maps
        maps_elements = {}

        for map in maps:
            uuid = map['uuid']
            try:
                element = {}
                element['map'] = self._map(session, user, uuid)
                features = self._features(session, uuid)
                element['features'] = geojson.dumps(
                    geojson.FeatureCollection(features)
                )
                maps_elements[uuid] = element
            except Exception as e:
                log.warn(e)

        full_mymaps['maps_elements'] = maps_elements
        return full_mymaps
