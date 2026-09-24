# -*- coding: utf-8 -*-

import csv
import json
import os
from datetime import datetime
import logging

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

log = logging.getLogger(__name__)


JOB_DIR = os.environ.get("GEOCODE_BATCH_DIR", "/tmp/celery/jobs" )

app = Celery(
    "geoportailv3_geoportal",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/2"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/2"),
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


def _count_input_rows(file_path):
    try:
        with open(file_path, newline="") as input_file:
            reader = csv.DictReader(input_file)
            if reader.fieldnames is None:
                return 0
            return sum(1 for _ in reader)
    except Exception:
        return 0


@app.task(name="geoportailv3_geoportal.geocode_batch_task")
def geocode_batch_task(job_id, file_path):
    update_job(job_id, status="STARTED")

    result_path = os.path.join(JOB_DIR, "%s_result.csv" % job_id)
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        # Create a session for 'ecadastre' database
        db_url = os.environ.get('DB_ECADASTRE')
        if not db_url:
            error_msg = "DB_ECADASTRE environment variable is not set"
            log.error(error_msg)
            update_job(job_id, status="FAILURE", error=error_msg)
            return {"job_id": job_id, "status": "FAILURE", "error": error_msg}

        try:
            engine = create_engine(db_url)
            Session = sessionmaker(bind=engine)
            db_session = Session()
        except Exception as e:
            error_msg = "Failed to create database session: %s" % str(e)
            log.error(error_msg)
            update_job(job_id, status="FAILURE", error=error_msg)
            return {"job_id": job_id, "status": "FAILURE", "error": error_msg}

        try:
            geocoder = Geocode(None)
            geocoder.db_ecadastre = db_session

            total_rows = _count_input_rows(file_path)
            update_job(job_id, total_rows=total_rows, processed_rows=0)

            with open(file_path, newline="") as input_file, open(result_path, "w", newline="") as output_file:
                reader = csv.DictReader(input_file)
                fieldnames = [
                    "row",
                    "id",
                    "num",
                    "street",
                    "zip",
                    "locality",
                    "country",
                    "status",
                    "result",
                ]
                writer = csv.DictWriter(output_file, fieldnames=fieldnames)
                writer.writeheader()

                for row_number, row in enumerate(reader, start=1):
                    id = (row.get("id") or "").strip()
                    street = (row.get("street") or row.get("rue") or "").strip()
                    num = (row.get("num") or row.get("numero") or "").strip()
                    zip_code = (row.get("zip") or row.get("postal_code") or row.get("code_postal") or "").strip()
                    locality = (row.get("locality") or row.get("commune") or "").strip()
                    country = (row.get("country") or row.get("pays") or "LUXEMBOURG").strip()
                    try:
                        res = geocoder.start_search(
                            0.7,
                            num,
                            street,
                            zip_code,
                            locality,
                            country,
                            geocoder.db_ecadastre,
                        )
                        best = geocoder.keep_the_best_result(res, street)
                        result_payload = best[0] if best else {"status": "not_found"}
                        output_value = json.dumps(result_payload, default=str)
                        status = "OK" if best else "NOT_FOUND"
                    except Exception as exc:  # pragma: no cover
                        output_value = json.dumps({"status": "ERROR", "message": str(exc)})
                        status = "ERROR"
                        log.error("Error geocoding row %d: %s", row_number, str(exc))

                    writer.writerow({
                        "row": row_number,
                        "id": id,
                        "num": num,
                        "street": street,
                        "zip": zip_code,
                        "locality": locality,
                        "country": country,
                        "status": status,
                        "result": output_value,
                    })

                    processed_rows = row_number
                    update_job(
                        job_id,
                        processed_rows=processed_rows,
                        total_rows=total_rows,
                        progress="%d/%d traitées" % (processed_rows, total_rows),
                    )

            update_job(job_id, status="SUCCESS", result_file=result_path, processed_rows=total_rows, total_rows=total_rows)
            return {"job_id": job_id, "status": "SUCCESS", "result_file": result_path}

        finally:
            db_session.close()

    except Exception as exc:
        error_msg = str(exc)
        log.exception("Task failed with error: %s", error_msg)
        update_job(job_id, status="FAILURE", error=error_msg)
        raise
