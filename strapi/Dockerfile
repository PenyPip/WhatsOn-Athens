# Dev: compose mounts ./strapi -> /cms; anonymous volume preserves /cms/node_modules
FROM node:18-bookworm-slim AS dev
WORKDIR /cms
COPY package.json package-lock.json .npmrc ./
COPY scripts/install-swc-native.sh scripts/install-swc-native.sh
RUN npm ci --include=optional && sh scripts/install-swc-native.sh && mkdir -p /cms/public/uploads
COPY docker-entrypoint.dev.sh /usr/local/bin/docker-entrypoint.dev.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.dev.sh
ENV NODE_ENV=development
EXPOSE 1337
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.dev.sh"]
CMD ["npm", "run", "develop"]

# Production: bookworm (glibc). ΜΗΝ αντιγράφεις node_modules (βλ. .dockerignore).
FROM node:18-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY scripts/install-swc-native.sh scripts/install-swc-native.sh
RUN npm ci --include=optional && sh scripts/install-swc-native.sh
COPY . .
RUN mkdir -p /app/public/uploads
ENV NODE_ENV=production
RUN sh scripts/install-swc-native.sh && npm run build
EXPOSE 1337
CMD ["npm", "run", "start"]
