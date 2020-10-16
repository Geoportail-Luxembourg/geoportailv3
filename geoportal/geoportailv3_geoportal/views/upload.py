# -*- coding: utf-8 -*-
from pyramid.view import view_config
import os
import uuid
import shutil
import json
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest


class Upload(object):
    def __init__(self, request):
        self.request = request

    @view_config(route_name='upload_vt_style', renderer='json')
    def upload_vt_style(self):
        input_file = self.request.POST['style'].file
        if 'VT_DIR' in os.environ:
            vt_dir = os.environ['VT_DIR']
        else:
            vt_dir = "/tmp"
        vt_id = uuid.uuid4()
        file_path = os.path.join(vt_dir, '%s.json' %vt_id)

        input_file.seek(0)
        with open(file_path, 'wb') as output_file:
            try:
                json.load(input_file)
            except:
                return {"status":"KO"}
            input_file.seek(0)
            shutil.copyfileobj(input_file, output_file)

            return {"status":"OK", "id": str(vt_id)}

    @view_config(route_name='get_vt_style', renderer='json')
    def get_vt_style(self):
        vt_id = self.request.params.get("id")
        if 'VT_DIR' in os.environ:
            vt_dir = os.environ['VT_DIR']
        else:
            vt_dir = "/tmp"

        file_path = os.path.join(vt_dir, '%s.json' %vt_id)
        if not os.path.exists(file_path):
            return HTTPBadRequest("File does not exist")
        with open(file_path) as json_file:
            data = json.load(json_file)

        return data

    @view_config(route_name='delete_vt_style', renderer='json')
    def delete_vt_style(self):
        vt_id = self.request.params.get("id")
        if 'VT_DIR' in os.environ:
            vt_dir = os.environ['VT_DIR']
        else:
            vt_dir = "/tmp"

        file_path = os.path.join(vt_dir, '%s.json' %vt_id)
        if os.path.exists(file_path):
            os.remove(file_path)

        return {"status":"OK"}

