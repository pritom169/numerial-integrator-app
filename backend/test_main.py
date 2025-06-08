"""
Unit Tests for Numerical Integration Backend
===========================================

Comprehensive test suite for the integration service,
strategies, and WebSocket functionality.
"""

import pytest
import numpy as np
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
import json

from main import (
    app, IntegrationService, IntegrationRequest, IntegrationMethod,
    TrapezoidalIntegration, SimpsonIntegration, MidpointIntegration,
    MonteCarloIntegration, ConnectionManager
)

# Test client
client = TestClient(app)

class TestIntegrationStrategies:
    """Test suite for integration strategies"""
    
    def test_trapezoidal_integration_linear(self):
        """Test trapezoidal rule with linear function"""
        strategy = TrapezoidalIntegration()
        func = lambda x: 2*x + 1  # f(x) = 2x + 1
        
        result, x_vals, y_vals, error = strategy.integrate(func, 0, 1, 100)
        
        # Analytical result: integral of 2x + 1 from 0 to 1 = x^2 + x |_0^1 = 2
        assert abs(result - 2.0) < 0.001
        assert len(x_vals) == 100
        assert len(y_vals) == 100
        assert error is not None
    
    def test_trapezoidal_integration_quadratic(self):
        """Test trapezoidal rule with quadratic function"""
        strategy = TrapezoidalIntegration()
        func = lambda x: x**2
        
        result, _, _, _ = strategy.integrate(func, 0, 1, 1000)
        
        # Analytical result: integral of x^2 from 0 to 1 = x^3/3 |_0^1 = 1/3
        assert abs(result - 1/3) < 0.001
    
    def test_simpson_integration_cubic(self):
        """Test Simpson's rule with cubic function"""
        strategy = SimpsonIntegration()
        func = lambda x: x**3
        
        result, x_vals, y_vals, error = strategy.integrate(func, 0, 2, 101)
        
        # Analytical result: integral of x^3 from 0 to 2 = x^4/4 |_0^2 = 4
        assert abs(result - 4.0) < 0.001
        assert len(x_vals) == 101  # Simpson's rule needs odd number
    
    def test_midpoint_integration_sine(self):
        """Test midpoint rule with sine function"""
        strategy = MidpointIntegration()
        func = lambda x: np.sin(x)
        
        result, x_vals, y_vals, _ = strategy.integrate(func, 0, np.pi, 100)
        
        # Analytical result: integral of sin(x) from 0 to pi = 2
        assert abs(result - 2.0) < 0.01
        assert len(x_vals) == 101  # Includes boundary points for visualization
    
    def test_monte_carlo_integration_constant(self):
        """Test Monte Carlo integration with constant function"""
        strategy = MonteCarloIntegration()
        func = lambda x: 5  # Constant function
        
        # Set seed for reproducibility
        np.random.seed(42)
        result, _, _, _ = strategy.integrate(func, 0, 1, 1000)
        
        # Analytical result: integral of 5 from 0 to 1 = 5
        assert abs(result - 5.0) < 0.1  # Monte Carlo has higher variance
    
    def test_monte_carlo_error_estimate(self):
        """Test Monte Carlo error estimate"""
        strategy = MonteCarloIntegration()
        func = lambda x: x**2
        
        _, _, _, error = strategy.integrate(func, 0, 1, 100)
        
        assert error is not None
        assert error > 0  # Standard error should be positive

class TestIntegrationService:
    """Test suite for integration service"""
    
    @pytest.fixture
    def service(self):
        return IntegrationService()
    
    def test_create_function_simple(self, service):
        """Test creating simple functions from strings"""
        func = service.create_function("x**2")
        assert func(2) == 4
        assert func(3) == 9
    
    def test_create_function_with_math(self, service):
        """Test creating functions with math operations"""
        func = service.create_function("sin(x) + cos(x)")
        result = func(0)
        assert abs(result - 1.0) < 0.001  # sin(0) + cos(0) = 0 + 1 = 1
    
    def test_create_function_with_constants(self, service):
        """Test creating functions with mathematical constants"""
        func = service.create_function("pi * x")
        assert abs(func(1) - np.pi) < 0.001
    
    def test_create_function_invalid(self, service):
        """Test invalid function expressions"""
        with pytest.raises(ValueError):
            service.create_function("import os")  # Security test
        
        with pytest.raises(ValueError):
            service.create_function("x +")  # Syntax error
    
    def test_integrate_trapezoidal(self, service):
        """Test integration service with trapezoidal method"""
        request = IntegrationRequest(
            function="x**2",
            lower_bound=0,
            upper_bound=1,
            num_points=100,
            method=IntegrationMethod.TRAPEZOIDAL
        )
        
        result = service.integrate(request)
        
        assert abs(result.value - 1/3) < 0.01
        assert result.method == "trapezoidal"
        assert result.num_points == 100
        assert len(result.x_values) == 100
        assert len(result.y_values) == 100
    
    def test_integrate_all_methods(self, service):
        """Test all integration methods produce reasonable results"""
        methods = [
            IntegrationMethod.TRAPEZOIDAL,
            IntegrationMethod.SIMPSON,
            IntegrationMethod.MIDPOINT,
            IntegrationMethod.MONTE_CARLO
        ]
        
        for method in methods:
            request = IntegrationRequest(
                function="x",
                lower_bound=0,
                upper_bound=1,
                num_points=100,
                method=method
            )
            
            result = service.integrate(request)
            
            # Integral of x from 0 to 1 = 0.5
            assert abs(result.value - 0.5) < 0.1, f"Failed for method {method}"

class TestConnectionManager:
    """Test suite for WebSocket connection manager"""
    
    @pytest.mark.asyncio
    async def test_connect_disconnect(self):
        """Test connecting and disconnecting WebSocket"""
        manager = ConnectionManager()
        mock_websocket = AsyncMock()
        
        # Mock the accept method
        mock_websocket.accept = AsyncMock()
        
        await manager.connect(mock_websocket)
        assert len(manager.active_connections) == 1
        
        manager.disconnect(mock_websocket)
        assert len(manager.active_connections) == 0
    
    @pytest.mark.asyncio
    async def test_broadcast(self):
        """Test broadcasting to multiple connections"""
        manager = ConnectionManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        # Mock the accept and send_json methods
        mock_ws1.accept = AsyncMock()
        mock_ws2.accept = AsyncMock()
        mock_ws1.send_json = AsyncMock()
        mock_ws2.send_json = AsyncMock()
        
        await manager.connect(mock_ws1)
        await manager.connect(mock_ws2)
        
        message = {"type": "test", "data": "hello"}
        await manager.broadcast(message)
        
        mock_ws1.send_json.assert_called_once_with(message)
        mock_ws2.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_broadcast_with_failed_connection(self):
        """Test broadcasting when one connection fails"""
        manager = ConnectionManager()
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        # Mock the accept method
        mock_ws1.accept = AsyncMock()
        mock_ws2.accept = AsyncMock()
        
        # Make ws1 fail on send_json
        mock_ws1.send_json = AsyncMock(side_effect=Exception("Connection failed"))
        mock_ws2.send_json = AsyncMock()
        
        await manager.connect(mock_ws1)
        await manager.connect(mock_ws2)
        
        message = {"type": "test", "data": "hello"}
        await manager.broadcast(message)
        
        # ws1 should be removed from active connections due to failure
        assert len(manager.active_connections) == 1
        assert mock_ws2 in manager.active_connections
        mock_ws2.send_json.assert_called_once_with(message)

class TestRESTEndpoints:
    """Test suite for REST endpoints"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_integrate_endpoint(self):
        """Test REST integration endpoint"""
        request_data = {
            "function": "x**2",
            "lower_bound": 0,
            "upper_bound": 1,
            "num_points": 100,
            "method": "trapezoidal"
        }
        
        response = client.post("/integrate", json=request_data)
        assert response.status_code == 200
        
        result = response.json()
        assert "value" in result
        assert abs(result["value"] - 1/3) < 0.01
        assert result["method"] == "trapezoidal"

class TestWebSocketEndpoint:
    """Test suite for WebSocket functionality"""
    
    def test_websocket_integration(self):
        """Test WebSocket integration request"""
        with client.websocket_connect("/ws") as websocket:
            # Send integration request
            request_data = {
                "function": "x",
                "lower_bound": 0,
                "upper_bound": 1,
                "num_points": 50,
                "method": "trapezoidal"
            }
            
            websocket.send_text(json.dumps(request_data))
            
            # Receive result
            data = websocket.receive_json()
            assert data["type"] == "result"
            assert "data" in data
            assert abs(data["data"]["value"] - 0.5) < 0.01
    
    def test_websocket_error_handling(self):
        """Test WebSocket error handling"""
        with client.websocket_connect("/ws") as websocket:
            # Send invalid request
            request_data = {
                "function": "invalid syntax here",
                "lower_bound": 0,
                "upper_bound": 1,
                "num_points": 50,
                "method": "trapezoidal"
            }
            
            websocket.send_text(json.dumps(request_data))
            
            # Should receive error
            data = websocket.receive_json()
            assert data["type"] == "error"
            assert "message" in data

class TestEdgeCases:
    """Test suite for edge cases and boundary conditions"""
    
    @pytest.fixture
    def service(self):
        return IntegrationService()
    
    def test_zero_interval(self, service):
        """Test integration over zero-length interval"""
        request = IntegrationRequest(
            function="x**2",
            lower_bound=1,
            upper_bound=1,
            num_points=10,
            method=IntegrationMethod.TRAPEZOIDAL
        )
        
        result = service.integrate(request)
        assert result.value == 0
    
    def test_negative_bounds(self, service):
        """Test integration with negative bounds"""
        request = IntegrationRequest(
            function="x",
            lower_bound=-1,
            upper_bound=1,
            num_points=100,
            method=IntegrationMethod.TRAPEZOIDAL
        )
        
        result = service.integrate(request)
        # Integral of x from -1 to 1 = 0 (odd function)
        assert abs(result.value) < 0.01
    
    def test_reversed_bounds(self, service):
        """Test integration with reversed bounds"""
        request = IntegrationRequest(
            function="x",
            lower_bound=1,
            upper_bound=0,
            num_points=100,
            method=IntegrationMethod.TRAPEZOIDAL
        )
        
        result = service.integrate(request)
        # Should be negative of normal integral
        assert abs(result.value + 0.5) < 0.01

if __name__ == "__main__":
    pytest.main([__file__, "-v"])