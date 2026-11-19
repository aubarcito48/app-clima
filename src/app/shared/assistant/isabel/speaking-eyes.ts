// Entrecerrado suave: conserva la forma configurada y vuelve a abrir los ojos.
export function speakingEyeOpenness(elapsedMs: number): number {
  // Dos gestos como máximo por lectura, separados por una pausa larga.
  for (const start of [1000, 7000]) {
    const position = (elapsedMs - start) / 1600;
    if (position > 0 && position < 1) return 1 - 0.2 * Math.sin(position * Math.PI) ** 2;
  }
  return 1;
}
