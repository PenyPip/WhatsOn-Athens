# Dev: compose mounts ./strapi -> /cms; anonymous volume preserves /cms/node_modules
FROM node:18-alpine AS dev
WORKDIR /cms
COPY package.json package-lock.json ./
RUN npm ci && mkdir -p /cms/public/uploads
COPY docker-entrypoint.dev.sh /usr/local/bin/docker-entrypoint.dev.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.dev.sh
ENV NODE_ENV=development
EXPOSE 1337
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.dev.sh"]
CMD ["npm", "run", "develop"]

FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN mkdir -p /app/public/uploads
ENV NODE_ENV=production
RUN npm run build
EXPOSE 1337
CMD ["npm", "run", "start"]
