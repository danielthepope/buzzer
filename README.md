# Buzzer

Your phone is now an Internet-connected gameshow buzzer.

## Tech

Uses a Node.js backend with Express and Socket.io to manage the players' connections.

## Setup

### With Docker

Create the image either with `make build`, `docker build -t buzzer_app .` or `docker-compose build`.

Run with `docker run -it --rm -p 8080:8080 buzzer_app` or `docker-compose up`.

### Without Docker

`npm install` to install the dependencies, then `npm start` to run. It will listen on port 8080.

## Deployment

If the machine you're building on isn't the one you want to run the app on, make a Docker-deployable zip file with `make zip` or `docker save buzzer_app | gzip > buzzer.tar.gz`. Send the zip file to the server.

On the server, run `docker load < buzzer.tar.gz`. The app can then be run using docker-compose or similar.

### Nginx configuration

To enable Websockets on Nginx, add this `location`:

```
location /socket.io/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
}
```

Configuration adapted from the [Nginx blog](https://www.nginx.com/blog/websocket-nginx/).
