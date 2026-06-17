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
# Default 0: `docker compose build` δεν απαιτεί live Strapi. Production: deploy-production.sh περνά 1.
ARG SITEMAP_STRICT_MODE=0
# Next static export + prefetch — χρειάζεται μεγαλύτερο heap (VPS: 4096, Docker Desktop: αύξησε RAM ≥6GB).
ARG NODE_HEAP_MB=4096

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV SITEMAP_STRAPI_URL=$SITEMAP_STRAPI_URL
ENV SITEMAP_STRICT_MODE=$SITEMAP_STRICT_MODE
ENV NODE_OPTIONS=--max-old-space-size=${NODE_HEAP_MB}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM nginx:alpine

COPY --from=builder /front/out /usr/share/nginx/html

COPY --from=builder /front/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /front/nginx-security-headers.conf /etc/nginx/nginx-security-headers.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
