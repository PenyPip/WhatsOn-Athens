FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/public/uploads
RUN npm run build
EXPOSE 1337
CMD ["npm", "run", "develop"]