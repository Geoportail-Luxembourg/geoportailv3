# -*- coding: utf-8 -*-
import sqlahelper

from sqlalchemy import Column, Unicode
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from geoalchemy2 import Geometry

engine = sqlahelper.get_engine('ecadastre')
Base = declarative_base(bind=engine)
Session = sessionmaker(bind=engine)
DBSession = Session()


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
    geom = Column(Geometry(srid=2169))
