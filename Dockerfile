FROM docker.m.daocloud.io/library/node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install
COPY . .
RUN npm run build
EXPOSE 3014
CMD ["node", "server/index.js"]
