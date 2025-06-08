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
      
      <div class="results-section" *ngIf="lastResult">
        <h2>Integration Result</h2>
        <div class="result-grid">
          <div class="result-item">
            <strong>∫ {{ integrationParams.function }} dx = {{ lastResult.value.toFixed(6) }}</strong>
          </div>
          <div class="result-item">
            <span>Method: {{ lastResult.method }}</span>
          </div>
          <div class="result-item">
            <span>Points used: {{ lastResult.num_points }}</span>
          </div>
          <div class="result-item" *ngIf="lastResult.error_estimate">
            <span>Error estimate: {{ lastResult.error_estimate.toFixed(8) }}</span>
          </div>
        </div>
      </div>
      
      <div class="visualization-section" *ngIf="lastResult">
        <h2>Function Visualization</h2>
        <div class="simple-chart">
          <div class="chart-header">
            <span>f(x) = {{ integrationParams.function }}</span>
            <span>Domain: [{{ integrationParams.lower_bound }}, {{ integrationParams.upper_bound }}]</span>
          </div>
          
          <div class="data-table">
            <table>
              <thead>
                <tr>
                  <th>x</th>
                  <th>f(x)</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let point of getSamplePoints(); let i = index">
                  <td>{{ point.x.toFixed(3) }}</td>
                  <td>{{ point.y.toFixed(6) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="ascii-plot" [innerHTML]="getAsciiPlot()"></div>
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
    
    .results-section {
      background-color: white;
      border: 2px solid #333;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .result-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .result-item {
      padding: 10px;
      background-color: #f8f9fa;
      border: 1px solid #ddd;
    }
    
    .visualization-section {
      background-color: white;
      border: 2px solid #333;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .chart-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f0f0f0;
      border: 1px solid #333;
      font-weight: bold;
    }
    
    .data-table {
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 20px;
      border: 1px solid #333;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Courier New', monospace;
    }
    
    th, td {
      padding: 8px;
      text-align: right;
      border-bottom: 1px solid #ddd;
    }
    
    th {
      background-color: #f0f0f0;
      font-weight: bold;
      position: sticky;
      top: 0;
    }
    
    .ascii-plot {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.2;
      white-space: pre;
      background-color: #f8f9fa;
      padding: 15px;
      border: 1px solid #333;
      overflow-x: auto;
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
      
      .result-grid {
        grid-template-columns: 1fr;
      }
      
      .chart-header {
        flex-direction: column;
        gap: 5px;
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
  
  getSamplePoints(): {x: number, y: number}[] {
    if (!this.lastResult) return [];
    
    const points = [];
    const step = Math.max(1, Math.floor(this.lastResult.x_values.length / 20));
    
    for (let i = 0; i < this.lastResult.x_values.length; i += step) {
      points.push({
        x: this.lastResult.x_values[i],
        y: this.lastResult.y_values[i]
      });
    }
    
    return points.slice(0, 10); // Show only first 10 points
  }
  
  getAsciiPlot(): string {
    if (!this.lastResult) return '';
    
    const width = 60;
    const height = 15;
    const xValues = this.lastResult.x_values;
    const yValues = this.lastResult.y_values;
    
    if (xValues.length === 0) return '';
    
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    // Create grid
    const grid: string[][] = [];
    for (let i = 0; i < height; i++) {
      grid[i] = new Array(width).fill(' ');
    }
    
    // Plot points
    for (let i = 0; i < xValues.length; i += Math.max(1, Math.floor(xValues.length / width))) {
      const x = Math.floor(((xValues[i] - minX) / (maxX - minX)) * (width - 1));
      const y = height - 1 - Math.floor(((yValues[i] - minY) / (maxY - minY)) * (height - 1));
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        grid[y][x] = '*';
      }
    }
    
    // Add axes
    const zeroY = height - 1 - Math.floor(((0 - minY) / (maxY - minY)) * (height - 1));
    if (zeroY >= 0 && zeroY < height) {
      for (let x = 0; x < width; x++) {
        if (grid[zeroY][x] === ' ') grid[zeroY][x] = '-';
      }
    }
    
    // Convert to string
    let plot = '';
    for (let y = 0; y < height; y++) {
      const yValue = maxY - (y / (height - 1)) * (maxY - minY);
      const yLabel = yValue.toFixed(2).padStart(8);
      plot += yLabel + '|' + grid[y].join('') + '\n';
    }
    
    // Add x-axis labels
    const xLabel = '        +' + '-'.repeat(width);
    plot += xLabel + '\n';
    plot += '         ' + minX.toFixed(2).padEnd(width - maxX.toFixed(2).length) + maxX.toFixed(2);
    
    return plot;
  }
  
  getStatusClass(): string {
    if (this.errorMessage) return 'status-error';
    if (this.isConnected) return 'status-connected';
    return 'status-connecting';
  }
}