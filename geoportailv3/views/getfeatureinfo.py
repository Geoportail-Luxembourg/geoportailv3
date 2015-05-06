# -*- coding: utf-8 -*-
import sqlahelper
import logging
import json
import geoalchemy2

from pyramid.view import view_config
from sqlalchemy.sql import text
from geoportailv3.models import LuxGetfeatureDefinition
from pyramid.httpexceptions import HTTPBadRequest

log = logging.getLogger(__name__)

class Getfeatureinfo(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='getfeatureinfo', renderer='json')
    def get_feature_info(self):

        layers = self.request.params.get('layers', None)
        if layers is None:
            return HTTPBadRequest()
        DBSession = sqlahelper.get_session()
        
        try :
            if layers is not None :
                luxGetfeatureDefinitions = DBSession.query(
                    LuxGetfeatureDefinition).filter(
                        LuxGetfeatureDefinition.layer.in_(layers.split(','))).all()
        except : 
            return HTTPBadRequest()

        #ST_GeomFromText('POLYGON((ulx uly, urx ury, llx llr, lrx lry, ulx uly))', <srid>)
        results = []
        for luxGetfeatureDefinition in luxGetfeatureDefinitions:
            if luxGetfeatureDefinition.engine is not None :
                engine = sqlahelper.get_engine(luxGetfeatureDefinition.engine)
                res = engine.execute (luxGetfeatureDefinition.query)
                rows = res.fetchall()
                results.append ({luxGetfeatureDefinition.layer:[dict(r) for r in rows]})

        return results