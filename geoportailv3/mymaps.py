# -*- coding: utf-8 -*-
import uuid
import datetime
import sqlahelper

from sqlalchemy import Column, ForeignKey, Table, func
from sqlalchemy.types import Unicode, Boolean, DateTime, Integer, Float, Binary
from sqlalchemy.orm import scoped_session, relationship, sessionmaker
from sqlalchemy.ext.declarative import declarative_base


from shapely import wkb
from shapely.geometry import asShape

from shapely.geometry.multipoint import asMultiPoint
from shapely.geometry.multilinestring import asMultiLineString
from shapely.geometry.multipolygon import MultiPolygonAdapter
from geoalchemy2 import Geometry
from geoalchemy2.shape import from_shape

import geojson

engine = sqlahelper.get_engine('mymaps')
Base = declarative_base(bind=engine)
DBSession = scoped_session(sessionmaker(bind=engine))


class Map(Base):
    __tablename__ = 'map'
    uuid = Column(Unicode, primary_key=True,
                  default=lambda: unicode(uuid.uuid4().hex))
    user_login = Column(Unicode(50))
    title = Column(Unicode(50))
    description = Column(Unicode)
    public = Column(Boolean)
    create_date = Column(DateTime, default=datetime.datetime.now)
    update_date = Column(DateTime, onupdate=datetime.datetime.now)
    zoom = Column(Integer)
    x = Column(Float)
    y = Column(Float)
    theme = Column(Unicode)
    bg_layer = Column(Unicode)
    bg_opacity = Column(Float, default=100)
    layers = Column(Unicode)
    layers_indices = Column(Unicode)
    layers_opacity = Column(Unicode)
    layers_visibility = Column(Unicode)
    selected_node = Column(Unicode)
    rating = Column(Float, default=0)
    rating_count = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey('category.id'), default=999)
    label = Column(Unicode)
    category = relationship('Category', backref='maps')
    features = relationship('Feature', backref='map')

    def get_title(self):
        if self.title is not None:
            return self.title.replace("'", "_")
        return None

    def todict(self):
        def convert_datetime(value):
            if value is not None:
                return value.strftime("%Y-%m-%d %H:%M:%S")
            else:
                return None

        for c in self.__table__.columns:
            if isinstance(c.type, DateTime):
                value = convert_datetime(getattr(self, c.name))
            else:
                value = getattr(self, c.name)
            yield(c.name, value)

    def __iter__(self):
        """Returns an iterable that supports .next()
            so we can do dict(sa_instance)
        """
        return self.todict()

    @staticmethod
    def get(id):
        """ Get map by its id. """
        return DBSession.query(Map).get(id)

    @staticmethod
    def belonging_to(user):
        """ Get maps that belong to user. """
        maps = DBSession.query(Map).filter(
            func.lower(Map.user_login) == func.lower(user)) \
            .order_by("category_id asc,title asc").all()

        return [{'title': map.title,
                 'uuid': map.uuid,
                 'public': map.public,
                 'create_date': map.create_date,
                 'update_date': map.update_date,
                 'category': map.category.name
                 if map.category_id is not None else None,
                 'owner': map.user_login.lower()} for map in maps]


class Feature(Base):
    __tablename__ = 'feature'
    __template__ = 'tooltips/category.mako'

    id = Column(Integer, primary_key=True)
    name = Column(Unicode(50))
    description = Column(Unicode)
    image = Column(Unicode(255))
    thumbnail = Column(Unicode(255))
    color = Column(Unicode(255))
    stroke = Column(Integer, default=2)
    is_label = Column(Boolean, default=False)
    is_circle = Column(Boolean, default=False)
    linestyle = Column(Integer, default=0)
    show_orientation = Column(Boolean, default=False)
    geometry = Column(Geometry(srid=2169))
    map_id = Column(Unicode, ForeignKey('map.uuid'))
    symbol_id = Column(Integer)
    size = Column(Float, default=10)
    angle = Column(Float, default=0)
    font_size = Column(Integer, default=15)
    opacity = Column(Float, default=0.5)
    shape = Column(Unicode(255))
    last_modified_by = Column(Unicode(50))

    def __init__(self, feature=None):
        if feature:
            self.__update__(feature)

    def __update__(self, feature):
        self.name = feature.properties.get('name')
        self.description = feature.properties.get('description')
        self.thumbnail = feature.properties.get('thumbnail')
        self.image = feature.properties.get('image')
        self.color = feature.properties.get('color')
        self.stroke = feature.properties.get('stroke')
        self.is_label = feature.properties.get('isLabel')
        self.is_circle = feature.properties.get('isCircle')
        self.show_orientation = feature.properties.get('showOrientation')
        linestyle = feature.properties.get('linestyle')
        self.linestyle = 0 if linestyle == 'plain' else 1\
            if linestyle == 'dashed' else 2\
            if linestyle == 'dotted' else 0
        self.shape = feature.properties.get('shape')
        size = feature.properties.get('size')
        self.size = size if size is not None and unicode(size).isnumeric()\
            else 10
        angle = feature.properties.get('angle')
        try:
            self.angle = float(angle)
        except TypeError:
            self.angle = 0
        font_size = feature.properties.get('fontSize')
        self.font_size = font_size if font_size is not None and\
            unicode(font_size).isnumeric() else 15
        symbol_id = feature.properties.get('symbolId')
        self.symbol_id = None if symbol_id is not None and\
            len(unicode(symbol_id)) == 0\
            else symbol_id

        opacity = feature.properties.get('opacity')
        self.opacity = opacity if opacity is not None and\
            unicode(opacity).isnumeric() else 0.5

        if hasattr(feature.geometry, "__geo_interface__"):
            ob = feature.geometry.__geo_interface__
        else:
            ob = feature.geometry
        geom_type = ob.get("type").lower()

        if geom_type != 'geometrycollection':
            # openlayers gpx writter creates a 4 dimension geometry and
            # shapely does not allow if for linestring.
            if geom_type == 'linestring':
                feature.geometry.coordinates = \
                    [coordinate[0:2] for coordinate
                        in feature.geometry.coordinates]
            elif geom_type == 'multilinestring':
                multilinestring = feature.geometry.coordinates
                feature.geometry.coordinates = \
                    [[coord[0:2] for coord in multilinestring[i]]
                        for i in range(len(multilinestring))]

            shape = asShape(feature.geometry)

        else:
            geoms = []
            is_transformable = True
            types = None
            for geom in feature.geometry.geometries:
                if hasattr(geom, "__geo_interface__"):
                    ob = geom.__geo_interface__
                else:
                    ob = geom
                geom_type = ob.get("type").lower()

                if types is None:
                    types = geom_type
                else:
                    is_transformable = types == geom_type
                    if not is_transformable:
                        break

                geoms.append(asShape(geom))
            if is_transformable:
                if types == "point":
                    shape = asMultiPoint(geoms)
                elif types == "linestring":
                    shape = asMultiLineString(geoms)
                elif types == "polygon":
                    shape = MultiPolygonAdapter(geoms, context_type='geojson')
            else:
                shape = None
        # ST_FORCE2D is used because the db only allows geometry with
        # 2 dimensions.
        self.geometry = func.ST_Force2D(from_shape(shape, srid=2169))\
            if shape is not None else None

    @property
    def __geo_interface__(self):
        geometry = wkb.loads(str(self.geometry), True)
        properties = dict(name=self.name,
                          description=self.description,
                          thumbnail=self.thumbnail,
                          image=self.image,
                          color=self.color,
                          stroke=self.stroke,
                          isLabel=self.is_label,
                          isCircle=self.is_circle,
                          showOrientation=self.show_orientation,
                          linestyle='plain' if self.linestyle == 0
                          else 'dashed' if self.linestyle == 1 else 'dotted',
                          fid=self.id,
                          symbolId=self.symbol_id,
                          angle=self.angle if self.angle is not None else 0,
                          size=self.size if self.size is not None else 10,
                          fontSize=self.font_size
                          if self.font_size is not None else 15,
                          opacity=self.opacity
                          if self.opacity is not None else 0.5,
                          shape=self.shape
                          )
        return geojson.Feature(id=self.id,
                               geometry=geometry,
                               properties=properties
                               )

    @property
    def geom(self):
        if hasattr(self.geometry, "geom_wkb"):
            return wkb.loads(str(self.geometry.geom_wkb))
        else:
            if hasattr(self, "_shape"):
                return self._shape
            else:
                return None


role_categories = Table('role_categories',
                        Base.metadata,
                        Column('role_id',
                               Integer,
                               ForeignKey('role.id')),
                        Column('category_id',
                               Integer,
                               ForeignKey('category.id')))


class Category(Base):
    __tablename__ = 'category'

    id = Column(Integer, primary_key=True)
    name = Column(Unicode(255))
    allow_labeling = Column(Boolean)

    def __init__(self, name):
        self.name = name

    def todict(self):
        return {'id': self.id,
                'name': self.name,
                'allow_labeling': self.allow_labeling}

    @staticmethod
    def belonging_to(user):
        user_role = DBSession.query(Role).get(user.mymaps_role)
        categories = user_role.categories\
            if user_role.categories is not None else []
        return [category.todict() for category in categories]

    @staticmethod
    def all():
        categories = DBSession.query(Category).all()
        return [category.todict() for category in categories]


class Role(Base):
    __tablename__ = 'role'

    id = Column(Integer, primary_key=True)
    name = Column(Unicode(255))
    categories = relationship(Category, secondary=role_categories)

    def __init__(self, name):
        self.name = name


class Symbols(Base):
    __tablename__ = 'symbols'

    id = Column(Integer, primary_key=True)
    symbol_name = Column(Unicode(255))
    login_owner = Column(Unicode(255))
    symbol = Column(Binary)
    is_public = Column(Boolean)
    synchronized = Column(Boolean, default=False)


class Images(Base):
    __tablename__ = 'images'

    id = Column(Integer, primary_key=True)
    image = Column(Binary)
    name = Column(Unicode(255))
    login_owner = Column(Unicode(255))


class Item(Base):
    __tablename__ = 'item'
    __table_args__ = ({'schema': 'themes_prod', 'autoload': False})

    id = Column(Unicode(255), primary_key=True)
    isgroup = Column(Boolean)
    label = Column(Unicode(255))
    open_expanded = Column(Boolean)
    icon_type = Column(Unicode(10))
    image_format = Column(Unicode(20))
    metadataid = Column(Unicode(50))
    legendname = Column(Unicode(255))
    queryable = Column(Boolean)
    exclusion = Column(Unicode(1000))
    opacity = Column(Float)
    service_url = Column(Unicode(255))
    category_id = Column(Integer)
    server_resolutions = Column(Unicode(255))
    use_client_zoom = Column(Boolean)
    is_wms = Column(Boolean)
    wms_url = Column(Unicode(1000))
    wms_layers = Column(Unicode(2500))
    wms_format = Column(Unicode(20))
    wms_profiles_guichet = Column(Unicode(255))
    is_poi = Column(Boolean)
    id_collection = Column(Integer)
