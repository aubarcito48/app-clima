import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CitySearch } from './city-search';

describe('CitySearch', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [CitySearch] }));

  it.each(['', '   ', '\t\n', '\u00a0\u2003'])(
    'blocks an empty city (%j) without emitting a query',
    (city) => {
      const fixture = TestBed.createComponent(CitySearch);
      const submitted = vi.fn();
      fixture.componentInstance.querySubmitted.subscribe(submitted);
      fixture.detectChanges();
      fixture.componentInstance.form.setValue({ city, country: 'AR' });
      fixture.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(submitted).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('#city-error').textContent).toContain(
        'Escribí una ciudad',
      );
      expect(fixture.nativeElement.querySelector('#city').getAttribute('aria-invalid')).toBe(
        'true',
      );
      expect(fixture.componentInstance.form.controls.city.value).toBe(city);
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#city'));
    },
  );

  it('emits normalized values and preserves both original fields', () => {
    const fixture = TestBed.createComponent(CitySearch);
    const submitted = vi.fn();
    fixture.componentInstance.querySubmitted.subscribe(submitted);
    fixture.detectChanges();
    const raw = { city: '  Buenos   Aires  ', country: ' ar ' };
    fixture.componentInstance.form.setValue(raw);
    fixture.componentInstance.submit();
    expect(submitted).toHaveBeenCalledExactlyOnceWith({ city: 'Buenos Aires', country: 'AR' });
    expect(fixture.componentInstance.form.getRawValue()).toEqual(raw);
  });

  it('allows a country to be omitted', () => {
    const fixture = TestBed.createComponent(CitySearch);
    const submitted = vi.fn();
    fixture.componentInstance.querySubmitted.subscribe(submitted);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ city: 'Mendoza', country: '' });
    fixture.componentInstance.submit();
    expect(submitted).toHaveBeenCalledWith({ city: 'Mendoza', country: '' });
  });

  it('prevents submission and example selection while a search is pending', () => {
    const fixture = TestBed.createComponent(CitySearch);
    const submitted = vi.fn();
    fixture.componentInstance.querySubmitted.subscribe(submitted);
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ city: 'Mendoza', country: '' });
    fixture.componentInstance.submit();
    fixture.componentInstance.chooseExample('Córdoba');
    fixture.componentInstance.chooseCountry('AR');
    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.getRawValue()).toEqual({ city: 'Mendoza', country: '' });
    expect(fixture.nativeElement.querySelector('#city').readOnly).toBe(true);
  });

  it('focuses the country and can refine an ambiguous city without erasing its name', () => {
    const fixture = TestBed.createComponent(CitySearch);
    const submitted = vi.fn();
    fixture.componentInstance.querySubmitted.subscribe(submitted);
    fixture.componentInstance.form.setValue({ city: ' Córdoba ', country: '' });
    fixture.componentRef.setInput('feedback', {
      kind: 'ambiguous',
      message: 'Indicá el país.',
      choices: [{ label: 'Argentina (AR)', country: 'AR' }],
    });
    fixture.detectChanges();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#country'));
    const choice: HTMLButtonElement = fixture.nativeElement.querySelector('ul button');
    choice.click();
    expect(submitted).toHaveBeenCalledExactlyOnceWith({ city: 'Córdoba', country: 'AR' });
    expect(fixture.componentInstance.form.controls.city.value).toBe(' Córdoba ');
  });

  it('announces edits so the page can clear feedback for the previous query', () => {
    const fixture = TestBed.createComponent(CitySearch);
    const edited = vi.fn();
    fixture.componentInstance.queryEdited.subscribe(edited);
    fixture.detectChanges();
    const city: HTMLInputElement = fixture.nativeElement.querySelector('#city');
    city.value = 'Mendoza';
    city.dispatchEvent(new Event('input', { bubbles: true }));
    expect(edited).toHaveBeenCalledOnce();
  });
});
