FROM node:20-alpine

RUN apk add --no-cache \
    build-base \
    gcc \
    autoconf \
    automake \
    zlib-dev \
    libpng-dev \
    python3 \
    make \
    g++

WORKDIR /opt/app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 1337

CMD ["npm", "run", "develop", "--", "--no-watch-admin"]