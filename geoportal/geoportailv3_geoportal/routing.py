# -*- coding: utf-8 -*-

from sqlalchemy import Column, Integer
from sqlalchemy.ext.declarative import declarative_base
from geoalchemy2 import Geometry

Base = declarative_base()


class ReseauVertices(Base):
    __table_args__ = ({'schema': 'public', 'autoload': False})
    __tablename__ = 'reseau_vertices_pgr'

    id = Column('id', Integer, primary_key=True)
    geom = Column(Geometry(srid=3857))
