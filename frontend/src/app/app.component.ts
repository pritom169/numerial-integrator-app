
import { Component } from '@angular/core';
import { IntegrationComponent } from './integration.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IntegrationComponent],
  template: `
    <app-integration></app-integration>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #e9ecef;
    }
  `]
})
export class AppComponent {
  title = 'frontend';
}