FROM node:18-alpine

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn
RUN yarn prisma

# Copy our current project
COPY . .

EXPOSE 8888
ENV PORT 8888

CMD yarn prisma && yarn dev
