FROM node:20-alpine AS base

WORKDIR /front

COPY package*.json /front/

RUN npm install && npm cache clean --force

COPY . .

ENV PATH=/front/node_modules/.bin:$PATH

FROM base AS dev

ENV NODE_ENV=development

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM base AS builder

ARG NEXT_PUBLIC_API_URL=/api

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=builder /front/out /usr/share/nginx/html

COPY --from=builder /front/nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
