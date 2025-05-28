#!/usr/bin/env python

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
import threading
import os
import sys
import time

# Get port from environment or use default
PORT = int(os.environ.get('PORT', 8000))

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"Received GET request: {self.path}")
        
        if self.path == '/health' or self.path == '/health/':
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = json.dumps({"status": "ok"})
            self.wfile.write(response.encode())
        else:
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            response = json.dumps({"status": "ok", "message": "Railway health check server"})
            self.wfile.write(response.encode())

    def do_OPTIONS(self):
        print(f"Received OPTIONS request: {self.path}")
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        
    def log_message(self, format, *args):
        """Override to control server logging"""
        print(f"{self.address_string()} - {format % args}")

def run_server():
    server = HTTPServer(("0.0.0.0", PORT), HealthHandler)
    print(f"Starting health check server on port {PORT}")
    server.serve_forever()

if __name__ == "__main__":
    run_server() 