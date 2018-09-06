# -*- coding: utf-8 -*-

import logging

from pyramid.i18n import TranslationStringFactory

import colander
from c2cgeoportal_commons.models import Base
from c2cgeoportal_commons.models.main import _schema, LayerWMS
from sqlalchemy import ForeignKey, Column
from sqlalchemy.types import Integer, Boolean, Unicode, String, DateTime

_ = TranslationStringFactory('geoportailv3-server')
LOG = logging.getLogger(__name__)


class LuxDownloadUrl(Base):
    __tablename__ = 'lux_download_url'
    __table_args__ = {'schema': _schema}
    __colanderalchemy_config__ = {
        'title': _('Base url for download')
    }
    id = Column(Integer, primary_key=True)
    url = Column(Unicode, info={
       'colanderalchemy': {'title': _('Url')}
    })
    protected = Column(Boolean, info={
        'colanderalchemy': {'title': _('Only connected user can download')}
    })


class LuxMeasurementLoginCommune(Base):
    __tablename__ = 'lux_measurement_login_commune'
    __table_args__ = {'schema': _schema}

    login = Column(String, primary_key=True)
    num_commune = Column(String, primary_key=True)


class LuxMeasurementDirectory(Base):
    __tablename__ = 'lux_measurement_directory'
    __table_args__ = {'schema': _schema}
    __colanderalchemy_config__ = {
        'title': _('Surveying file config')
    }
    id = Column(Integer, primary_key=True)
    name = Column(String)
    path = Column(String)
    town_code = Column(Integer)


class LuxLayerInternalWMS(LayerWMS):
    __tablename__ = 'lux_layer_internal_wms'
    __table_args__ = {'schema': _schema}
    __mapper_args__ = {'polymorphic_identity': 'lu_int_wms'}
    __colanderalchemy_config__ = {
        'title': _('Internal WMS layer'),
        'plural': _('Internal WMS layers')
    }

    id = Column(
        Integer,
        ForeignKey(_schema + '.layer_wms.id'),
        primary_key=True
    )
    url = Column(Unicode, info={
        'colanderalchemy': {'title': _('Url')}
    })
    layers = Column(Unicode, info={
        'colanderalchemy': {'title': _('Layers')}
    })
    is_poi = Column(Boolean, info={
        'colanderalchemy': {'title': _('Is a POI')}
    })
    collection_id = Column(Integer, info={
        'colanderalchemy': {'title': _('Collection ID')}
    })
    rest_url = Column(Unicode, info={
        'colanderalchemy': {'title': _('REST url')}
    })


class LuxLayerExternalWMS(LayerWMS):
    __tablename__ = 'lux_layer_external_wms'
    __table_args__ = {'schema': _schema}
    __mapper_args__ = {'polymorphic_identity': 'lu_ext_wms'}
    __colanderalchemy_config__ = {
        'title': _('External WMS layer'),
        'plural': _('External WMS layers')
    }

    id = Column(
        Integer,
        ForeignKey(_schema + ".layer_wms.id"),
        primary_key=True
    )
    category_id = Column(Integer, info={
        'colanderalchemy': {'title': _('Category ID')}
    })


class LuxGetfeatureDefinition(Base):
    __tablename__ = 'lux_getfeature_definition'
    __table_args__ = {'schema': _schema}
    id = Column(
        Integer,
        primary_key=True
    )
    query = Column(Unicode, info={
        'colanderalchemy': {'title': _('Table name')}
    })
    rest_url = Column(Unicode, info={
        'colanderalchemy': {'title': _('URL Rest')}
    })
    engine_gfi = Column('engine', Unicode, info={
        'colanderalchemy': {'title': _('Engine')}
    })
    layer = Column(Unicode, info={
        'colanderalchemy': {'title': _('Layer')}
    })
    template = Column(Unicode, info={
        'colanderalchemy': {'title': _('Template file name')}
    })
    remote_template = Column(Boolean, info={
        'colanderalchemy': {'title': _('Is the template local or remote')}
    })
    additional_info_function = Column(Unicode, info={
        'colanderalchemy': {'title': _('Python function')}
    })
    role = Column(Integer, info={
        'colanderalchemy': {'title': _('Role')}
    })
    attributes_to_remove = Column(Unicode, info={
        'colanderalchemy': {'title': _('Attributes to remove')}
    })
    poi_id_collection = Column(Integer, info={
        'colanderalchemy': {'title': _('Id of the poi collection')}
    })
    geometry_column = Column(Unicode, info={
        'colanderalchemy': {'title': _('Geometry column name')}
    })
    columns_order = Column(Unicode, info={
        'colanderalchemy': {'title': _('Order of columns')}
    })
    id_column = Column(Unicode, info={
        'colanderalchemy': {'title': _('ID column name')}
    })
    has_profile = Column(Boolean, info={
        'colanderalchemy': {'title': _('Is a profile displayed in template ?')}
    })


class LuxPrintJob(Base):
    __tablename__ = 'lux_print_job'
    __table_args__ = {'schema': _schema}
    id = Column(String, primary_key=True)
    spec = Column(Unicode)
    creation = Column(DateTime)
    print_url = Column(Unicode)
    is_error = Column(Boolean, default=False)


class LuxPrintServers(Base):
    __tablename__ = 'lux_print_servers'
    __table_args__ = {'schema': _schema}
    id = Column(String, primary_key=True)
    url = Column(Unicode)
    creation = Column(DateTime)


class LuxPredefinedWms(Base):
    __tablename__ = 'lux_predefined_wms'
    __table_args__ = {'schema': _schema}
    id = Column(String, primary_key=True)
    url = Column(Unicode, unique=True, info={
        'colanderalchemy': {'title': _('Url')}
    })
    label = Column(Unicode)
