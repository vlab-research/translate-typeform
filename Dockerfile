FROM node:11.14.0

RUN mkdir /app
WORKDIR /app

COPY package.json /app
RUN npm install

COPY . /app
