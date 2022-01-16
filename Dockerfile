# Install dependencies
FROM node:14.18.3-alpine AS deps

WORKDIR /app

ENV NODE_ENV production
COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock

RUN yarn install --production \
  && yarn cache clean

# Production image
FROM node:14.18.3-alpine AS runner

ARG service_name

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app ./
COPY . /app

CMD node lib/server