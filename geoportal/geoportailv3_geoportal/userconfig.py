from sqlalchemy import Column, ForeignKey
from sqlalchemy.types import Unicode, Boolean, DateTime, Integer, Float, Binary
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from c2cgeoportal_commons.models.main import _schema
from c2cgeoportal_commons.models import Base


class UserConfig(Base):
    __tablename__ = 'lux_userconfig'
    __table_args__ = {'schema': _schema}
    id = Column('id', Integer, primary_key=True)
    key = Column(Unicode, nullable=False)
    style = Column(Unicode, nullable=False)
    user_login = Column(Unicode, nullable=False)
