FROM node:22-alpine
WORKDIR /app
COPY server/package.json ./package.json
COPY server/src ./src
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "src/index.mjs"]
