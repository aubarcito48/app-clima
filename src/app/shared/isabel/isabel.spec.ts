import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Isabel } from './isabel';
import { Language } from '../../service/language';

describe('Isa follows the current weather advice', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Isabel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
  });

  it('starts enabled without speaking, reads new advice and cancels when it clears', async () => {
    const fixture = TestBed.createComponent(Isabel);
    await fixture.whenStable();
    expect(fixture.componentInstance.voice.enabled()).toBe(true);
    http.expectNone(() => true);
    fixture.componentRef.setInput('text', 'Consejo de Groq');
    await fixture.whenStable();
    const request = http.expectOne(() => true);
    expect(request.request.body).toEqual({ texto: 'Consejo de Groq' });
    fixture.componentInstance.toggleVoice();
    await fixture.whenStable();
    fixture.componentInstance.toggleVoice();
    await fixture.whenStable();
    expect(request.cancelled).toBe(true);
    http.expectNone(() => true); // Reactivar no repite el consejo ya intentado.
    fixture.componentRef.setInput('text', null);
    await fixture.whenStable();
    expect(request.cancelled).toBe(true);
    expect(fixture.componentInstance.voice.enabled()).toBe(true);
    expect(fixture.componentInstance.voice.state()).toBe('idle');
  });

  it('stops when changing language or destroying the component', async () => {
    const fixture = TestBed.createComponent(Isabel);
    fixture.componentRef.setInput('text', 'Consejo en español');
    await fixture.whenStable();
    const request = http.expectOne(() => true);
    TestBed.inject(Language).set('en');
    await fixture.whenStable();
    expect(request.cancelled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('available in Spanish');
    TestBed.inject(Language).set('es');
    await fixture.whenStable();
    http.expectNone(() => true);
    fixture.componentRef.setInput('text', 'Consejo de otra consulta');
    await fixture.whenStable();
    const next = http.expectOne(() => true);
    fixture.destroy();
    expect(next.cancelled).toBe(true);
  });
});
