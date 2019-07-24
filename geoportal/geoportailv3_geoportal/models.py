# -*- coding: utf-8 -*-

import logging

from pyramid.i18n import TranslationStringFactory

import colander
from c2cgeoportal_commons.models import Base
from c2cgeoportal_commons.models.main import _schema, LayerWMS
from sqlalchemy import ForeignKey, Column
from sqlalchemy.types import Integer, Boolean, Unicode, String, DateTime
from deform.widget import HiddenWidget, TextInputWidget

_ = TranslationStringFactory('geoportailv3_geoportal-server')
LOG = logging.getLogger(__name__)


class LuxDownloadUrl(Base):
    __tablename__ = 'lux_download_url'
    __table_args__ = {'schema': _schema}
    __colanderalchemy_config__ = {
        'title': _('Url for download'),
        'plural': _('Urls for download')
    }
    id = Column(Integer, primary_key=True, info={
        'colanderalchemy': {'widget': HiddenWidget()}
    })
    url = Column(Unicode, nullable=False, info={
        'colanderalchemy': {'title': _('Url')}
    })
    protected = Column(Boolean, nullable=False, info={
        'colanderalchemy': {'title': _('Only connected user can download ?')}
    })


class LuxMeasurementLoginCommune(Base):
    __tablename__ = 'lux_measurement_login_commune'
    __table_args__ = {'schema': _schema}
    __colanderalchemy_config__ = {
        'title': _('Surveying login'),
        'plural': _('Surveying logins')
    }
    login = Column(Unicode, primary_key=True, info={
        'colanderalchemy': {'title': _('Login')}
    })
    num_commune = Column(Unicode, primary_key=True, info={
        'colanderalchemy': {'title': _('Commune number')}
    })


class LuxMeasurementDirectory(Base):
    __tablename__ = 'lux_measurement_directory'
    __table_args__ = {'schema': _schema}
    __colanderalchemy_config__ = {
        'title': _('Surveying file config'),
        'plural': _('Surveying file configs')
    }
    id = Column(Integer, primary_key=True, info={
        'colanderalchemy': {'widget': HiddenWidget()}
    })
    name = Column(Unicode, nullable=False, info={
        'colanderalchemy': {'title': _('Name')}
    })
    town_code = Column(Integer, nullable=False, info={
        'colanderalchemy': {'title': _('Town code')}
    })
    path = Column(String, nullable=False, info={
        'colanderalchemy': {'title': _('Path')}
    })
    path_dwg = Column(String, info={
        'colanderalchemy': {'title': _('Path (dwg)')}
    })
    path_star = Column(String, info={
        'colanderalchemy': {'title': _('Path (star)')}
    })


class LuxLayerInternalWMS(LayerWMS):
    __tablename__ = 'lux_layer_internal_wms'
    __table_args__ = {'schema': _schema}
    __mapper_args__ = {'polymorphic_identity': 'lu_int_wms'}
    __colanderalchemy_config__ = {
        'title': _('Internal WMS layer'),
        'plural': _('Internal WMS layers')
    }

    id = Column(Integer, ForeignKey(_schema + ".layer_wms.id",
          ondelete='CASCADE'), primary_key=True, info={
            'colanderalchemy': {
              'missing': None,
              'widget': HiddenWidget()
         }})
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


    def __init__(
        self, name='', layer='', public=True,
        time_mode='disabled',
        time_widget='slider',
        url='',
        layers='',
        is_poi=False,
        collection_id=0,
        rest_url=''
    ):
        LayerWMS.__init__(self, name=name, layer=layer, public=public,
        time_mode=time_mode, time_widget=time_widget)
        self.url = url
        self.layers = layers
        self.is_poi = is_poi
        self.collection_id = collection_id
        self.rest_url = rest_url

    def get_default(dbsession):
        return dbsession.query(LuxLayerInternalWMS).filter(
                LuxLayerInternalWMS.name == 'lux_layer_internal_wms-defaults'
                ).one_or_none()


class LuxLayerExternalWMS(LayerWMS):
    __tablename__ = 'lux_layer_external_wms'
    __table_args__ = {'schema': _schema}
    __mapper_args__ = {'polymorphic_identity': 'lu_ext_wms'}
    __colanderalchemy_config__ = {
        'title': _('External WMS layer'),
        'plural': _('External WMS layers')
    }
    id = Column(Integer, ForeignKey(_schema + ".layer_wms.id",
          ondelete='CASCADE'), primary_key=True, info={
            'colanderalchemy': {
              'missing': None,
              'widget': HiddenWidget()
         }})
    category_id = Column(Integer, info={
        'colanderalchemy': {'title': _('Category ID')}
    })

    def __init__(
        self, name='', layer='', public=True,
        time_mode='disabled',
        time_widget='slider',
        category_id=0
    ):
        LayerWMS.__init__(self, name=name, layer=layer, public=public,
        time_mode=time_mode, time_widget=time_widget)
        self.category_id = category_id

    def get_default(dbsession):
        return dbsession.query(LuxLayerExternalWMS).filter(
                LuxLayerExternalWMS.name == 'lux_layer_external_wms-defaults'
                ).one_or_none()


class LuxGetfeatureDefinition(Base):
    __tablename__ = 'lux_getfeature_definition'
    __table_args__ = {'schema': _schema}
    __colanderalchemy_config__ = {
        'title': _('Getfeature definition'),
        'plural': _('Getfeature definitions')
    }
    __c2cgeoform_config__ = {
        'duplicate': True
    }
    id = Column(Integer, primary_key=True, info={
        'colanderalchemy': {'widget': HiddenWidget()}
    })
    query = Column(Unicode, info={
        'colanderalchemy': {'title': _('Table name')}
    })
    rest_url = Column(String(255), info={
        'colanderalchemy': {'title': _('URL Rest')}
    })
    engine_gfi = Column('engine', Unicode, nullable=False, info={
        'colanderalchemy': {'title': _('Engine')}
    })
    layer = Column(Unicode, info={
        'colanderalchemy': {'title': _('Layer')}
    })
    template = Column(Unicode, nullable=False, default='default', info={
        'colanderalchemy': {'title': _('Template file name')}
    })
    remote_template = Column(Boolean, default=False, info={
        'colanderalchemy': {'title': _('Remote template (or local) ?')}
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
    geometry_column = Column(Unicode, default='geom', info={
        'colanderalchemy': {'title': _('Geometry column name')}
    })
    columns_order = Column(Unicode, info={
        'colanderalchemy': {'title': _('Order of columns')}
    })
    id_column = Column(Unicode, info={
        'colanderalchemy': {'title': _('ID column name')}
    })
    has_profile = Column(Boolean, info={
        'colanderalchemy': {'title': _('Is a profile displayed ?')}
    })
    query_limit = Column(Integer, info={
        'colanderalchemy': {'title': _('Limit the results. If < 0 then not limit.')}
    })


class LuxPrintJob(Base):
    __tablename__ = 'lux_print_job'
    __table_args__ = {'schema': _schema}
    __colanderalchemy_config__ = {
        'title': _('Print job'),
        'plural': _('Print jobs')
    }
    id = Column(String(100), primary_key=True, info={
        'colanderalchemy': {'widget': HiddenWidget()}
    })
    spec = Column(Unicode, info={
        'colanderalchemy': {'title': _('Spec.')}
    })
    creation = Column(DateTime(timezone=False), info={
        'colanderalchemy': {'title': _('Creation date')}
    })
    print_url = Column(Unicode, info={
        'colanderalchemy': {'title': _('Url')}
    })
    is_error = Column(Boolean, default=False, info={
        'colanderalchemy': {'title': _('Error')}
    })


class LuxPrintServers(Base):
    __tablename__ = 'lux_print_servers'
    __table_args__ = {'schema': _schema}
    __colanderalchemy_config__ = {
        'title': _('Print server'),
        'plural': _('Print servers')
    }
    id = Column(Integer, primary_key=True, info={
        'colanderalchemy': {'widget': HiddenWidget()}
    })
    url = Column(Unicode, nullable=False, info={
        'colanderalchemy': {'title': _('Url')}
    })
    creation = Column(DateTime(timezone=False), info={
        'colanderalchemy': {'title': _('Creation date')}
    })


class LuxPredefinedWms(Base):
    __tablename__ = 'lux_predefined_wms'
    __table_args__ = {'schema': _schema}
    __colanderalchemy_config__ = {
        'title': _('Predefined wms'),
        'plural': _('Predefined wms')
    }
    id = Column(Integer, primary_key=True, info={
        'colanderalchemy': {'widget': HiddenWidget()}
    })
    url = Column(Unicode,  nullable=False, info={
        'colanderalchemy': {'title': _('Url')}
    })
    label = Column(Unicode, nullable=False, info={
        'colanderalchemy': {
            'title': _('Label'),
             # Possible workaround to 'label' css problem (but for edit not for grid, so it's useless).
             # 'widget': TextInputWidget(css_class='label-class', item_css_class='item-label-class')
        }
    })
