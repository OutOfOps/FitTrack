import { CommonModule } from '@angular/common';
import { Component, Input, NgModule } from '@angular/core';

@Component({
  selector: 'fit-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="fit-button"
      [attr.type]="type"
      [disabled]="disabled"
      [attr.aria-disabled]="disabled ? 'true' : null"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `:host{display:inline-block}`,
    `.fit-button{padding:0.75rem 1.75rem;border-radius:999px;border:none;background:linear-gradient(135deg,#0d47a1,#42a5f5);color:#fff;font-weight:600;cursor:pointer;transition:filter 150ms ease-in-out;}`,
    `.fit-button:focus{outline:3px solid rgba(66,165,245,.45);outline-offset:3px;}`,
    `.fit-button:hover{filter:brightness(1.05);}`
  ]
})
export class FitButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
}

@NgModule({
  imports: [CommonModule, FitButtonComponent],
  exports: [FitButtonComponent]
})
export class UiToolkitModule {}
