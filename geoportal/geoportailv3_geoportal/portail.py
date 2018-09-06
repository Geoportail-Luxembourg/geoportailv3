# -*- coding: utf-8 -*-
import datetime

from c2cgeoportal_commons.models import Base
from sqlalchemy import Column
from sqlalchemy.types import Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base

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


class PagDownload(Base):
    __table_args__ = ({'schema': 'geov3_stats', 'autoload': False})
    __tablename__ = 'pag_download'
    objectids = Column(String, primary_key=True)
    download_date = Column(DateTime, default=datetime.datetime.now,
                           primary_key=True)
    download_link = Column(String, primary_key=True)


class RoutingStats(Base):
    __table_args__ = ({'schema': 'geov3_stats', 'autoload': False})
    __tablename__ = 'routing'
    id = Column(Integer, primary_key=True)
    date = Column(DateTime, default=datetime.datetime.now)
    transport_mode = Column(Integer)
    transport_criteria = Column(Integer)
