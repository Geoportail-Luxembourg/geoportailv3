# -*- coding: utf-8 -*-
from pyramid.view import view_config
import os
import uuid
import shutil
import json
from pyramid.response import Response


class Upload(object):
    def __init__(self, request):
        self.request = request

    @view_config(route_name='upload_vt_style', renderer='json')
    def upload_vt_style(self):
        filename = self.request.POST['style'].filename
        input_file = self.request.POST['style'].file
        if 'VT_DIR' in os.environ:
            dir = os.environ['VT_DIR']
        else:
            dir = "/tmp"
        file_path = os.path.join(dir, '%s.json' % uuid.uuid4())

        input_file.seek(0)
        with open(file_path, 'wb') as output_file:
            try:
                data = json.load(input_file)
            except:
                return {"status":"KO"}
            input_file.seek(0)
            shutil.copyfileobj(input_file, output_file)

            return {"status":"OK"}
        return {"status":"KO"}

