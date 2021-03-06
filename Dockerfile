FROM node:10.15.1-alpine
RUN apk update && apk add tini socat git openssh-client && rm -rf /var/cache/apk/*

ENTRYPOINT ["/sbin/tini", "--"]

# create a work directory inside the container
RUN mkdir /usr/app
WORKDIR /usr/app

# # install dependencies
COPY package.json .
RUN npm install

COPY tsconfig.json .
COPY index.ts index.ts

RUN ./node_modules/.bin/tsc
CMD npm run deploy

# RUN ./node_modules/.bin/nodemon