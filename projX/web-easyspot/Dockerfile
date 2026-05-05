FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy only package files first for better caching
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Install dependencies (this layer is cached if package.json doesn't change)
# Use --frozen-lockfile to ensure exact versions and --unsafe-perm to allow build scripts
RUN CI=true pnpm install --frozen-lockfile --shamefully-hoist

# Copy the rest of the application
COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]