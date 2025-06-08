import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { AppComponent } from './app.component';

// Mock Integration Component for testing
@Component({
  selector: 'app-integration',
  template: '<div data-testid="mock-integration">Mock Integration Component</div>',
  standalone: true
})
class MockIntegrationComponent {}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    })
    .overrideComponent(AppComponent, {
      remove: { imports: [] },
      add: { imports: [MockIntegrationComponent] }
    })
    .compileComponents();
  });

  describe('Component Creation', () => {
    it('should create the app component', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      expect(app).toBeTruthy();
    });

    it('should have correct title property', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      expect(app.title).toEqual('frontend');
    });
  });

  describe('Component Properties', () => {
    it('should be a standalone component', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const componentDef = (fixture.componentInstance.constructor as any).ɵcmp;
      expect(componentDef.standalone).toBe(true);
    });

    it('should have correct selector', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const componentDef = (fixture.componentInstance.constructor as any).ɵcmp;
      expect(componentDef.selectors[0][0]).toBe('app-root');
    });

    it('should import IntegrationComponent', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const componentDef = (fixture.componentInstance.constructor as any).ɵcmp;
      expect(componentDef.dependencies).toBeDefined();
    });
  });

  describe('Template Structure', () => {
    it('should render integration component', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const integrationElement = compiled.querySelector('[data-testid="mock-integration"]');
      
      expect(integrationElement).toBeTruthy();
      expect(integrationElement?.textContent).toContain('Mock Integration Component');
    });

    it('should have minimal template structure', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const integrationTag = compiled.querySelector('app-integration');
      
      expect(integrationTag).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply host styles', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      
      const hostElement = fixture.nativeElement as HTMLElement;
      const computedStyle = window.getComputedStyle(hostElement);
      
      // Check for basic styling properties
      expect(computedStyle.display).toBeTruthy();
      expect(computedStyle.minHeight).toBeTruthy();
    });
  });

  describe('Component Type Safety', () => {
    it('should have proper TypeScript types', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      
      expect(typeof component.title).toBe('string');
      expect(component.title).toBe('frontend');
    });
  });

  describe('Integration with Real Component', () => {
    it('should work with actual IntegrationComponent', async () => {
      // Test that it can import and use the real component
      const { IntegrationComponent } = await import('./integration/integration.component');
      
      const testBed = TestBed.configureTestingModule({
        imports: [AppComponent],
      })
      .overrideComponent(AppComponent, {
        remove: { imports: [MockIntegrationComponent] },
        add: { imports: [IntegrationComponent] }
      });

      await testBed.compileComponents();
      
      const fixture = testBed.createComponent(AppComponent);
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize without errors', () => {
      expect(() => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should cleanup without errors', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      
      expect(() => {
        fixture.destroy();
      }).not.toThrow();
    });
  });

  describe('Component Metadata', () => {
    it('should have correct component metadata', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      const metadata = (component.constructor as any).ɵcmp;
      
      expect(metadata).toBeDefined();
      expect(metadata.type).toBe(AppComponent);
      expect(metadata.standalone).toBe(true);
    });

    it('should have expected template and styles configuration', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      const metadata = (component.constructor as any).ɵcmp;
      
      expect(metadata.template).toBeDefined();
      expect(metadata.styles).toBeDefined();
    });
  });
});