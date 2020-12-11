# patched_gunicorn_runner.py
from gunicorn.http import message
from gunicorn.app.wsgiapp import run

def main():
    message.MAX_REQUEST_LINE = 65534
    run()
