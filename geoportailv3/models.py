# -*- coding: utf-8 -*-

import logging
import sqlahelper

from pyramid.i18n import TranslationStringFactory

from c2cgeoportal.models import *  # noqa
from pyramid.security import Allow, ALL_PERMISSIONS
from formalchemy import Column
from sqlalchemy import ForeignKey
from sqlalchemy.types import Integer, Boolean, Unicode
from c2cgeoportal.models import AUTHORIZED_ROLE, _schema

_ = TranslationStringFactory("geoportailv3-server")
log = logging.getLogger(__name__)
Base = sqlahelper.get_base()


class LuxLayerInternalWMS(LayerInternalWMS):
    __label__ = _(u"Internal WMS layer")
    __plural__ = _(u"Internal WMS layers")
    __tablename__ = "lux_layer_internal_wms"
    __table_args__ = {"schema": _schema}
    __acl__ = [
        (Allow, AUTHORIZED_ROLE, ALL_PERMISSIONS),
    ]
    __mapper_args__ = {"polymorphic_identity": "lu_int_wms"}

    id = Column(
        Integer,
        ForeignKey(_schema + ".layer_internal_wms.id"),
        primary_key=True
    )
    url = Column(Unicode, label=_(u"Url"))
    layers = Column(Unicode, label=_(u"Layers"))
    is_poi = Column(Boolean, label=_(u"Is a POI"))
    collection_id = Column(Integer, label=_(u"Collection ID"))
    rest_url = Column(Unicode, label=_(u"REST url"))


class LuxLayerExternalWMS(LayerExternalWMS):
    __label__ = _(u"External WMS layer")
    __plural__ = _(u"External WMS layers")
    __tablename__ = "lux_layer_external_wms"
    __table_args__ = {"schema": _schema}
    __acl__ = [
        (Allow, AUTHORIZED_ROLE, ALL_PERMISSIONS),
    ]
    __mapper_args__ = {"polymorphic_identity": "lu_ext_wms"}

    id = Column(
        Integer,
        ForeignKey(_schema + ".layer_external_wms.id"),
        primary_key=True
    )
    category_id = Column(Integer, label=_(u'Category ID'))


class LuxGetfeatureDefinition(Base):
    __tablename__ = 'lux_getfeature_definition'
    __table_args__ = {'schema': _schema}

    id = Column(
        Integer,
        primary_key=True
    )
    query = Column(Unicode, label=_(u'Table name'))
    rest_url = Column(Unicode, label=_(u'URL Rest'))
    engine = Column(Unicode, label=_(u'Engine'))
    layer = Column(Unicode, label=_(u'Layer'))
    template = Column(Unicode, label=_(u'Template file name'))
    remote_template = Column(Boolean,
                             label=_(u"Is the template local or remote"))
    additional_info_function = Column(Unicode, label=_(u'Python function'))
    role = Column(Integer, label=_(u'Role'))
    attributes_to_remove = Column(Unicode, label=_(u'Attributes to keep'))
    poi_id_collection = Column(Unicode, label=_(u'Id of the poi collection'))
    geometry_column = Column(Unicode, label=_(u'Geometry column name'))
