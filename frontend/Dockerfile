FROM node:20-alpine AS base

WORKDIR /front

COPY package*.json /front/

RUN npm install && npm cache clean --force

COPY . .

ENV PATH=/front/node_modules/.bin:$PATH

FROM base AS dev

ENV NODE_ENV=development

EXPOSE 3000

# Το node:20 entrypoint τρέχει `node` σε μη-executable αρχεία — χρησιμοποιούμε sh ρητά.
ENTRYPOINT []
CMD ["sh", "/front/scripts/docker-dev-entrypoint.sh"]

FROM base AS builder

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SITE_URL=https://the37n.gr
# Κατά build: Strapi στο host :1337 — docker compose περνά host.docker.internal (όχι network=host).
ARG SITEMAP_STRAPI_URL=http://host.docker.internal:1337
ARG SITEMAP_STRICT_MODE=1

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV SITEMAP_STRAPI_URL=$SITEMAP_STRAPI_URL
ENV SITEMAP_STRICT_MODE=$SITEMAP_STRICT_MODE

RUN npm run build

FROM nginx:alpine

COPY --from=builder /front/out /usr/share/nginx/html

COPY --from=builder /front/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /front/nginx-security-headers.conf /etc/nginx/nginx-security-headers.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
