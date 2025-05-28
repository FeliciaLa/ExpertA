FROM node:18-alpine

WORKDIR /app

# Copy server file
COPY server.js package.json ./

# Expose port 8000
EXPOSE 8000

# Create a healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -qO- http://localhost:8000/health || exit 1

# Start the server
CMD ["node", "server.js"] 