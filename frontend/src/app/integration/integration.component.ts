import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface IntegrationRequest {
  function: string;
  lower_bound: number;
  upper_bound: number;
  num_points: number;
  method: string;
}

interface IntegrationResult {
  value: number;
  method: string;
  num_points: number;
  x_values: number[];
  y_values: number[];
  error_estimate?: number;
}

@Component({
  selector: 'app-integration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './integration.component.html',
  styleUrls: ['./integration.component.css']
})
export class IntegrationComponent implements OnInit, OnDestroy {
  private ws?: WebSocket;
  private debounceTimer?: number;
  
  integrationParams: IntegrationRequest = {
    function: 'x**2',
    lower_bound: 0,
    upper_bound: 1,
    num_points: 100,
    method: 'trapezoidal'
  };
  
  lastResult?: IntegrationResult;
  isConnected = false;
  errorMessage = '';
  
  ngOnInit() {
    this.connectWebSocket();
  }
  
  ngOnDestroy() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
  
  private connectWebSocket() {
    try {
      this.ws = new WebSocket('ws://localhost:8000/ws');
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.errorMessage = '';
        this.sendIntegrationRequest();
      };
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'result') {
          this.handleIntegrationResult(message.data);
        } else if (message.type === 'error') {
          this.errorMessage = message.message;
        }
      };
      
      this.ws.onclose = () => {
        this.isConnected = false;
        setTimeout(() => this.connectWebSocket(), 3000);
      };
      
      this.ws.onerror = () => {
        this.errorMessage = 'Failed to connect to WebSocket server';
        this.isConnected = false;
      };
      
    } catch (error) {
      this.errorMessage = 'Cannot establish WebSocket connection';
      this.isConnected = false;
    }
  }
  
  onParameterChange() {
    this.errorMessage = '';
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      this.sendIntegrationRequest();
    }, 500);
  }
  
  private sendIntegrationRequest() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(this.integrationParams));
    }
  }
  
  private handleIntegrationResult(result: IntegrationResult) {
    this.lastResult = result;
  }
  
  getGraphPoints(): string {
    if (!this.lastResult) return '';
    
    const xValues = this.lastResult.x_values;
    const yValues = this.lastResult.y_values;
    
    if (xValues.length === 0) return '';
    
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    // Graph dimensions (leaving margin for axes)
    const graphWidth = 320; // 360 - 40
    const graphHeight = 140; // 160 - 20
    const offsetX = 40;
    const offsetY = 20;
    
    // Convert data points to SVG coordinates
    const points = xValues.map((x, i) => {
      const svgX = offsetX + ((x - minX) / (maxX - minX)) * graphWidth;
      const svgY = offsetY + (1 - (yValues[i] - minY) / (maxY - minY)) * graphHeight;
      return `${svgX},${svgY}`;
    });
    
    return points.join(' ');
  }
  
  getFillPoints(): string {
    if (!this.lastResult) return '';
    
    const graphPoints = this.getGraphPoints();
    if (!graphPoints) return '';
    
    const xValues = this.lastResult.x_values;
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    
    const offsetX = 40;
    const baseY = 160; // x-axis position
    
    // Start from bottom-left, trace the curve, then back to bottom-right
    const startX = offsetX;
    const endX = offsetX + 320;
    
    return `${startX},${baseY} ${graphPoints} ${endX},${baseY}`;
  }
  
  getStatusClass(): string {
    if (this.errorMessage) return 'status-error';
    if (this.isConnected) return 'status-connected';
    return 'status-connecting';
  }
}