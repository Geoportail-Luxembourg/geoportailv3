# -*- coding: utf-8 -*-
import sqlahelper

from sqlalchemy import Column, Integer
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from geoalchemy2 import Geometry

engine = sqlahelper.get_engine('pgroute')
Base = declarative_base(bind=engine)
DBSession = scoped_session(sessionmaker(bind=engine, autocommit=True))


class ReseauVertices(Base):
    __table_args__ = ({'schema': 'public', 'autoload': False})
    __tablename__ = 'reseau_vertices_pgr'

    id = Column('id', Integer, primary_key=True)
    geom = Column(Geometry(srid=3857))
