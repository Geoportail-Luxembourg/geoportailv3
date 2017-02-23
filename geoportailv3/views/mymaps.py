# -*- coding: utf-8 -*-
import os
import uuid
import imghdr
import ldap


import geojson

try:
    from json import dumps as json_dumps
except:
    from simplejson import dumps as json_dumps

from turbomail import Message
from geoportailv3.mymaps import Category, Map, Feature, Role, Symbols, Images
from pyramid.httpexceptions import HTTPBadRequest, HTTPInternalServerError
from pyramid.httpexceptions import HTTPNotFound, HTTPUnauthorized
from pyramid_ldap import get_ldap_connector
from pyramid.response import Response
from pyramid.view import view_config
from PIL import Image
from geoportailv3.mymaps import DBSession
from sqlalchemy.orm import make_transient
from sqlalchemy import and_, or_, func
from c2cgeoportal.lib.caching import set_common_headers, NO_CACHE
import logging
import urllib2
import json
log = logging.getLogger(__name__)


_CONTENT_TYPES = {
    "gpx": "application/gpx",
    "kml": "application/vnd.google-earth.kml+xml",
}


class Mymaps(object):

    def __init__(self, request):
        self.request = request
        self.config = self.request.registry.settings

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
        if self.request.user is None:
            return HTTPUnauthorized()

        return Category.belonging_to(self.request.user)

    @view_config(route_name="mymaps_getallcategories", renderer="json")
    def allcategories(self):
        return Category.all()

    @view_config(route_name="mymaps_getmaps", renderer='json')
    def maps(self):
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()
        owner = None
        if 'owner' in self.request.params and\
           len(self.request.params['owner']) > 0:
            owner = self.request.params['owner']
        if not user.is_admin:
            owner = user.username

        query = None
        category = None
        if 'category' in self.request.params and\
           self.request.params['category'] > 0:
            category = int(self.request.params["category"])
        user_role = DBSession.query(Role).get(user.mymaps_role)
        if user_role is None:
            user_role = DBSession.query(Role).get(999)

        allowed_categories = [c.id for c in user_role.categories]

        if allowed_categories is not None and len(allowed_categories) > 0:
            if owner is None:
                if user.is_admin and user.mymaps_role == 1:
                    if category is not None:
                        if category not in allowed_categories:
                            return HTTPUnauthorized()
                        else:
                            query = DBSession.query(Map).filter(
                                func.coalesce(Map.category_id, 999) ==
                                category)
                    else:
                        query = DBSession.query(Map).filter(
                            or_(
                                and_(func.coalesce(Map.category_id, 999).in_(
                                    allowed_categories),
                                     func.lower(Map.user_login) !=
                                     func.lower(user.username)),
                                func.lower(Map.user_login) ==
                                func.lower(user.username)
                                ))
                if user.is_admin and user.mymaps_role != 1:
                    if category is not None:
                        if category in allowed_categories:
                            query = DBSession.query(Map).filter(
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
                            query = DBSession.query(Map).filter(
                                and_(func.coalesce(Map.category_id, 999) ==
                                     category,
                                     func.lower(Map.user_login) ==
                                     func.lower(user.username)))
                    else:
                        query = DBSession.query(Map).filter(
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
                if user.is_admin and user.mymaps_role == 1:
                    if category is not None:
                        if owner != user.username and\
                           category not in allowed_categories:
                            return HTTPUnauthorized()
                        query = DBSession.query(Map).filter(
                            func.coalesce(Map.category_id, 999) == category)\
                            .filter(func.lower(Map.user_login) ==
                                    func.lower(owner))
                    else:
                        if owner != user.username:
                            query = DBSession.query(Map).filter(
                                and_(func.coalesce(Map.category_id, 999).in_(
                                     allowed_categories),
                                     func.lower(Map.user_login) ==
                                     func.lower(owner)))
                        else:
                            query = DBSession.query(Map).\
                                filter(func.lower(Map.user_login) ==
                                       func.lower(user.username))

                if user.is_admin and user.mymaps_role != 1\
                   and owner == user.username:
                    if category is not None:
                        query = DBSession.query(Map).filter(
                            and_(func.coalesce(Map.category_id, 999) ==
                                 category,
                                 func.lower(Map.user_login) ==
                                 func.lower(user.username)))
                    else:
                        query = DBSession.query(Map).\
                            filter(func.lower(Map.user_login) ==
                                   func.lower(user.username))
                if user.is_admin and user.mymaps_role != 1\
                   and owner != user.username:
                    if category is not None:
                        if category in allowed_categories:
                            query = DBSession.query(Map).filter(
                                and_(func.coalesce(Map.category_id, 999) ==
                                     category, Map.public == True,
                                     func.lower(Map.user_login) == func.lower(owner))) # noqa
                        else:
                            return HTTPUnauthorized()

                    else:
                        query = DBSession.query(Map).filter(
                            and_(Map.public == True,
                                 func.lower(Map.user_login) == func.lower(owner))) # noqa
                if not user.is_admin and owner == user.username:
                    if category is not None:
                        query = DBSession.query(Map).filter(
                            and_(func.coalesce(Map.category_id, 999) ==
                                 category,
                                 func.lower(Map.user_login) == func.lower(owner))) # noqa
                    else:
                        query = DBSession.query(Map).\
                            filter(func.lower(Map.user_login) ==
                                   func.lower(owner))

        if query is not None:
            maps = query.order_by("category_id asc,title asc").all()
            return [{'title': map.title,
                     'uuid': map.uuid,
                     'public': map.public,
                     'create_date': map.create_date,
                     'update_date': map.update_date,
                     'category': map.category.name
                     if map.category_id is not None else None,
                     'owner': map.user_login.lower()} for map in maps]
        return []

    @view_config(route_name="mymaps_users_categories", renderer='json')
    def getuserscategories(self):
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()
        user_role = DBSession.query(Role).get(user.mymaps_role)

        if user.is_admin and user.mymaps_role == 1:
            users = DBSession.query(
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

        if user.is_admin and user.mymaps_role != 1:
            users = DBSession.query(
                    func.lower(Map.user_login),
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

        categies_id = DBSession.query(
            func.coalesce(Map.category_id, 999).label("category_id")).\
            filter(func.lower(Map.user_login) == func.lower(user.username)).\
            group_by(func.coalesce(Map.category_id, 999)).all() # noqa

        return [{'username': user.username, 'categories':
                [c.category_id for c in categies_id]}]

    @view_config(route_name="mymaps_features")
    def features(self):
        id = self.request.matchdict.get("map_id")
        map = DBSession.query(Map).get(id)
        if map is None:
            return HTTPNotFound()

        features = DBSession.query(Feature).filter(
            Feature.map_id == map.uuid).all()
        if 'cb' in self.request.params:
            headers = {'Content-Type': 'text/javascript; charset=utf-8'}
            return Response("%s(%s);"
                            % (self.request.params['cb'],
                               geojson.dumps(
                                   geojson.FeatureCollection(features))),
                            headers=headers)

        headers = {'Content-Type': 'application/json'}
        return Response(geojson.dumps(geojson.FeatureCollection(features)),
                        headers=headers)

    @view_config(route_name="mymaps_map_info")
    def map_info(self):
        id = self.request.matchdict.get("map_id")
        map = DBSession.query(Map).filter(Map.uuid == id).first()

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

        return self.save(map)

    @view_config(route_name="mymaps_copy", renderer='json')
    def copy(self):
        id = self.request.matchdict.get("map_id")
        map = DBSession.query(Map).get(id)
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()

        if map is None:
            return HTTPNotFound()

        DBSession.expunge(map)

        make_transient(map)
        map.uuid = None
        params = self.request.params
        if 'title' in params:
            map.title = unicode(params.get('title'))
        if 'description' in params:
            map.description = unicode(params.get('description'))
        map.public = False
        map.user_login = user.username
        map.category_id = None
        if 'category_id' in params:
            cat = params.get('category_id')
            map.category_id = None if cat == '' else cat
        trigger_fme = False

        if 'public' in params:
            str = unicode(params.get('public'))
            if str.lower() == u'true':
                map.public = True
                trigger_fme = True
        map.create_date = None
        map.update_date = None
        DBSession.add(map)
        DBSession.commit()

        if map.uuid is not None:
            features = DBSession.query(Feature).filter(
                Feature.map_id == id).all()
            for f in features:
                DBSession.expunge(f)
                make_transient(f)
                f.id = None
                map.features.append(f)
            DBSession.commit()
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
        map = DBSession.query(Map).get(id)

        if map is None:
            return HTTPNotFound()

        if not self.has_permission(self.request.user, map):
            return HTTPUnauthorized()

        return self.save(map, id)

    @view_config(route_name="mymaps_rate", renderer='json')
    def rate(self):
        id = self.request.matchdict.get("map_id")
        if 'rating' not in self.request.params:
            return HTTPBadRequest()
        rating = int(self.request.params.get('rating'))
        if rating < 0 or rating > 5:
            return HTTPBadRequest('Rating value should be between 0 and 5')

        map = DBSession.query(Map).get(id)
        if map is None:
            return HTTPBadRequest('Map does not exist')
        map.rating = ((map.rating * map.rating_count + rating) /
                      (map.rating_count + 1))
        map.rating_count = map.rating_count + 1
        try:
            DBSession.add(map)
            DBSession.commit()
            return {
                'success': True,
                'rating': map.rating,
                'rating_count': map.rating_count
            }
        except Exception:
            return {'success': False}

    @view_config(route_name="mymaps_save_feature", renderer='json')
    def save_feature(self):
        try:
            map_id = self.request.matchdict.get("map_id")
            map = DBSession.query(Map).get(map_id)
            if map is None:
                return HTTPNotFound()

            if not self.has_permission(self.request.user, map):
                return HTTPUnauthorized()

            if 'feature' not in self.request.params:
                return HTTPBadRequest()

            feature = self.request.params.get('feature').\
                replace(u'\ufffd', '?')
            feature = geojson.loads(feature,
                                    object_hook=geojson.GeoJSON.to_instance)
            feature_id = feature.properties.get('fid')

            obj = Feature(feature)

            if feature_id:
                cur_feature = DBSession.query(Feature).get(feature_id)
                if cur_feature is not None:
                    DBSession.delete(cur_feature)
                obj.id = feature_id

            map.features.append(obj)
            DBSession.commit()

            return {'success': True, 'id': obj.id}
        except Exception as e:
            log.exception(e)
            DBSession.rollback()
            return {'success': False, 'id': None}

    @view_config(route_name="mymaps_save_features", renderer='json')
    def save_features(self):
        try:
            map_id = self.request.matchdict.get("map_id")
            map = DBSession.query(Map).get(map_id)
            if map is None:
                return HTTPNotFound()

            if not self.has_permission(self.request.user, map):
                return HTTPUnauthorized()

            if 'features' not in self.request.params:
                return HTTPBadRequest()

            features = self.request.params.get('features').\
                replace(u'\ufffd', '?')
            feature_collection = geojson.\
                loads(features, object_hook=geojson.GeoJSON.to_instance)

            for feature in feature_collection['features']:
                feature_id = feature.properties.get('fid')
                obj = Feature(feature)
                if feature_id:
                    cur_feature = DBSession.query(Feature).get(feature_id)
                    DBSession.delete(cur_feature)
                    obj.id = feature_id

                map.features.append(obj)

            DBSession.commit()

            return {'success': True}
        except Exception as e:
            log.exception(e)
            DBSession.rollback()
            return {'success': False}

    @view_config(route_name="mymaps_delete_feature", renderer='json')
    def delete_feature(self):
        id = self.request.matchdict.get("feature_id")

        feature = DBSession.query(Feature).get(id)
        if feature is None:
            return HTTPNotFound()

        map = DBSession.query(Map).get(feature.map_id)
        if map is None:
            return HTTPNotFound()

        if not self.has_permission(self.request.user, map):
            return HTTPUnauthorized()

        DBSession.delete(feature)
        DBSession.commit()

        return {'success': True}

    def has_permission(self, user, map):
        if user is None:
            return False
        if map.user_login.lower() != user.username.lower():
            user = self.request.user
            if not user.is_admin:
                return False
            user_role = DBSession.query(Role).get(user.mymaps_role)
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

        map = DBSession.query(Map).get(id)
        if map is None:
            return HTTPNotFound()
        if not self.has_permission(self.request.user, map):
            return HTTPUnauthorized()

        # remove the features associated to the map
        features = DBSession.query(Feature).filter(
            Feature.map_id == map.uuid).all()
        for f in features:
            DBSession.delete(f)
        DBSession.delete(map)
        DBSession.commit()

        return {'success': True}

    @view_config(route_name="mymaps_delete_all_features", renderer='json')
    def delete_all_features(self):
        id = self.request.matchdict.get("map_id")

        map = DBSession.query(Map).get(id)
        if map is None:
            return HTTPNotFound()
        if not self.has_permission(self.request.user, map):
            return HTTPUnauthorized()

        # remove the features associated to the map
        features = DBSession.query(Feature).filter(
            Feature.map_id == map.uuid).all()
        for f in features:
            DBSession.delete(f)
        DBSession.commit()

        return {'success': True}

    def save(self, map, id=None):
        params = self.request.params
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
            try:
                map.zoom = int(params.get('zoom'))
            except ValueError:
                return HTTPBadRequest()
        if 'title' in params:
            map.title = unicode(params.get('title'))
        if 'description' in params:
            map.description = unicode(params.get('description'))
        if 'theme' in params:
            map.theme = unicode(params.get('theme'))
        if 'bgLayer' in params:
            map.bg_layer = unicode(params.get('bgLayer'))
        if 'bgOpacity' in params:
            map.bg_opacity = params.get('bgOpacity')\
                if params.get('bgOpacity') != '' else 100
        if 'layers' in params:
            map.layers = unicode(params.get('layers'))
        if 'layers_indices' in params:
            map.layers_indices = unicode(params.get('layers_indices'))
        if 'layers_opacity' in params:
            map.layers_opacity = unicode(params.get('layers_opacity'))
        if 'layers_visibility' in params:
            map.layers_visibility = unicode(params.get('layers_visibility'))
        if 'selectedNode' in params:
            map.selected_node =\
                unicode(params.get('selectedNode'))
        if 'category_id' in params:
            cat = params.get('category_id')
            map.category_id = None if cat == '' else cat
        trigger_fme = False
        if 'public' in params:
            str = unicode(params.get('public'))
            if str == u'true':
                if not map.public:
                    trigger_fme = True
                map.public = True
            elif str == u'false':
                map.public = False
        if 'label' in params:
            map.label = unicode(params.get('label'))

        try:
            DBSession.add(map)
            DBSession.commit()
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
        map = Map.get(id)
        if map is None:
            return HTTPNotFound()
        params = dict(map)
        params["is_editable"] = self.has_permission(self.request.user, map)

        if 'cb' in self.request.params:
            headers = {'Content-Type': 'text/javascript; charset=utf-8'}
            return Response("%s(%s);"
                            % (self.request.params['cb'],
                               json_dumps(params)), headers=headers)
        else:
            headers = {'Content-Type': 'application/json'}
            return Response(json_dumps(params), headers=headers)

    @view_config(route_name="mymaps_get_image")
    def image(self):
        filename = self.request.matchdict.get("filename")
        if DBSession.query(Images).\
                filter(Images.name == filename).count() > 0:
            cur_file = DBSession.query(Images).\
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
            return {'success': True, 'msg': 'Bad image'}

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
            image.save(os.path.join(path, image_name))
            thumbnail.save(os.path.join(path, thumbnail_name))
        except:
            return {'success': False, 'msg': 'Bad image'}
        finally:
            file.file.close()
        f_image = open(os.path.join(path, image_name))
        f_thumbnail = open(os.path.join(path, thumbnail_name))

        try:
            user = self.request.user.username

            cur_file = Images()
            cur_file.name = image_name
            cur_file.image = f_image.read()
            cur_file.login_owner = user
            DBSession.add(cur_file)
            DBSession.commit()

            cur_file = Images()
            cur_file.name = thumbnail_name
            cur_file.image = f_thumbnail.read()
            cur_file.login_owner = user
            DBSession.add(cur_file)
            DBSession.commit()

        except:
            return {'success': False, 'msg': 'Bad image'}
        finally:
            f_image.close()
            f_thumbnail.close()

        os.remove(os.path.join(path, image_name))
        os.remove(os.path.join(path, thumbnail_name))

        return {'success': True,
                'image': '/mymaps/images/' + image_name,
                'thumbnail': '/mymaps/images/' + thumbnail_name}

    def generate_symbol_file(self):

        user = self.request.user
        if user is None:
            return HTTPUnauthorized()

        dir = "/tmp/mapfile"
        if not os.path.exists(dir):
            os.mkdir(dir)
        symbolsmap = ""
        for symbol in DBSession.query(Symbols).all():
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
        os.system('sh ./scripts/sync_ms.sh %s' % (dir + "/" + "/symbols.map"))

        for symbol in DBSession.query(Symbols).\
                filter(Symbols.synchronized == False).all():  # noqa

            _, ext = os.path.splitext(symbol.symbol_name)

            the_name = str(symbol.id)+ext
            the_file = open(dir+"/"+the_name, 'w+')

            the_file.write(symbol.symbol)
            the_file.close()
            symbol.synchronized = True
            DBSession.commit()
            os.system('sh ./scripts/sync_ms.sh %s remove'
                      % (dir + "/" + the_name))

    @view_config(route_name="mymaps_get_symbol")
    def get_symbol(self):
        id = self.request.matchdict.get("symbol_id")
        try:
            symbol = DBSession.query(Symbols).\
                filter(Symbols.id == id).one()

            headers = {'Content-Type': 'application/octet-stream',
                       'Content-Disposition': 'filename=\"%s\";'
                       % (str(symbol.symbol_name))
                       }

            if symbol.symbol_name.lower().endswith(".jpg"):
                headers = {'Content-Type': 'image/jpeg'}
            if symbol.symbol_name.lower().endswith(".jpeg"):
                headers = {'Content-Type': 'image/jpeg'}
            if symbol.symbol_name.lower().endswith(".gif"):
                headers = {'Content-Type': 'image/gif'}
            if symbol.symbol_name.lower().endswith(".png"):
                headers = {'Content-Type': 'image/png'}
            return Response(symbol.symbol, headers=headers)

        except:
            from PIL import Image, ImageDraw
            from cStringIO import StringIO

            img = Image.new('RGBA', (40, 40))
            ImageDraw.Draw(img)

            buf = StringIO()
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
                for symbol in DBSession.query(Symbols).\
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
                for symbol in DBSession.query(Symbols).\
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
        scaled_width = 40
        scaled_height = 40

        cur_file = Symbols()

        width, height = im1.size
        if width > scaled_width:
            ratio = width/scaled_width
            scaled_height = height / ratio
            im2 = im1.resize((scaled_width, scaled_height), Image.NEAREST)
            im2.save(file_path)
            f = open(file_path)
        else:
            f = open(temp_file_path)

        cur_file.symbol_name = file.filename
        cur_file.symbol = f.read()
        cur_file.login_owner = username
        cur_file.is_public = False

        DBSession.add(cur_file)
        DBSession.commit()
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        if os.path.exists(file_path):
            os.remove(file_path)

        try:
            self.generate_symbol_file()
        except Exception as e:
            log.exception(e)
            DBSession.rollback()

        return {'success': 'true',
                'description': 'file added',
                'result': {
                    'url': "/symbol/" + str(cur_file.id),
                    'id': cur_file.id,
                    'symboltype': 'us',
                    'name': cur_file.symbol_name}}

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
                author='support.geoportail@act.etat.lu',
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
        message.send()
        return {'success': True}

    def strip_accents(self, string):
        import unicodedata
        return unicodedata.normalize('NFKD', unicode(string)).\
            encode('ASCII', 'ignore').replace(' ', '_')

    def get_user_info(self, user):
        connector = get_ldap_connector(self.request)
        cm = connector.manager
        with cm.connection() as conn:
            dn_list = conn.search_s('ou=portail,dc=act,dc=lu',
                                    ldap.SCOPE_SUBTREE, '(login=%s)' % user)
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

            return (user, mail_address)

    def notify_at_save(self, map, username, id, name, category):

        if self.config["modify_notification"]["url"] is not None and\
           "admin_email" in self.config["modify_notification"]:
            url = self.config["modify_notification"]["url"]
            admin_email = self.config["modify_notification"]["admin_email"]
            email_cc = ""
            if "email_cc" in self.config["modify_notification"]:
                email_cc = self.config["modify_notification"]["email_cc"]
            if map.category_id is not None and map.category.id == 300 and\
               map.public:
                email_content = u"""Bonjour,<br>l\'utilisateur %s a
                modifié une carte publique de la catégorie %s:<br>
                <a href='http://map.geoportail.lu?map_id=%s'>%s</a><br>
                Cordialement,<br>Le géoportail"""\
                    % (username, category, id, name)
                data = {'email_to': admin_email,
                        'subscriber_content': email_content,
                        'email_cc': email_cc}
                req = urllib2.Request(url)
                req.add_header('Content-Type', 'application/json')
                urllib2.urlopen(req, json.dumps(data))
