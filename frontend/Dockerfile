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

ENV NODE_ENV=production

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SITE_URL=https://the37n.gr
# Κατά build με network:host (docker-compose) — Strapi στο host :1337.
ARG SITEMAP_STRAPI_URL=http://127.0.0.1:1337
# Default 0: `docker compose build` δεν απαιτεί live Strapi. Production: deploy-production.sh περνά 1.
ARG SITEMAP_STRICT_MODE=0
# Next static export + prefetch — 3072 OK σε VPS 4GB+swap· 4096 αν έχεις ≥6GB.
ARG NODE_HEAP_MB=3072

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV SITEMAP_STRAPI_URL=$SITEMAP_STRAPI_URL
ENV STRAPI_INTERNAL_URL=$SITEMAP_STRAPI_URL
ENV SITEMAP_STRICT_MODE=$SITEMAP_STRICT_MODE
ENV NODE_OPTIONS=--max-old-space-size=${NODE_HEAP_MB}
ENV NEXT_TELEMETRY_DISABLED=1

RUN chmod +x /front/scripts/docker-prod-build.sh && /front/scripts/docker-prod-build.sh

FROM nginx:alpine

COPY --from=builder /front/out /usr/share/nginx/html

COPY --from=builder /front/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /front/nginx-security-headers.conf /etc/nginx/nginx-security-headers.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
