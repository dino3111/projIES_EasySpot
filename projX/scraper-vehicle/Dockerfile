FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4100

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4100/healthz || exit 1

CMD ["npm", "start"]
