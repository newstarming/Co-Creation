FROM node:24-alpine
WORKDIR /app
COPY server.mjs stats.mjs ./
USER node
ENV PORT=8790 DB_FILE=/data/telemetry.sqlite
EXPOSE 8790
CMD ["node", "--disable-warning=ExperimentalWarning", "server.mjs"]
