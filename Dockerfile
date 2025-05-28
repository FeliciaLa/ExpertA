FROM node:18-alpine

WORKDIR /app

# Create a simple server.js file
RUN echo 'const express = require("express");\n\
const cors = require("cors");\n\
const app = express();\n\
const PORT = process.env.PORT || 8000;\n\
\n\
// Enable CORS for all routes\n\
app.use(cors({\n\
  origin: "*",\n\
  methods: ["GET", "POST", "OPTIONS"],\n\
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"]\n\
}));\n\
\n\
// Health check endpoint\n\
app.get("/health", (req, res) => {\n\
  res.json({ status: "ok" });\n\
});\n\
\n\
// Mock experts endpoint\n\
app.get("/api/public-experts", (req, res) => {\n\
  const experts = [\n\
    {\n\
      id: "3ce3731a-cc37-4fd8-a3e2-ec34dc8b83b2",\n\
      name: "Flu1",\n\
      email: "f@lu1.com",\n\
      specialties: "\\n\\nMethodologies: \\nTools & Technologies: ",\n\
      bio: "hhhh",\n\
      title: "Marketing expert",\n\
      profile_image: "/media/profile_images/London_Skyline_125508655.jpeg"\n\
    },\n\
    {\n\
      id: "a3823504-6333-487a-9b31-e1ee24bebb11",\n\
      name: "fla1",\n\
      email: "f@la.com",\n\
      specialties: "",\n\
      bio: "",\n\
      title: "",\n\
      profile_image: null\n\
    }\n\
  ];\n\
  res.json(experts);\n\
});\n\
\n\
// Mock experts endpoint with trailing slash\n\
app.get("/api/public-experts/", (req, res) => {\n\
  const experts = [\n\
    {\n\
      id: "3ce3731a-cc37-4fd8-a3e2-ec34dc8b83b2",\n\
      name: "Flu1",\n\
      email: "f@lu1.com",\n\
      specialties: "\\n\\nMethodologies: \\nTools & Technologies: ",\n\
      bio: "hhhh",\n\
      title: "Marketing expert",\n\
      profile_image: "/media/profile_images/London_Skyline_125508655.jpeg"\n\
    },\n\
    {\n\
      id: "a3823504-6333-487a-9b31-e1ee24bebb11",\n\
      name: "fla1",\n\
      email: "f@la.com",\n\
      specialties: "",\n\
      bio: "",\n\
      title: "",\n\
      profile_image: null\n\
    }\n\
  ];\n\
  res.json(experts);\n\
});\n\
\n\
// Start the server\n\
app.listen(PORT, () => {\n\
  console.log(`Server running on port ${PORT}`);\n\
});' > /app/server.js

# Install express and cors
RUN npm init -y && npm install express cors

# Expose the port
EXPOSE 8000

# Start the server
CMD ["node", "server.js"] 