# Dev: compose mounts ./strapi -> /cms; anonymous volume preserves /cms/node_modules
FROM node:18-alpine AS dev
WORKDIR /cms
COPY package.json ./
RUN npm install && mkdir -p /cms/public/uploads
ENV NODE_ENV=development
EXPOSE 1337
CMD ["npm", "run", "develop"]

FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/public/uploads
ENV NODE_ENV=production
RUN npm run build
EXPOSE 1337
CMD ["npm", "run", "start"]
