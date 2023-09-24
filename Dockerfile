FROM node:18-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn
RUN yarn prisma

COPY . .

EXPOSE 8888
ENV PORT 8888

CMD yarn prisma && yarn dev
