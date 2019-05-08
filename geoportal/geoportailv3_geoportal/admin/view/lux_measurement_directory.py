from geoportailv3_geoportal.models import LuxMeasurementDirectory
from functools import partial
from pyramid.view import view_defaults
from pyramid.view import view_config

from c2cgeoform.schema import GeoFormSchemaNode
from c2cgeoform.views.abstract_views import AbstractViews
from c2cgeoform.views.abstract_views import ListField

_list_field = partial(ListField, LuxMeasurementDirectory)

base_schema = GeoFormSchemaNode(LuxMeasurementDirectory)


@view_defaults(match_param='table=lux_measurement_directory')
class LuxMeasurementDirectoryViews(AbstractViews):
    _list_fields = [
        _list_field('id'),
        _list_field('name'),
        _list_field('town_code'),
        _list_field('path'),
    ]
    _id_field = 'id'
    _model = LuxMeasurementDirectory
    _base_schema = base_schema

    @view_config(route_name='c2cgeoform_index',
                 renderer='./templates/index.jinja2')
    def index(self):
        return super().index()

    @view_config(route_name='c2cgeoform_grid',
                 renderer='fast_json')
    def grid(self):
        return super().grid()

    @view_config(route_name='c2cgeoform_item',
                 request_method='GET',
                 renderer='./templates/edit.jinja2')
    def view(self):
        return super().edit()

    @view_config(route_name='c2cgeoform_item',
                 request_method='POST',
                 renderer='./templates/edit.jinja2')
    def save(self):
        return super().save()

    @view_config(route_name='c2cgeoform_item',
                 request_method='DELETE',
                 renderer='fast_json')
    def delete(self):
        return super().delete()

    @view_config(route_name='c2cgeoform_item_duplicate',
                 request_method='GET',
                 renderer='./templates/edit.jinja2')
    def duplicate(self):
        return super().duplicate()
