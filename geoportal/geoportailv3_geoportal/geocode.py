# -*- coding: utf-8 -*-

from sqlalchemy import Column, Unicode, Integer
from geoalchemy2 import Geometry
from c2cgeoportal_commons.models import Base


class Parcel(Base):
    __table_args__ = ({'schema': 'diffdata', 'autoload': False})
    __tablename__ = 'pcnpar_s'

    id = Column(Unicode, primary_key=True)
    label = Column(Unicode)


class Address(Base):
    __table_args__ = ({'schema': 'diffdata', 'autoload': False})
    __tablename__ = 'v_pcn_addresspoints'

    id = Column('gid', Unicode, primary_key=True)
    rue = Column(Unicode)
    numero = Column(Unicode)
    localite = Column(Unicode)
    code_postal = Column(Unicode)
    id_caclr_rue = Column(Unicode)
    id_caclr_bat = Column(Unicode)
    cle_parcelle = Column(Unicode)
    geom = Column(Geometry(srid=2169))


class WKPOI(Base):
    __table_args__ = ({'schema': 'geocoding', 'autoload': False})
    __tablename__ = 'well_known_poi'
    id = Column(Integer, primary_key=True)
    name = Column(Unicode(255))
    zip = Column(Integer)
    locality = Column(Unicode(255))
    street = Column(Unicode(255))
    geom = Column(Geometry(srid=2169))

    def dump(self):
        return {
            'id': self.id,
            'name': self.name,
            'zip': self.zip,
            'locality': self.locality,
            'street': self.street,
            'geom': self.geom}


class Neighbourhood(Base):
    __table_args__ = ({'schema': 'geocoding', 'autoload': False})
    __tablename__ = 'neighbourhood'
    id = Column(Integer, primary_key=True)
    name = Column(Unicode(255))
    locality = Column(Unicode(255))
    geom = Column(Geometry(srid=2169))

    def dump(self):
        return {
            'id': self.id,
            'name': self.name,
            'locality': self.locality,
            'geom': self.geom}
