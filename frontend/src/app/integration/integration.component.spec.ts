import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IntegrationComponent } from './integration.component';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string) {
    // Mock sending data
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('IntegrationComponent', () => {
  let component: IntegrationComponent;
  let fixture: ComponentFixture<IntegrationComponent>;

  beforeEach(async () => {
    (window as any).WebSocket = MockWebSocket;

    await TestBed.configureTestingModule({
      imports: [IntegrationComponent, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(IntegrationComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    if (component['debounceTimer']) {
      clearTimeout(component['debounceTimer']);
    }
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default integration parameters', () => {
      expect(component.integrationParams).toEqual({
        function: 'x**2',
        lower_bound: 0,
        upper_bound: 1,
        num_points: 100,
        method: 'trapezoidal'
      });
    });

    it('should initialize connection state', () => {
      expect(component.isConnected).toBeFalse();
      expect(component.errorMessage).toBe('');
      expect(component.lastResult).toBeUndefined();
    });

    it('should call connectWebSocket on ngOnInit', () => {
      spyOn(component as any, 'connectWebSocket');
      component.ngOnInit();
      expect(component['connectWebSocket']).toHaveBeenCalled();
    });
  });

  describe('WebSocket Connection Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should establish connection successfully', fakeAsync(() => {
      spyOn(component as any, 'sendIntegrationRequest');
      tick();
      
      expect(component.isConnected).toBeTrue();
      expect(component.errorMessage).toBe('');
      expect(component['sendIntegrationRequest']).toHaveBeenCalled();
    }));

    it('should handle connection error', () => {
      const ws = component['ws'] as any;
      ws.simulateError();
      
      expect(component.isConnected).toBeFalse();
      expect(component.errorMessage).toBe('Failed to connect to WebSocket server');
    });

    it('should handle connection close', fakeAsync(() => {
      spyOn(component as any, 'connectWebSocket');
      
      const ws = component['ws'] as any;
      ws.close();
      
      expect(component.isConnected).toBeFalse();
      tick(3000);
      expect(component['connectWebSocket']).toHaveBeenCalledTimes(2);
    }));

    it('should handle result message', () => {
      const mockResult = {
        value: 0.333333,
        method: 'trapezoidal',
        num_points: 100,
        x_values: [0, 0.5, 1],
        y_values: [0, 0.25, 1],
        error_estimate: 0.001
      };

      const ws = component['ws'] as any;
      ws.simulateMessage({ type: 'result', data: mockResult });

      expect(component.lastResult).toEqual(mockResult);
    });

    it('should handle error message', () => {
      const errorMessage = 'Invalid function';
      const ws = component['ws'] as any;
      ws.simulateMessage({ type: 'error', message: errorMessage });

      expect(component.errorMessage).toBe(errorMessage);
    });

    it('should handle connection failure during initialization', () => {
      (window as any).WebSocket = class {
        constructor() {
          throw new Error('Connection failed');
        }
      };

      component['connectWebSocket']();

      expect(component.isConnected).toBeFalse();
      expect(component.errorMessage).toBe('Cannot establish WebSocket connection');
    });
  });

  describe('Parameter Change Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should debounce parameter changes', fakeAsync(() => {
      spyOn(component as any, 'sendIntegrationRequest');

      component.onParameterChange();
      component.onParameterChange();
      component.onParameterChange();

      expect(component['sendIntegrationRequest']).not.toHaveBeenCalled();

      tick(500);
      expect(component['sendIntegrationRequest']).toHaveBeenCalledTimes(1);
    }));

    it('should clear error message on parameter change', () => {
      component.errorMessage = 'Previous error';
      component.onParameterChange();
      expect(component.errorMessage).toBe('');
    });

    it('should cancel previous timer', fakeAsync(() => {
      spyOn(component as any, 'sendIntegrationRequest');

      component.onParameterChange();
      tick(250);
      component.onParameterChange();

      tick(250);
      expect(component['sendIntegrationRequest']).not.toHaveBeenCalled();

      tick(250);
      expect(component['sendIntegrationRequest']).toHaveBeenCalledTimes(1);
    }));
  });

  describe('Data Transmission', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should send request when WebSocket is open', () => {
      const ws = component['ws'] as any;
      spyOn(ws, 'send');

      component['sendIntegrationRequest']();

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(component.integrationParams));
    });

    it('should not send when WebSocket is closed', () => {
      const ws = component['ws'] as any;
      ws.readyState = MockWebSocket.CLOSED;
      spyOn(ws, 'send');

      component['sendIntegrationRequest']();

      expect(ws.send).not.toHaveBeenCalled();
    });

    it('should handle undefined WebSocket', () => {
      component['ws'] = undefined;
      expect(() => component['sendIntegrationRequest']()).not.toThrow();
    });
  });

  describe('Graph Points Generation', () => {
    beforeEach(() => {
      component.lastResult = {
        value: 0.333333,
        method: 'trapezoidal',
        num_points: 3,
        x_values: [0, 0.5, 1],
        y_values: [0, 0.25, 1],
        error_estimate: 0.001
      };
    });

    it('should generate graph points correctly', () => {
      const points = component.getGraphPoints();
      expect(points).toBeTruthy();
      expect(points).toContain(',');
      expect(points.split(' ').length).toBe(3);
    });

    it('should generate fill points', () => {
      const fillPoints = component.getFillPoints();
      expect(fillPoints).toBeTruthy();
      expect(fillPoints).toContain('40,160');
    });

    it('should return empty string when no result', () => {
      component.lastResult = undefined;
      expect(component.getGraphPoints()).toBe('');
      expect(component.getFillPoints()).toBe('');
    });

    it('should handle empty data arrays', () => {
      component.lastResult = {
        value: 0,
        method: 'trapezoidal',
        num_points: 0,
        x_values: [],
        y_values: []
      };

      expect(component.getGraphPoints()).toBe('');
      expect(component.getFillPoints()).toBe('');
    });

    it('should handle single point', () => {
      component.lastResult = {
        value: 1,
        method: 'trapezoidal',
        num_points: 1,
        x_values: [0.5],
        y_values: [0.25]
      };

      const points = component.getGraphPoints();
      expect(points).toBeTruthy();
      expect(points.split(' ').length).toBe(1);
    });

    it('should handle extreme values', () => {
      component.lastResult = {
        value: 1e10,
        method: 'trapezoidal',
        num_points: 2,
        x_values: [-1e6, 1e6],
        y_values: [-1e12, 1e12]
      };

      const points = component.getGraphPoints();
      expect(points).toBeTruthy();
      expect(points).not.toContain('NaN');
      expect(points).not.toContain('Infinity');
    });

    it('should handle identical min/max values', () => {
      component.lastResult = {
        value: 5,
        method: 'trapezoidal',
        num_points: 3,
        x_values: [1, 1, 1],
        y_values: [5, 5, 5]
      };

      expect(() => component.getGraphPoints()).not.toThrow();
    });
  });

  describe('Status Management', () => {
    it('should return error status class', () => {
      component.errorMessage = 'Some error';
      expect(component.getStatusClass()).toBe('status-error');
    });

    it('should return connected status class', () => {
      component.isConnected = true;
      component.errorMessage = '';
      expect(component.getStatusClass()).toBe('status-connected');
    });

    it('should return connecting status class', () => {
      component.isConnected = false;
      component.errorMessage = '';
      expect(component.getStatusClass()).toBe('status-connecting');
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup on destroy', () => {
      const mockWs = { close: jasmine.createSpy('close') };
      component['ws'] = mockWs as any;
      component['debounceTimer'] = setTimeout(() => {}, 1000) as any;

      spyOn(window, 'clearTimeout');

      component.ngOnDestroy();

      expect(mockWs.close).toHaveBeenCalled();
      expect(clearTimeout).toHaveBeenCalled();
    });

    it('should handle destroy when no WebSocket', () => {
      component['ws'] = undefined;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle destroy when no timer', () => {
      component['debounceTimer'] = undefined;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON messages', () => {
      const ws = component['ws'] as any;
      
      expect(() => {
        if (ws.onmessage) {
          ws.onmessage(new MessageEvent('message', { data: 'invalid json' }));
        }
      }).toThrow();
    });

    it('should handle unknown message type', () => {
      const ws = component['ws'] as any;
      ws.simulateMessage({ type: 'unknown', data: 'test' });

      expect(component.lastResult).toBeUndefined();
      expect(component.errorMessage).toBe('');
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = {
        value: 1,
        method: 'trapezoidal',
        num_points: 1000,
        x_values: Array.from({ length: 1000 }, (_, i) => i / 1000),
        y_values: Array.from({ length: 1000 }, (_, i) => Math.sin(i / 1000))
      };

      component.lastResult = largeDataset;

      const startTime = performance.now();
      const points = component.getGraphPoints();
      const endTime = performance.now();

      expect(points).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should clean up timers to prevent memory leaks', fakeAsync(() => {
      spyOn(window, 'clearTimeout');

      component.onParameterChange();
      component.onParameterChange();

      tick(600);

      expect(clearTimeout).toHaveBeenCalled();
    }));
  });

  describe('Parameter Updates', () => {
    it('should update function parameter', () => {
      component.integrationParams.function = 'sin(x)';
      expect(component.integrationParams.function).toBe('sin(x)');
    });

    it('should update bounds', () => {
      component.integrationParams.lower_bound = -1;
      component.integrationParams.upper_bound = 2;
      expect(component.integrationParams.lower_bound).toBe(-1);
      expect(component.integrationParams.upper_bound).toBe(2);
    });

    it('should update number of points', () => {
      component.integrationParams.num_points = 200;
      expect(component.integrationParams.num_points).toBe(200);
    });

    it('should update integration method', () => {
      component.integrationParams.method = 'simpson';
      expect(component.integrationParams.method).toBe('simpson');
    });
  });

  describe('Result Handling', () => {
    it('should handle complete integration result', () => {
      const result = {
        value: 0.5,
        method: 'simpson',
        num_points: 50,
        x_values: [0, 1],
        y_values: [0, 1],
        error_estimate: 0.001
      };

      component['handleIntegrationResult'](result);
      expect(component.lastResult).toEqual(result);
    });

    it('should handle result without error estimate', () => {
      const result = {
        value: 0.5,
        method: 'midpoint',
        num_points: 50,
        x_values: [0, 1],
        y_values: [0, 1]
      };

      component['handleIntegrationResult'](result);
      expect(component.lastResult).toEqual(result);
    });
  });
});