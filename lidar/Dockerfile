FROM debian:sid-slim

WORKDIR /data

RUN apt-get update \
  && apt-get -y install git-all
RUN git clone https://github.com/sitn/pytree.git /app

WORKDIR /app

RUN apt-get update \
  && apt-get -y install python3 python-is-python3 python3-pip \
  && apt-get -y install libtbb2 \
  && apt-get -y install wget \
  && apt-get -y autoremove --purge && apt-get -y autoclean

#COPY requirements.txt requirements.txt

RUN wget http://ftp.de.debian.org/debian/pool/main/l/laszip/liblaszip-dev_3.4.3-2_amd64.deb \
    && wget http://ftp.de.debian.org/debian/pool/main/l/laszip/liblaszip-api8_3.4.3-2_amd64.deb \
    && wget http://ftp.de.debian.org/debian/pool/main/l/laszip/liblaszip8_3.4.3-2_amd64.deb \
    && dpkg -i liblaszip-api8_3.4.3-2_amd64.deb \
    && dpkg -i liblaszip8_3.4.3-2_amd64.deb \
    && dpkg -i liblaszip-dev_3.4.3-2_amd64.deb

RUN python -m pip install --upgrade pip \
  && pip3 install -r requirements.txt

COPY . ./
COPY ./bin/extract_profile ./bin/extract_profile

RUN chmod +x ./start_server.sh \
  && mv ./bin/extract_profile /usr/local/bin/ && chmod +x /usr/local/bin/extract_profile \
  && ldconfig

ENV PYTHONUNBUFFERED=1
