#!/usr/bin/env python3

from http.server import HTTPServer, BaseHTTPRequestHandler
import json


RES_NAMES = ["contours-lu", "hillshade-lu", "omt-geoportail-lu",
             "omt-topo-geoportail-lu", "resources", "fonts", "sprites"]
MAX_STATUS = 5
OLD_VER = "0.1.0"
NEW_VER = "0.5.2"


class UpdateHandler(BaseHTTPRequestHandler):
    dl_status = {res: 0 for res in RES_NAMES}
    res_ver = {res: OLD_VER
               for res in RES_NAMES}

    @staticmethod
    def get_status_string(dl_status):
        if dl_status == 0:
            return "UNKNOWN"
        elif dl_status < MAX_STATUS:
            return "IN_PROGRESS"
        else:
            return "DONE"

    def do_GET(self):
        if self.path == "/check":
            self.send_response(200, "OK")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            resp = {
                res: {
                    "status": self.get_status_string(self.dl_status[res]),
                    "filesize": 5000 * self.dl_status[res],
                    "current": self.res_ver[res],
                    "available": NEW_VER
                } for res in RES_NAMES
            }
            # self.wfile.write("bla")
            self.wfile.write(json.dumps(resp).encode())
        else:
            # import pdb;pdb.set_trace()
            self.send_response(400, "bla")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b"Test\n")

        for res in RES_NAMES:
            if 0 < self.dl_status[res] < MAX_STATUS:
                self.dl_status[res] += 1
            if self.dl_status[res] >= MAX_STATUS:
                self.res_ver[res] = NEW_VER

    def do_PUT(self):
        res = self.path.replace("/map/", "")
        if res in RES_NAMES:
            self.dl_status[res] = 1

            self.send_response(202, "ACCEPTED")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(f"Update started for {res}\n".encode())

        else:
            self.send_response(404, "NOT FOUND")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(f"Resource {res} not found.\n".encode())

    def do_DELETE(self):
        res = self.path.replace("/map/", "")
        if res in RES_NAMES:
            self.dl_status[res] = 0
            self.res_ver[res] = OLD_VER

            self.send_response(202, "ACCEPTED")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(f"Deleted {res}\n".encode())

        else:
            self.send_response(404, "NOT FOUND")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(f"Resource {res} not found.\n".encode())

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "PUT, DELETE")
        self.end_headers()


server_address = ('', 8000)
httpd = HTTPServer(server_address, UpdateHandler)
httpd.serve_forever()
