import { describe, expect, it } from 'vitest';
import { isaExpression } from './isabel-expression';

describe('Isa accompanies the advice being spoken', () => {
  it('changes from attention to joy as the audio moves to a different sentence', () => {
    const text = 'Llevá abrigo porque refresca. Disfrutá de una tarde agradable.';
    expect(isaExpression(text, 0).expression).toBe('small-attentive');
    expect(isaExpression(text, 0.9).expression).toBe('joyful-wide');
  });

  it('treats rain with caution and heat with attention instead of always celebrating', () => {
    expect(isaExpression('Usá paraguas por la lluvia.', 0.5).animation).toBe('thinking');
    expect(isaExpression('Buscá sombra y tomá agua.', 0.5).expression).toBe('attentive-left');
    expect(isaExpression('La temperatura es de 14.3 °C. Llevá campera.', 1).expression).toBe(
      'small-attentive',
    );
  });
});
