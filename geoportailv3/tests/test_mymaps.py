import unittest
from pyramid import testing
from pyramid.paster import get_app
from webtest import TestApp
from json import dumps as json_dumps


class TestMymaps(unittest.TestCase):

    def setUp(self):  # noqa
        self.app = get_app('../../development.ini')
        self.user_login = ""
        self.user_password = ""

    def tearDown(self):  # noqa
        testing.tearDown()

    def test_maps(self):
        testapp = TestApp(self.app)

        testapp.get('/mymaps/maps', status=401)
        testapp.post('/login?login=%s&password=%s'
                     % (self.user_login, self.user_password), status=200)
        resp = testapp.get('/mymaps/maps', status=200)
        assert resp.content_type == 'application/json'
        assert len(resp.json) >= 0

        resp = testapp.post('/mymaps/create',
                            params={'features':
                                    json_dumps(
        {"type": "FeatureCollection",  # noqa
         "features": [{"type": "Feature",
                       "properties": {"name": "test mymaps ligne",
                                      "description": "test ligne desc",
                                      "image": "",
                                      "thumbnail": "",
                                      "color": "#FF6600",
                                      "stroke": 3,
                                      "isLabel": False,
                                      "showOrientation": False,
                                      "linestyle": 1},
                       "geometry": {"type": "LineString",
                                    "coordinates": [[66000, 88750],
                                                    [84500, 90750],
                                                    [98000, 89750],
                                                    [74000, 107750]]}}]}),
                                    'zoom': 0,
                                    'X': 105000,
                                    'Y': 80000,
                                    'layers': '',
                                    'layers_indices': '7,8',
                                    'layers_opacity': '1,1',
                                    'layers_visibility': 'true,true',
                                    'bgOpacity': '',
                                    'bgLayer': 'webbasemap',
                                    'uuid': '',
                                    'theme': 'main',
                                    'title': 'test mymaps',
                                    'description': 'test description',
                                    'label': '',
                                    'category_id': ''}, status=200)
        assert resp.json['success'] is True
        assert len(resp.json["uuid"]) > 0

        map_id = resp.json["uuid"]
        testapp.get('/mymaps/map/bad_id', status=404)
        resp = testapp.get('/mymaps/map/' + map_id, status=200)
        assert len(resp.json) > 0
        assert resp.json["uuid"] == map_id
        assert resp.json["user_login"] == self.user_login
        assert resp.json["title"] == 'test mymaps'

        resp = testapp.get('/mymaps/delete/bad_id' + map_id, status=404)
        resp = testapp.get('/mymaps/delete/' + map_id, status=404)
        resp = testapp.post('/mymaps/delete/' + map_id, status=404)
        testapp.get('/logout', status=200)
        resp = testapp.delete('/mymaps/delete/' + map_id, status=401)

        testapp.post('/login?login=%s&password=%s'
                     % (self.user_login, self.user_password), status=200)
        testapp.put('/mymaps/update/' + map_id,
                    params={'features':
                            json_dumps(
        {"type": "FeatureCollection",  # noqa
         "features": [{"type": "Feature",
                       "properties": {"name": "updated Feature",
                                      "description": "updated description",
                                      "image": "",
                                      "thumbnail": "",
                                      "color": "#FF6600",
                                      "stroke": 3,
                                      "isLabel": False,
                                      "showOrientation": False,
                                      "linestyle": 1},
                       "geometry": {"type": "LineString",
                                    "coordinates": [[66000, 88750],
                                                    [84500, 90750],
                                                    [98000, 89750],
                                                    [74000, 107750]]}}]}),
                            'zoom': 0,
                            'X': 105000,
                            'Y': 80000,
                            'layers': '',
                            'layers_indices': '7,8',
                            'layers_opacity': '1,1',
                            'layers_visibility': 'true,true',
                            'bgOpacity': '',
                            'bgLayer': 'webbasemap',
                            'uuid': '',
                            'theme': 'main',
                            'title': 'Updated mymaps',
                            'description': 'updated test description',
                            'label': '',
                            'category_id': ''}, status=200)

        resp = testapp.get('/mymaps/map/' + map_id, status=200)
        assert resp.json["title"] == 'Updated mymaps'
        resp = testapp.get('/mymaps/rate/' + map_id + '?rating=10', status=400)
        resp = testapp.get('/mymaps/rate/' + map_id + '?rating=3', status=200)
        assert resp.json['success'] is True
        assert resp.json['rating_count'] == 1
        resp = testapp.get('/mymaps/rate/' + map_id + '?rating=3', status=200)
        assert resp.json['success'] is True
        assert resp.json['rating_count'] == 2

        resp = testapp.post('/mymaps/upload_image',
                            upload_files=[('file', 'LOGO_ACT.png')])
        assert resp.json['success'] is True
        resp = testapp.post('/mymaps/comment/%s?comment=Test commentaire'
                            % (map_id), status=200)
        assert resp.json['success'] is True

        resp = testapp.delete('/mymaps/delete/' + map_id, status=200)
        assert resp.json['success'] is True

if __name__ == '__main__':
    unittest.main()
