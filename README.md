# Buzzer

Your phone is now an Internet-connected gameshow buzzer.

## Tech

Uses a Node.js backend with Express and Socket.io to manage the players' connections.

## Setup

### With Docker

Create the image either with `make build`, `docker build -t buzzer_app .` or `docker-compose build`.

Run with `docker run -it --rm -p 8080:8080 -v ./message/:/usr/src/app/message/ buzzer_app` or `docker-compose up`.

### Without Docker

Requires Node.js and NPM to be installed. This has been built and tested with Node 16.

`npm install` to install the dependencies, then `npm start` to run. It will listen on port 8080.

## Testing

Behaviour tests have been written for the basic functionality of the app.

First, run the app with `npm start`, then in a separate terminal, run `npm run test`.

## Deployment

If the machine you're building on isn't the one you want to run the app on, make a Docker-deployable zip file with `make zip` or `docker save buzzer_app | gzip > buzzer.tar.gz`. Send the zip file to the server.

On the server, run `docker load < buzzer.tar.gz`. The app can then be run using docker-compose or similar.

### Nginx configuration

Your webserver should be configured to enable websocket connections, otherwise clients will revert to the fallback method of long-polling HTTP requests.

Using Nginx configuration as an example, be sure to add a `location` block that upgrades socket.io connections.

```
server {
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:8080;
    }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    listen 80;
}
```

Configuration adapted from the [Nginx blog](https://www.nginx.com/blog/websocket-nginx/).

### Broadcast message

To send a message to all connected players (e.g. to warn of upcoming maintenance), edit the file `message/message.txt`. It will be sent to all players within a minute.

## Donations

I'd like this app to remain free for everyone. If you've found Buzzer useful and you'd like to contribute to the hosting costs, you can [Buy Me a Coffee](https://www.buymeacoffee.com/danielthepope).

## Contributing

Bugfix PRs are welcomed, and new features may be accepted, but before you go and spend lots of time working on them, you should [raise an issue](https://github.com/danielthepope/buzzer/issues) first.
