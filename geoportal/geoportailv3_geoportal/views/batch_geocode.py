# -*- coding: utf-8 -*-

import json
import os
from datetime import datetime
from uuid import uuid4

from pyramid.httpexceptions import HTTPBadRequest
from pyramid.response import Response
from pyramid.view import view_config

from geoportailv3_geoportal.tasks.geocoding import geocode_batch_task


JOB_DIR = os.environ.get("GEOCODE_BATCH_DIR", "/tmp/geocode_jobs")


class BatchGeocode(object):
    def __init__(self, request):
        self.request = request

    def _job_path(self, job_id):
        os.makedirs(JOB_DIR, exist_ok=True)
        return os.path.join(JOB_DIR, "%s.json" % job_id)

    def _write_job(self, job_id, job):
        with open(self._job_path(job_id), "w") as job_file:
            json.dump(job, job_file)

    def _read_job(self, job_id):
        job_path = self._job_path(job_id)
        if not os.path.exists(job_path):
            return None
        with open(job_path, "r") as job_file:
            return json.load(job_file)

    @view_config(route_name="geocode_batch_upload", renderer="json")
    def upload(self):
        upload = self.request.POST.get("file")
        if upload is None or getattr(upload, "filename", None) is None:
            return HTTPBadRequest("Missing file")

        job_id = str(uuid4())
        now = datetime.utcnow().isoformat()
        file_name = os.path.basename(upload.filename)
        file_path = os.path.join(JOB_DIR, "%s_%s" % (job_id, file_name))

        os.makedirs(JOB_DIR, exist_ok=True)
        with open(file_path, "wb") as output_file:
            output_file.write(upload.file.read())

        job = {
            "job_id": job_id,
            "filename": file_name,
            "status": "PENDING",
            "created_at": now,
            "updated_at": now,
            "result_file": None,
            "error": None,
        }
        self._write_job(job_id, job)

        geocode_batch_task.delay(job_id, file_path)

        return {
            "job_id": job_id,
            "status": "PENDING",
            "message": "Batch geocoding started",
        }

    @view_config(route_name="geocode_batch_status", renderer="json")
    def status(self):
        job_id = self.request.matchdict["job_id"]
        job = self._read_job(job_id)
        if job is None:
            return HTTPBadRequest("Job not found")

        return {
            "job_id": job["job_id"],
            "status": job["status"],
            "filename": job["filename"],
            "created_at": job["created_at"],
            "updated_at": job["updated_at"],
            "result_file": job.get("result_file"),
            "error": job.get("error"),
        }

    @view_config(route_name="geocode_batch_download", renderer="json")
    def download(self):
        job_id = self.request.matchdict["job_id"]
        job = self._read_job(job_id)
        if job is None:
            return HTTPBadRequest("Job not found")

        if job.get("status") != "SUCCESS" or not job.get("result_file"):
            return HTTPBadRequest("Job not completed")

        result_path = job["result_file"]
        if not os.path.exists(result_path):
            return HTTPBadRequest("Result file not found")

        with open(result_path, "rb") as input_file:
            content = input_file.read()

        return Response(
            body=content,
            content_type="application/octet-stream",
            content_disposition='attachment; filename="%s"' % os.path.basename(result_path),
        )
