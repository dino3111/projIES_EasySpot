FROM node:20-alpine

WORKDIR /app

# Copy only package files first for better caching
COPY package.json ./

# Install dependencies (this layer is cached if package.json doesn't change)
RUN npm install --no-audit --no-fund

# Copy the rest of the application
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
