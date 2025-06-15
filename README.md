# Full Stack Application Setup Documentation

This document provides instructions for running both the Angular frontend and Python FastAPI backend for the Numerical Integration application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Backend Setup (Python/FastAPI)](#backend-setup-pythonfastapi)
- [Frontend Setup (Angular)](#frontend-setup-angular)
- [Running the Full Application](#running-the-full-application)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: v18.19.1 or v20.11.1 or >=22.0.0
- **npm**: v6.11.0 or v7.5.6 or >=8.0.0
- **Python**: 3.12 or higher
- **Git**: For version control

### Verify Prerequisites

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Python version
python --version
# or
python3 --version
```

## Project Structure

```
project-root/
├── frontend/               # Angular frontend files
│   ├── src/
│   ├── package.json
│   ├── angular.json
│   └── README.md
├── backend/               # Python backend files
│   ├── main.py
│   ├── test_main.py
│   └── requirements.txt
└── README.md
```

## Backend Setup (Python/FastAPI)

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Virtual Environment

```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Backend Server

```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using Python directly
python main.py
```

The backend will be available at:

- **API**: http://localhost:8000
- **Interactive API Documentation**: http://localhost:8000/docs
- **WebSocket endpoint**: ws://localhost:8000/ws

### 5. Verify Backend is Running

```bash
# In a new terminal, test the health endpoint
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"numerical-integration"}
```

## Frontend Setup (Angular)

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
# Start Angular development server
npm start
# or
ng serve
```

The frontend will be available at:

- **Application**: http://localhost:4200

### 4. Build for Production (Optional)

```bash
npm run build
# Build artifacts will be in dist/frontend
```

## Running the Full Application

### Step-by-Step Process

1. **Start the Backend** (Terminal 1):

   ```bash
   cd backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the Frontend** (Terminal 2):

   ```bash
   cd frontend
   npm start
   ```

3. **Access the Application**:
   - Open your browser and navigate to http://localhost:4200
   - The frontend will automatically connect to the backend WebSocket

### Using Docker (Alternative)

If you prefer containerized deployment, create these files:

**backend/Dockerfile**:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**frontend/Dockerfile**:

```dockerfile
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

**docker-compose.yml** (in root directory):

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1

  frontend:
    build: ./frontend
    ports:
      - "4200:80"
    depends_on:
      - backend
```

Run with Docker Compose:

```bash
docker-compose up --build
```

## Testing

### Backend Tests

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run all tests
pytest

# Run with coverage
pytest --cov=main --cov-report=html

# Run specific test file
pytest test_main.py
```

### Frontend Tests

```bash
cd frontend

# Run unit tests
npm test

# Run tests with coverage
ng test --code-coverage

# Run e2e tests (if configured)
npm run e2e
```

## Troubleshooting

### Common Issues and Solutions

#### Backend Issues

1. **Port Already in Use**:

   ```bash
   # Find process using port 8000
   lsof -i :8000  # On macOS/Linux
   netstat -ano | findstr :8000  # On Windows

   # Kill the process or use a different port
   uvicorn main:app --reload --port 8001
   ```

2. **Module Import Errors**:

   ```bash
   # Ensure virtual environment is activated
   # Reinstall dependencies
   pip install -r requirements.txt --force-reinstall
   ```

3. **WebSocket Connection Failed**:
   - Check CORS settings in `main.py`
   - Ensure the frontend WebSocket URL matches backend address

#### Frontend Issues

1. **npm install Fails**:

   ```bash
   # Clear npm cache
   npm cache clean --force

   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Angular CLI Not Found**:

   ```bash
   # Install Angular CLI globally
   npm install -g @angular/cli
   ```

3. **CORS Errors**:
   - Verify backend CORS configuration allows `http://localhost:4200`
   - Check browser console for specific error messages
