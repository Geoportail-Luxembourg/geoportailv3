# -*- coding: utf-8 -*-

import csv
import json
import os
from datetime import datetime

try:
    from celery import Celery
except ImportError:  # pragma: no cover
    class Celery(object):
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

        def task(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator


from geoportailv3_geoportal.views.geocode import Geocode


JOB_DIR = os.environ.get("GEOCODE_BATCH_DIR", "/tmp/geocode_jobs")

app = Celery(
    "geoportailv3_geoportal",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0"),
)


def _job_path(job_id):
    os.makedirs(JOB_DIR, exist_ok=True)
    return os.path.join(JOB_DIR, "%s.json" % job_id)


def update_job(job_id, **kwargs):
    job_path = _job_path(job_id)
    if not os.path.exists(job_path):
        return

    with open(job_path, "r") as job_file:
        job = json.load(job_file)

    job.update(kwargs)
    job["updated_at"] = datetime.utcnow().isoformat()

    with open(job_path, "w") as job_file:
        json.dump(job, job_file)


@app.task(name="geoportailv3_geoportal.geocode_batch_task")
def geocode_batch_task(job_id, file_path):
    update_job(job_id, status="STARTED")

    result_path = os.path.join(JOB_DIR, "%s_result.csv" % job_id)
    try:
        geocoder = Geocode(None)
        with open(file_path, newline="") as input_file, open(result_path, "w", newline="") as output_file:
            reader = csv.DictReader(input_file)
            fieldnames = [
                "row",
                "street",
                "num",
                "zip",
                "locality",
                "status",
                "result",
            ]
            writer = csv.DictWriter(output_file, fieldnames=fieldnames)
            writer.writeheader()

            for row_number, row in enumerate(reader, start=1):
                street = (row.get("street") or row.get("rue") or "").strip()
                num = (row.get("num") or row.get("numero") or "").strip()
                zip_code = (row.get("zip") or row.get("postal_code") or row.get("code_postal") or "").strip()
                locality = (row.get("locality") or row.get("commune") or "").strip()

                try:
                    res = geocoder.start_search(
                        0.7,
                        num,
                        street,
                        zip_code,
                        locality,
                        "lu",
                        geocoder.db_ecadastre,
                    )
                    best = geocoder.keep_the_best_result(res, street)
                    result_payload = best[0] if best else {"status": "not_found"}
                    output_value = json.dumps(result_payload, default=str)
                    status = "OK" if best else "NOT_FOUND"
                except Exception as exc:  # pragma: no cover
                    output_value = json.dumps({"status": "ERROR", "message": str(exc)})
                    status = "ERROR"

                writer.writerow({
                    "row": row_number,
                    "street": street,
                    "num": num,
                    "zip": zip_code,
                    "locality": locality,
                    "status": status,
                    "result": output_value,
                })

        update_job(job_id, status="SUCCESS", result_file=result_path)
        return {"job_id": job_id, "status": "SUCCESS", "result_file": result_path}

    except Exception as exc:
        update_job(job_id, status="FAILURE", error=str(exc))
        raise
