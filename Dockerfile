FROM node:18-alpine

WORKDIR /app

# Copy server file
COPY server.js ./

# Expose port 8000
EXPOSE 8000

# Start the server
CMD ["node", "server.js"] 