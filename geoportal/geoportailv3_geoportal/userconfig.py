from sqlalchemy import Column, ForeignKey
from sqlalchemy.types import Unicode, Boolean, DateTime, Integer, Float, Binary
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class UserConfig(Base):
    __tablename__ = 'userconfig'
    id = Column('id', Integer, primary_key=True)
    key = Column(Unicode, nullable=False)
    style = Column(Unicode, nullable=False)
    user_login = Column(Unicode, nullable=False)
