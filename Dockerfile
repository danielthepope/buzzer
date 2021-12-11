FROM node:16-alpine

WORKDIR /usr/src/app

# Install dependencies.
COPY package*.json ./

RUN npm install

# Copy project directory.
COPY . ./

EXPOSE 8080
CMD [ "npm", "start" ]
