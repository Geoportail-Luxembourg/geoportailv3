# -*- coding: utf-8 -*-
import datetime
import sqlahelper

from c2cgeoportal.models import *  # noqa
from formalchemy import Column
from sqlalchemy.types import Integer, String, DateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

engine = sqlahelper.get_engine()
Base = declarative_base(bind=engine)
Session = sessionmaker(bind=engine)
PortailSession = Session()


class Connections(Base):
    __table_args__ = ({'schema': 'geov3_stats', 'autoload': False})
    __tablename__ = 'connections'
    id = Column(Integer, primary_key=True)
    ip = Column(String)
    action = Column(String)
    login = Column(String)
    application = Column(String)


class MesurageDownload(Base):
    __table_args__ = ({'schema': 'geov3_stats'})
    __tablename__ = 'measurement_download'
    id = Column(Integer, primary_key=True)
    login = Column(String)
    filename = Column(String)
    download_date = Column(DateTime, default=datetime.datetime.now)
    commune = Column(String)
    parcelle = Column(String)
    application = Column(String)


class SketchDownload(Base):
    __table_args__ = ({'schema': 'geov3_stats'})
    __tablename__ = 'sketch_download'
    id = Column(Integer, primary_key=True)
    login = Column(String)
    filename = Column(String)
    download_date = Column(DateTime, default=datetime.datetime.now)
    application = Column(String)
    directory = Column(String)


class UtiMesurageCommune(Base):
    __table_args__ = ({'schema': 'geov3_stats'})
    __tablename__ = 'lux_uti_mesurage_commune'
    login = Column(String, primary_key=True)
    num_commune = Column(String, primary_key=True)
