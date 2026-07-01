# Dev: compose mounts ./strapi -> /cms; anonymous volume preserves /cms/node_modules
FROM node:18-bookworm-slim AS dev
WORKDIR /cms
ENV NPM_CONFIG_OMIT_OPTIONAL=false
COPY package.json package-lock.json .npmrc ./
COPY scripts/install-swc-native.sh scripts/install-swc-native.sh
RUN npm ci && sh scripts/install-swc-native.sh && mkdir -p /cms/public/uploads \
  && cp -a node_modules /opt/strapi-node_modules
COPY docker-entrypoint.dev.sh /usr/local/bin/docker-entrypoint.dev.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.dev.sh
ENV NODE_ENV=development
EXPOSE 1337
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.dev.sh"]
CMD ["npm", "run", "develop"]

# strapi-dockerfile-v3-swc — Production: node_modules μόνο από npm ci (.dockerignore).
FROM node:18-bookworm-slim
WORKDIR /app
ENV NPM_CONFIG_OMIT_OPTIONAL=false

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
COPY scripts/install-swc-native.sh scripts/install-swc-native.sh
RUN npm ci && sh scripts/install-swc-native.sh

COPY . .
RUN mkdir -p /app/public/uploads \
  && sh scripts/install-swc-native.sh \
  && NODE_ENV=production npm run build

EXPOSE 1337
CMD ["npm", "run", "start"]
