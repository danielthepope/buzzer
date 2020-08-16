build:
	docker-compose build

build-beta:
	docker build -t buzzer_app:beta .

zip:
	docker save buzzer_app | gzip > buzzer.tar.gz
