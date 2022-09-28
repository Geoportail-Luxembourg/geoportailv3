################################CPOTREE BUILDER##################################
FROM debian:sid-slim as extract_profile_builder
ARG HTTP_PROXY_URL
ENV http_proxy $HTTP_PROXY_URL
ARG HTTPS_PROXY_URL
ENV https_proxy $HTTPS_PROXY_URL

RUN apt-get update \
  && apt-get -y install git-all

WORKDIR /app
RUN git clone https://github.com/Geoportail-Luxembourg/CPotree.git /app
RUN git checkout fix_classification

RUN apt-get -y install cmake make gcc g++ build-essential
RUN apt-get -y install python3 libtbb-dev
RUN echo "alias ll=\"ls -l\"" >> ~/.bashrc 
RUN mkdir build
WORKDIR /app/build
RUN cmake ../
RUN make

###############################################################################

FROM debian:sid-slim
ARG HTTP_PROXY_URL
ENV http_proxy $HTTP_PROXY_URL
ARG HTTPS_PROXY_URL
ENV https_proxy $HTTPS_PROXY_URL
WORKDIR /data

RUN apt-get update \
  && apt-get -y install git-all
ARG cache
RUN git clone https://github.com/geoportallux/pytree.git /app

WORKDIR /app/pytree/
RUN git checkout main
WORKDIR /app

RUN apt-get update \
  && apt-get -y install python3 python-is-python3 python3-pip \
  && apt-get -y install libtbb2 \
  && apt-get -y install wget vim \
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
RUN apt-get -y install python3 libtbb-dev
COPY . ./
COPY --from=extract_profile_builder /app/build/extract_profile /app/geoportailv3_geoportal/locale/
COPY --from=extract_profile_builder /app/build/liblaszip.so /app/geoportailv3_geoportal/locale/

RUN chmod +x ./start_server.sh \
  && cp /app/geoportailv3_geoportal/locale/extract_profile /usr/local/bin/ && chmod +x /usr/local/bin/extract_profile \
  && ldconfig
RUN alias ll="ls -l"
ENV PYTHONUNBUFFERED=1
