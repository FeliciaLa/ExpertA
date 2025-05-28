FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy server file
COPY server.js ./

# Expose the port
EXPOSE 8000

# Start the server
CMD ["npm", "start"] 