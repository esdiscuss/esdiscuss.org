FROM node:12.18.2-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock

RUN yarn install --production \
  && yarn cache clean

ADD client /app/client
ADD less /app/less
ADD lib /app/lib
ADD static /app/static
ADD views /app/views
ADD favicon.ico /app/favicon.ico
ADD profiles.json /app/profiles.json

CMD node lib/server