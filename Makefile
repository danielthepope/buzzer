build:
	docker-compose build

zip:
	docker save buzzer_app | gzip > buzzer.tar.gz
