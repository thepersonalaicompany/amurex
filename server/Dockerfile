# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Add Redis installation
RUN apt-get update && apt-get install -y redis-server

# Copy the rest of the application
COPY . .

# Set environment variable for port
ENV PORT=8080

# Expose the port with proper host:container mapping
EXPOSE 8080:8080

# Command to run the application
CMD ["robyn", "index.py", "--processes", "2", "--log-level", "WARN"]
