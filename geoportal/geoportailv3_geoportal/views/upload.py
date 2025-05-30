# -*- coding: utf-8 -*-
from pyramid.view import view_config
import os
import uuid
import json
from pyramid.response import Response
from pyramid.httpexceptions import HTTPBadRequest


class Upload(object):
    def __init__(self, request):
        self.request = request
        self.vectortilesUrl_ = os.environ.get(
            'VECTORTILESURL',
            'https://vectortiles.geoportail.lu'
        )

    @view_config(route_name='upload_vt_style', renderer='json')
    def upload_vt_style(self):
        filename = self.request.POST['style'].filename
        input_file = self.request.POST['style'].file
        if 'VT_DIR' in os.environ:
            dir = os.environ['VT_DIR']
        else:
            dir = "/tmp"
        id = uuid.uuid4()
        file_path = os.path.join(dir, '%s.json' %id)

        input_file.seek(0)
        with open(file_path, 'w') as output_file:
            try:
                data = json.load(input_file)

                data["glyphs"] = data["glyphs"].replace(f"{self.vectortilesUrl_}/fonts/", "")

                for source in data["sources"]:
                    data["sources"][source]["url"] = data["sources"][source]["url"].replace(f"{self.vectortilesUrl_}/data/", "mbtiles://{").replace(".json", "}")

            except:
                return {"status":"KO"}
            data = json.dumps(data).replace('&gt;', '>' ).replace('&lt;', '<' )
            data = json.loads(data)
            
            json.dump(data, output_file)

            return {"status":"OK", "id": str(id)}

    @view_config(route_name='get_vt_style', renderer='json')
    def get_vt_style(self):
        # id = self.request.matchdict['id']
        id = self.request.params.get("id")
        if 'VT_DIR' in os.environ:
            dir = os.environ['VT_DIR']
        else:
            dir = "/tmp"

        file_path = os.path.join(dir, '%s.json' % id)
        if not os.path.exists(file_path):
            return HTTPBadRequest("File does not exist")
        with open(file_path) as json_file:
            data = json.load(json_file)

        data["glyphs"] = f"{self.vectortilesUrl_}/fonts/" + data["glyphs"].strip()
        for source in data["sources"]:
            data["sources"][source]["url"] = (
                data["sources"][source]["url"]
                .replace("mbtiles://{", f"{self.vectortilesUrl_}/data/")
                .replace("}", ".json")
            )

        return data

    @view_config(route_name='delete_vt_style', renderer='json')
    def delete_vt_style(self):
        id = self.request.params.get("id")
        if 'VT_DIR' in os.environ:
            dir = os.environ['VT_DIR']
        else:
            dir = "/tmp"

        file_path = os.path.join(dir, '%s.json' %id)
        if os.path.exists(file_path):
            os.remove(file_path)

        return {"status":"OK"}


    @view_config(route_name='upload_permalink_style', renderer='json')
    def upload_vt_permalink_style(self):
        input_file = self.request.POST['style'].file
        if 'VT_PERMALINK_DIR' in os.environ:
            dir = os.environ['VT_PERMALINK_DIR']
        else:
            dir = "/tmp"
        id = uuid.uuid4()
        file_path = os.path.join(dir, '%s.json' %id)

        input_file.seek(0)
        with open(file_path, 'w') as output_file:
            try:
                data = json.load(input_file)

            except:
                return {"status": "KO"}
            data = json.dumps(data).replace('&gt;', '>').replace('&lt;', '<')
            data = json.loads(data)

            json.dump(data, output_file)

            return {"status": "OK", "id": str(id)}

    @view_config(route_name='get_permalink_style', renderer='json')
    def get_vt_permalink_style(self):
        # id = self.request.matchdict['id']
        id = self.request.params.get("id")
        if 'VT_PERMALINK_DIR' in os.environ:
            dir = os.environ['VT_PERMALINK_DIR']
        else:
            dir = "/tmp"

        file_path = os.path.join(dir, '%s.json' %id)
        if not os.path.exists(file_path):
            return HTTPBadRequest("File does not exist")
        with open(file_path) as json_file:
            data = json.load(json_file)

        return data

    @view_config(route_name='delete_permalink_style', renderer='json')
    def delete_vt_permalink_style(self):
        id = self.request.params.get("id")
        if 'VT_PERMALINK_DIR' in os.environ:
            dir = os.environ['VT_PERMALINK_DIR']
        else:
            dir = "/tmp"

        file_path = os.path.join(dir, '%s.json' %id)
        if os.path.exists(file_path):
            os.remove(file_path)

        return {"status": "OK"}
