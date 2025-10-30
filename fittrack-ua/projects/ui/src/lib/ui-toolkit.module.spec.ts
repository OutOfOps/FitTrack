import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FitButtonComponent, UiToolkitModule } from './ui-toolkit.module';

@Component({
  selector: 'test-host',
  standalone: true,
  imports: [UiToolkitModule],
  template: `<fit-button type="submit" [disabled]="true">Test</fit-button>`
})
class HostComponent {}

describe('UiToolkitModule', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();
  });

  it('should render projected content in fit-button', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('fit-button button') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Test');
  });

  it('should forward state inputs to the inner button element', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('fit-button button') as HTMLButtonElement;
    expect(button.getAttribute('type')).toBe('submit');
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('should expose FitButtonComponent as a standalone component', () => {
    const fixture = TestBed.createComponent(FitButtonComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeInstanceOf(FitButtonComponent);
  });
});
