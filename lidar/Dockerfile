FROM ubuntu:22.04 as extract_profile_builder

RUN apt-get update \
  && apt-get install --yes build-essential git cmake python3 \
  zlib1g-dev libssl-dev libcurlpp-dev

WORKDIR /opt/

RUN git clone --recurse-submodules https://github.com/aws/aws-sdk-cpp.git \
    && cd aws-sdk-cpp

WORKDIR /opt/aws-sdk-cpp/build

RUN cmake .. -DCMAKE_TOOLCHAIN_FILE=../toolchains/gcc-c++20.cmake -DBUILD_ONLY="s3" \
  && cmake --build . \
  && cmake --install .

WORKDIR /app

RUN git clone https://github.com/Geoportail-Luxembourg/CPotree.git /app

COPY . .

WORKDIR /app/build

RUN cmake .. -DWITH_AWS_SDK=ON \
  && make \
  && cp extract_area extract_profile /usr/bin \
  && cp liblaszip.so /usr/lib
RUN apt-get update && apt-get -y install python3 python-is-python3 python3-pip \
  && apt-get -y install libtbbmalloc2 \
  && apt-get -y install wget vim \
  && apt-get -y autoremove --purge && apt-get -y autoclean
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get -y install git-all
ARG DEBIAN_FRONTEND=noninteractive
RUN git clone https://github.com/geoportallux/pytree.git /app-pytree

WORKDIR /app-pytree/pytree/
RUN git checkout s3
RUN cp /app/pytree.yml /app-pytree/
WORKDIR /app-pytree
RUN python -m pip install --upgrade pip \
  && pip3 install --break-system-packages -r requirements.txt
RUN apt-get -y install python3 libtbb-dev

RUN chmod +x ./start_server.sh \
  && cp /usr/bin/extract_profile /usr/local/bin/ && chmod +x /usr/local/bin/extract_profile \
  && ldconfig
RUN alias ll="ls -l"
ENV PYTHONUNBUFFERED=1
ENV AWS_ENDPOINT_URL=https://acts3.geoportail.lu
ENV AWS_USE_PATH_STYLE=true
ENV AWS_EC2_METADATA_DISABLED=true

ENTRYPOINT /app-pytree/start_server.sh