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
  template: `
    <div class="container">
      <h1>Numerical Integration Calculator</h1>
      
      <div class="integration-form">
        <h2>∫ f(x) dx</h2>
        
        <div class="input-group">
          <label for="function">Function f(x):</label>
          <input 
            id="function"
            type="text" 
            [(ngModel)]="integrationParams.function"
            placeholder="e.g., x**2, sin(x), exp(x)"
            (input)="onParameterChange()"
          />
        </div>
        
        <div class="bounds-group">
          <div class="input-group">
            <label for="lower">Lower bound (a):</label>
            <input 
              id="lower"
              type="number" 
              [(ngModel)]="integrationParams.lower_bound"
              step="0.1"
              (input)="onParameterChange()"
            />
          </div>
          
          <div class="input-group">
            <label for="upper">Upper bound (b):</label>
            <input 
              id="upper"
              type="number" 
              [(ngModel)]="integrationParams.upper_bound"
              step="0.1"
              (input)="onParameterChange()"
            />
          </div>
        </div>
        
        <div class="settings-group">
          <div class="input-group">
            <label for="points">Number of points:</label>
            <input 
              id="points"
              type="number" 
              [(ngModel)]="integrationParams.num_points"
              min="10"
              max="1000"
              step="10"
              (input)="onParameterChange()"
            />
          </div>
          
          <div class="input-group">
            <label for="method">Integration method:</label>
            <select 
              id="method"
              [(ngModel)]="integrationParams.method"
              (change)="onParameterChange()"
            >
              <option value="trapezoidal">Trapezoidal Rule</option>
              <option value="simpson">Simpson's Rule</option>
              <option value="midpoint">Midpoint Rule</option>
              <option value="monte_carlo">Monte Carlo</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="graph-section" *ngIf="lastResult">
        <h2>f(x) = {{ integrationParams.function }}</h2>
        <div class="result-info">
          <span><strong>∫ f(x) dx = {{ lastResult.value.toFixed(6) }}</strong></span>
          <span>Method: {{ lastResult.method }} | Points: {{ lastResult.num_points }}</span>
        </div>
        
        <div class="graph-container">
          <svg class="function-graph" viewBox="0 0 400 200">
            <!-- Grid lines -->
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            <!-- Axes -->
            <line x1="40" y1="160" x2="360" y2="160" stroke="#333" stroke-width="1" />
            <line x1="40" y1="20" x2="40" y2="160" stroke="#333" stroke-width="1" />
            
            <!-- Function curve -->
            <polyline 
              [attr.points]="getGraphPoints()" 
              fill="none" 
              stroke="#007bff" 
              stroke-width="2"
            />
            
            <!-- Fill area under curve -->
            <polygon 
              [attr.points]="getFillPoints()" 
              fill="rgba(0, 123, 255, 0.2)" 
              stroke="none"
            />
            
            <!-- Axis labels -->
            <text x="200" y="185" text-anchor="middle" font-size="12" fill="#666">
              x: [{{ integrationParams.lower_bound }}, {{ integrationParams.upper_bound }}]
            </text>
            <text x="25" y="95" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90, 25, 95)">
              f(x)
            </text>
          </svg>
        </div>
      </div>
      
      <div class="status-bar">
        <span [class]="getStatusClass()">
          {{ errorMessage || (isConnected ? 'Connected to server' : 'Connecting to server...') }}
        </span>
      </div>
      
      <div class="reference-section">
        <h3>Function Reference</h3>
        <div class="reference-grid">
          <div class="ref-item">
            <strong>Basic operations:</strong>
            <span>+, -, *, /, ** (power)</span>
          </div>
          <div class="ref-item">
            <strong>Math functions:</strong>
            <span>sin(x), cos(x), tan(x), exp(x), log(x), sqrt(x)</span>
          </div>
          <div class="ref-item">
            <strong>Constants:</strong>
            <span>pi, e</span>
          </div>
          <div class="ref-item">
            <strong>Examples:</strong>
            <span>x**2 + 3*x + 1, sin(x)*cos(x), exp(-x**2)</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Courier New', monospace;
      background-color: #f8f9fa;
      min-height: 100vh;
    }
    
    h1 {
      text-align: center;
      color: #333;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    
    h2 {
      color: #555;
      margin-bottom: 15px;
      font-size: 1.3em;
    }
    
    h3 {
      color: #666;
      margin-bottom: 10px;
      font-size: 1.1em;
    }
    
    .integration-form {
      background-color: white;
      border: 2px solid #333;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .input-group {
      margin-bottom: 15px;
    }
    
    .bounds-group, .settings-group {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }
    
    .bounds-group .input-group,
    .settings-group .input-group {
      flex: 1;
      margin-bottom: 0;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #333;
    }
    
    input, select {
      width: 100%;
      padding: 8px;
      border: 1px solid #333;
      background-color: white;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      box-sizing: border-box;
    }
    
    input:focus, select:focus {
      outline: 2px solid #666;
      background-color: #f0f0f0;
    }
    
    .graph-section {
      background-color: white;
      border: 2px solid #333;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .result-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f0f0f0;
      border: 1px solid #333;
      font-weight: bold;
    }
    
    .graph-container {
      width: 100%;
      height: 250px;
      border: 1px solid #333;
      background-color: #fafafa;
    }
    
    .function-graph {
      width: 100%;
      height: 100%;
    }
    
    .status-bar {
      text-align: center;
      padding: 10px;
      margin-bottom: 20px;
      border: 1px solid #333;
      background-color: white;
    }
    
    .status-connected {
      color: #006600;
      font-weight: bold;
    }
    
    .status-error {
      color: #cc0000;
      font-weight: bold;
    }
    
    .status-connecting {
      color: #ff8800;
      font-weight: bold;
    }
    
    .reference-section {
      background-color: white;
      border: 2px solid #333;
      padding: 20px;
    }
    
    .reference-grid {
      display: grid;
      gap: 10px;
    }
    
    .ref-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background-color: #f8f9fa;
      border: 1px solid #ddd;
    }
    
    .ref-item strong {
      color: #333;
    }
    
    @media (max-width: 600px) {
      .bounds-group, .settings-group {
        flex-direction: column;
      }
      
      .result-info {
        flex-direction: column;
        gap: 10px;
        text-align: center;
      }
      
      .ref-item {
        flex-direction: column;
        gap: 5px;
      }
    }
  `]
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