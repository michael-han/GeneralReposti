FROM node:14

USER node
WORKDIR /home/node/app
COPY package*.json .
RUN npm ci
COPY . .

CMD ["npm", "start"]