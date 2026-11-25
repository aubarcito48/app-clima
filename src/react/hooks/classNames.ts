export function cx(...values: unknown[]): string {
  return values
    .flatMap((value) =>
      typeof value === 'string'
        ? [value]
        : value && typeof value === 'object'
          ? Object.entries(value)
              .filter(([, on]) => on)
              .map(([key]) => key)
          : [],
    )
    .join(' ');
}
