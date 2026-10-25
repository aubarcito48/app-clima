import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { climatePresentation } from '../../service/climate-presentation';
import { CLIMATE_FIXTURE } from '../../testing/climate-fixture';
import { Recommendation } from './recommendation';

describe('Recommendations from Django (TK07)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Recommendation] }));

  it('invites a search without creating a recommendation before receiving data', async () => {
    const fixture = TestBed.createComponent(Recommendation);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#advice-text')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Elegí una ciudad');
    expect(fixture.nativeElement.textContent).not.toContain('Generado con IA');
  });

  it('shows the exact returned text with the resolved city, region and country', async () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.recomendacion.texto = 'Llevá un abrigo.\nPodés volver a consultar antes de salir.';
    const fixture = TestBed.createComponent(Recommendation);
    fixture.componentRef.setInput('weather', climatePresentation(data));
    await fixture.whenStable();
    const view: HTMLElement = fixture.nativeElement;
    expect(view.querySelector('#advice-text')?.textContent).toBe(data.recomendacion.texto);
    expect(view.querySelector('#advice-location')?.textContent).toContain('Para tu día en Córdoba');
    expect(view.querySelector('#advice-location')?.textContent).toContain('Córdoba, AR');
    expect(view.textContent).toContain('Generado con IA');
    expect(view.querySelector('ul')).toBeNull();
  });

  it('shows unavailable for the current location without a substitute or previous advice', async () => {
    const fixture = TestBed.createComponent(Recommendation);
    fixture.componentRef.setInput('weather', climatePresentation(CLIMATE_FIXTURE));
    await fixture.whenStable();
    const next = structuredClone(CLIMATE_FIXTURE);
    next.ubicacion.nombre = 'Mendoza';
    next.ubicacion.region = 'Mendoza';
    next.recomendacion = { estado: 'no_disponible', texto: null };
    fixture.componentRef.setInput('weather', climatePresentation(next));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Para tu día en Mendoza');
    expect(fixture.nativeElement.textContent).toContain('No disponible');
    expect(fixture.nativeElement.textContent).toContain('no está disponible');
    expect(fixture.nativeElement.querySelector('#advice-text')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(CLIMATE_FIXTURE.recomendacion.texto);
  });

  it.each([
    '<img src=x onerror="alert(1)">',
    '<script>window.injected = true</script>',
    '[abrir](javascript:alert(1)) **texto** {{ 2 + 2 }}',
  ])(
    'renders the response literally without HTML, Markdown or template evaluation: %s',
    async (text) => {
      const data = structuredClone(CLIMATE_FIXTURE);
      data.recomendacion.texto = text;
      const fixture = TestBed.createComponent(Recommendation);
      fixture.componentRef.setInput('weather', climatePresentation(data));
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('#advice-text').textContent).toBe(text);
      expect(fixture.nativeElement.querySelector('img,script,a,strong')).toBeNull();
    },
  );

  it('preserves the whole 600-character response without silently truncating it', async () => {
    const data = structuredClone(CLIMATE_FIXTURE);
    data.recomendacion.texto = 'x'.repeat(600);
    const fixture = TestBed.createComponent(Recommendation);
    fixture.componentRef.setInput('weather', climatePresentation(data));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#advice-text').textContent).toBe(
      data.recomendacion.texto,
    );
  });
});
