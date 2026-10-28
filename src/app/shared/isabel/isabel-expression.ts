export interface IsaExpression {
  animation: 'happy' | 'curious' | 'thinking';
  expression: 'joyful-wide' | 'small-attentive' | 'gentle-downward-gaze' | 'attentive-left';
}

function expressionFor(sentence: string): IsaExpression {
  const text = sentence
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase();
  if (/\b(lluv\w*|paraguas|impermeable|torment\w*|precau\w*|cuidado|resbal\w*)\b/u.test(text))
    return { animation: 'thinking', expression: 'gentle-downward-gaze' };
  if (
    /\b(frio|fres[ca]\w*|refresc\w*|abrigo|abrig\w*|campera|bufanda|capas|viento|rafagas)\b/u.test(
      text,
    )
  )
    return { animation: 'curious', expression: 'small-attentive' };
  if (/\b(calor|caluro\w*|hidrat\w*|agua|protector|solar|sombra)\b/u.test(text))
    return { animation: 'curious', expression: 'attentive-left' };
  return { animation: 'happy', expression: 'joyful-wide' };
}

// Sin marcas de palabras del sintetizador, ubicamos cada frase por su longitud
// relativa en el audio. Es una aproximación expresiva, no lip sync.
export function isaExpression(text: string, progress: number): IsaExpression {
  const sentences = text.split(/(?<=[.!?;])\s+|\n+/u).filter((part) => part.trim());
  const total = sentences.reduce((length, part) => length + part.length, 0);
  const position = Math.max(0, Math.min(1, progress)) * total;
  let end = 0;
  for (const sentence of sentences) {
    end += sentence.length;
    if (position < end) return expressionFor(sentence);
  }
  return expressionFor(sentences.at(-1) ?? '');
}
