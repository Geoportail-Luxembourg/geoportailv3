.PHONY: install build dev lint docker-build clean

install:
	npm i

build:
	./rebuild_api.sh

dev:
	npm run start

lint:
	npm run lint

docker-build:
	docker build -t lux-jsapi:local .

clean:
	rm -rf dist
