FROM node:20-alpine

WORKDIR /app

# Use the pnpm lockfile already checked into the repo so the image matches the
# dependency tree used by the project and by the restored node_modules volume.
# Pin pnpm to a Node 20-compatible major; corepack otherwise resolves pnpm 11.
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
