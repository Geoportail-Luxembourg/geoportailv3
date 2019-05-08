from geoportailv3_geoportal.models import LuxGetfeatureDefinition
from functools import partial
from pyramid.view import view_defaults
from pyramid.view import view_config

from c2cgeoform.schema import GeoFormSchemaNode
from c2cgeoform.views.abstract_views import AbstractViews
from c2cgeoform.views.abstract_views import ListField

_list_field = partial(ListField, LuxGetfeatureDefinition)

base_schema = GeoFormSchemaNode(LuxGetfeatureDefinition)


@view_defaults(match_param='table=lux_getfeature_definition')
class LuxGetfeatureDefinitionViews(AbstractViews):
    _list_fields = [
        _list_field('id'),
        _list_field('engine_gfi'),
        _list_field('query'),
        _list_field('template'),
        _list_field('rest_url'),
        _list_field('layer'),
    ]
    _id_field = 'id'
    _model = LuxGetfeatureDefinition
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
