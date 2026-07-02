FROM node:24.18.0-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3030

# Start the application
CMD ["npm", "start"]
