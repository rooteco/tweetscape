# base node image
FROM node:16-bullseye-slim as base

ENV NODE_ENV=production
ENV PORT=8080

# install all node_modules, including dev dependencies
FROM base as deps

RUN mkdir /app
WORKDIR /app

ADD package.json yarn.lock .yarnrc.yml .
ADD .yarn .yarn
RUN yarn install --immutable --immutable-cache

# build the app
FROM deps as build

WORKDIR /app

ADD . .
RUN yarn build

# finally, build the production image with minimal footprint
FROM base

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/package.json /app/package.json
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public

EXPOSE 8080

CMD ["yarn", "start"]
