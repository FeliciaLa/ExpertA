FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Create a simple configuration file with CORS headers
RUN echo 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    \n\
    # Add CORS headers for all responses\n\
    add_header Access-Control-Allow-Origin "*";\n\
    add_header Access-Control-Allow-Methods "GET, OPTIONS";\n\
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, Cache-Control, Pragma";\n\
    add_header Content-Type "application/json";\n\
    \n\
    # Health check endpoint\n\
    location /health {\n\
        default_type application/json;\n\
        return 200 \'{"status": "ok"}\';\n\
    }\n\
    \n\
    # Public experts API endpoint\n\
    location /api/public-experts {\n\
        default_type application/json;\n\
        return 200 \'[{"id":"3ce3731a-cc37-4fd8-a3e2-ec34dc8b83b2","name":"Flu1","email":"f@lu1.com","specialties":"Methodologies and Tools","bio":"Marketing expert bio","title":"Marketing expert","profile_image":null},{"id":"a3823504-6333-487a-9b31-e1ee24bebb11","name":"fla1","email":"f@la.com","specialties":"","bio":"","title":"","profile_image":null}]\';\n\
    }\n\
    \n\
    # Experts API endpoint\n\
    location /api/experts {\n\
        default_type application/json;\n\
        return 200 \'[{"id":"3ce3731a-cc37-4fd8-a3e2-ec34dc8b83b2","name":"Flu1","email":"f@lu1.com","specialties":"Methodologies and Tools","bio":"Marketing expert bio","title":"Marketing expert","profile_image":null},{"id":"a3823504-6333-487a-9b31-e1ee24bebb11","name":"fla1","email":"f@la.com","specialties":"","bio":"","title":"","profile_image":null}]\';\n\
    }\n\
    \n\
    # API root\n\
    location /api {\n\
        default_type application/json;\n\
        return 200 \'{"status":"ok","message":"ExpertA API"}\';\n\
    }\n\
    \n\
    # Default route\n\
    location / {\n\
        default_type application/json;\n\
        return 200 \'{"status":"ok","service":"ExpertA Backend"}\';\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"] 