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