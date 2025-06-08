"""
Numerical Integration Backend Service
====================================

A FastAPI-based backend service for performing numerical integration
with real-time updates via WebSocket.

Architecture:
- FastAPI for async web framework
- WebSocket for real-time communication
- Clean separation of concerns with service layers
- Dependency injection for testability
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Callable, Optional
import asyncio
import json
import numpy as np
from abc import ABC, abstractmethod
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Models
class IntegrationMethod(str, Enum):
    """Supported numerical integration methods"""
    TRAPEZOIDAL = "trapezoidal"
    SIMPSON = "simpson"
    MIDPOINT = "midpoint"
    MONTE_CARLO = "monte_carlo"

class IntegrationRequest(BaseModel):
    """Request model for integration parameters"""
    function: str = Field(..., description="Mathematical function as string (e.g., 'x**2')")
    lower_bound: float = Field(..., description="Lower bound of integration")
    upper_bound: float = Field(..., description="Upper bound of integration")
    num_points: int = Field(100, ge=10, le=10000, description="Number of integration points")
    method: IntegrationMethod = Field(IntegrationMethod.TRAPEZOIDAL, description="Integration method")

class IntegrationResult(BaseModel):
    """Result model for integration output"""
    value: float
    method: str
    num_points: int
    x_values: List[float]
    y_values: List[float]
    error_estimate: Optional[float] = None

# Abstract Integration Strategy
class IntegrationStrategy(ABC):
    """Abstract base class for integration strategies"""
    
    @abstractmethod
    def integrate(self, func: Callable, a: float, b: float, n: int) -> tuple:
        """
        Perform numerical integration
        
        Args:
            func: Function to integrate
            a: Lower bound
            b: Upper bound
            n: Number of points
            
        Returns:
            Tuple of (result, x_values, y_values, error_estimate)
        """
        pass

# Concrete Integration Strategies
class TrapezoidalIntegration(IntegrationStrategy):
    """Trapezoidal rule implementation"""
    
    def integrate(self, func: Callable, a: float, b: float, n: int) -> tuple:
        x = np.linspace(a, b, n)
        y = np.array([func(xi) for xi in x])
        h = (b - a) / (n - 1)
        
        # Trapezoidal rule
        result = h * (0.5 * y[0] + np.sum(y[1:-1]) + 0.5 * y[-1])
        
        # Error estimate (second derivative approximation)
        if n > 2:
            second_deriv_approx = np.abs(y[2] - 2*y[1] + y[0]) / h**2
            error_estimate = (b - a)**3 * second_deriv_approx / (12 * n**2)
        else:
            error_estimate = None
            
        return result, x.tolist(), y.tolist(), error_estimate

class SimpsonIntegration(IntegrationStrategy):
    """Simpson's rule implementation"""
    
    def integrate(self, func: Callable, a: float, b: float, n: int) -> tuple:
        # Ensure n is odd for Simpson's rule
        if n % 2 == 0:
            n += 1
            
        x = np.linspace(a, b, n)
        y = np.array([func(xi) for xi in x])
        h = (b - a) / (n - 1)
        
        # Simpson's 1/3 rule
        result = h/3 * (y[0] + y[-1] + 4*np.sum(y[1:-1:2]) + 2*np.sum(y[2:-1:2]))
        
        # Error estimate
        if n > 4:
            fourth_deriv_approx = np.abs(y[4] - 4*y[3] + 6*y[2] - 4*y[1] + y[0]) / h**4
            error_estimate = (b - a)**5 * fourth_deriv_approx / (180 * n**4)
        else:
            error_estimate = None
            
        return result, x.tolist(), y.tolist(), error_estimate

class MidpointIntegration(IntegrationStrategy):
    """Midpoint rule implementation"""
    
    def integrate(self, func: Callable, a: float, b: float, n: int) -> tuple:
        h = (b - a) / n
        x_mid = np.linspace(a + h/2, b - h/2, n)
        y_mid = np.array([func(xi) for xi in x_mid])
        
        result = h * np.sum(y_mid)
        
        # For visualization, include boundary points
        x = np.linspace(a, b, n + 1)
        y = np.array([func(xi) for xi in x])
        
        # Error estimate
        if n > 2:
            second_deriv_approx = np.abs(y[2] - 2*y[1] + y[0]) / h**2
            error_estimate = (b - a)**3 * second_deriv_approx / (24 * n**2)
        else:
            error_estimate = None
            
        return result, x.tolist(), y.tolist(), error_estimate

class MonteCarloIntegration(IntegrationStrategy):
    """Monte Carlo integration implementation"""
    
    def integrate(self, func: Callable, a: float, b: float, n: int) -> tuple:
        # Generate random points
        x_random = np.random.uniform(a, b, n)
        y_random = np.array([func(xi) for xi in x_random])
        
        # Monte Carlo estimate
        result = (b - a) * np.mean(y_random)
        
        # For visualization, sort points
        sorted_indices = np.argsort(x_random)
        x_sorted = x_random[sorted_indices]
        y_sorted = y_random[sorted_indices]
        
        # Error estimate (standard error)
        std_error = (b - a) * np.std(y_random) / np.sqrt(n)
        
        return result, x_sorted.tolist(), y_sorted.tolist(), std_error

# Integration Service
class IntegrationService:
    """Service layer for numerical integration"""
    
    def __init__(self):
        self.strategies: Dict[IntegrationMethod, IntegrationStrategy] = {
            IntegrationMethod.TRAPEZOIDAL: TrapezoidalIntegration(),
            IntegrationMethod.SIMPSON: SimpsonIntegration(),
            IntegrationMethod.MIDPOINT: MidpointIntegration(),
            IntegrationMethod.MONTE_CARLO: MonteCarloIntegration(),
        }
    
    def create_function(self, func_str: str) -> Callable:
        """
        Safely create a function from string expression
        
        Args:
            func_str: Mathematical expression as string
            
        Returns:
            Callable function
            
        Raises:
            ValueError: If function string is invalid
        """
        # Allowed names for safety
        allowed_names = {
            'sin': np.sin, 'cos': np.cos, 'tan': np.tan,
            'exp': np.exp, 'log': np.log, 'sqrt': np.sqrt,
            'pi': np.pi, 'e': np.e
        }
        
        try:
            # Create function - pass allowed_names as both globals and locals
            func_code = f"lambda x: {func_str}"
            func = eval(func_code, allowed_names, allowed_names)
            
            # Test the function
            func(0.0)
            
            return func
        except Exception as e:
            raise ValueError(f"Invalid function expression: {e}")
    
    def integrate(self, request: IntegrationRequest) -> IntegrationResult:
        """
        Perform numerical integration based on request
        
        Args:
            request: Integration parameters
            
        Returns:
            Integration result with visualization data
        """
        # Create function from string
        func = self.create_function(request.function)
        
        # Get appropriate strategy
        strategy = self.strategies[request.method]
        
        # Perform integration
        value, x_values, y_values, error_estimate = strategy.integrate(
            func, request.lower_bound, request.upper_bound, request.num_points
        )
        
        return IntegrationResult(
            value=value,
            method=request.method.value,
            num_points=request.num_points,
            x_values=x_values,
            y_values=y_values,
            error_estimate=error_estimate
        )

# WebSocket Connection Manager
class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Accept and store new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

# FastAPI Application
app = FastAPI(
    title="Numerical Integration API",
    description="Real-time numerical integration with WebSocket support",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Angular dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
integration_service = IntegrationService()
connection_manager = ConnectionManager()

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time integration updates"""
    await connection_manager.connect(websocket)
    
    try:
        while True:
            # Receive integration request
            data = await websocket.receive_text()
            request_data = json.loads(data)
            
            try:
                # Parse request
                request = IntegrationRequest(**request_data)
                
                # Perform integration
                result = integration_service.integrate(request)
                
                # Send result
                await websocket.send_json({
                    "type": "result",
                    "data": result.model_dump()
                })
                
                # Broadcast to all clients
                await connection_manager.broadcast({
                    "type": "update",
                    "data": result.model_dump()
                })
                
            except ValueError as e:
                # Send error message
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
                
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "numerical-integration"}

# REST endpoint for single integration (fallback)
@app.post("/integrate", response_model=IntegrationResult)
async def integrate(request: IntegrationRequest):
    """REST endpoint for numerical integration"""
    try:
        result = integration_service.integrate(request)
        return result
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        from fastapi import HTTPException
        logger.error(f"Unexpected error in integration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during integration")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)