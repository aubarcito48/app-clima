import { readFileSync } from 'node:fs';
import { test, expect, search, chooseLanguage } from './fixtures';

for (const language of ['es', 'en'] as const) {
  test(`Isa reproduce frases en ${language} antes de terminar la respuesta`, async ({ page }) => {
    const audio = readFileSync(`e2e/data/isa/${language}_long.wav`).toString('base64');
    await page.addInitScript(
      ({ audio, blockFirst }) => {
        const nativeFetch = window.fetch.bind(window);
        const NativeAudio = window.Audio;
        const state = window as unknown as {
          isaAudio: HTMLAudioElement;
          isaPlayers: number;
          isaReleaseNext: () => void;
          isaCancelled: boolean;
        };
        state.isaPlayers = 0;
        let blocked = blockFirst;
        window.Audio = class extends NativeAudio {
          constructor(src?: string) {
            super(src);
            state.isaAudio = this;
            state.isaPlayers++;
          }
          override play(): Promise<void> {
            if (blocked) {
              blocked = false;
              return Promise.reject(new DOMException('Gesture required', 'NotAllowedError'));
            }
            return super.play();
          }
        };
        window.fetch = (input, init) => {
          if (!String(input).includes('/api/v1/voz/')) return nativeFetch(input, init);
          const encoder = new TextEncoder();
          const event = (index: number) =>
            encoder.encode(
              JSON.stringify({
                type: 'audio',
                index,
                total: 2,
                audio,
                segments: [],
              }) + '\n',
            );
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(event(0));
              state.isaReleaseNext = () => {
                controller.enqueue(event(1));
                controller.enqueue(encoder.encode('{"type":"done","total":2}\n'));
                controller.close();
              };
              init?.signal?.addEventListener('abort', () => {
                state.isaCancelled = true;
              });
            },
          });
          return Promise.resolve(
            new Response(body, {
              headers: { 'Content-Type': 'application/x-ndjson' },
            }),
          );
        };
      },
      { audio, blockFirst: language === 'es' },
    );
    await page.goto('/');
    if (language === 'en') await chooseLanguage(page, 'en');
    await search(page, 'Cordoba');
    const isa = page.locator('[data-component=app-isabel]');
    if (language === 'es') {
      await expect(isa.getByRole('status')).toContainText('Tocá a Isa');
      await isa.getByRole('button', { name: /^Isa:/u }).click();
    }
    await expect(isa.getByRole('status')).toContainText(
      language === 'es' ? 'Isa está hablando' : 'Isa is speaking',
    );
    const firstSource = await page.evaluate(() => {
      const state = window as unknown as { isaAudio: HTMLAudioElement };
      const source = state.isaAudio.src;
      state.isaAudio.currentTime = state.isaAudio.duration - 0.05;
      return source;
    });
    await expect(isa.getByRole('status')).toContainText(
      language === 'es' ? 'Isa está preparando' : 'Isa is preparing',
    );
    await page.evaluate(() => {
      (window as unknown as { isaReleaseNext: () => void }).isaReleaseNext();
    });
    await expect(isa.getByRole('status')).toContainText(
      language === 'es' ? 'Isa está hablando' : 'Isa is speaking',
    );
    expect(
      await page.evaluate(() => (window as unknown as { isaPlayers: number }).isaPlayers),
    ).toBe(1);
    expect(
      await page.evaluate(() => (window as unknown as { isaAudio: HTMLAudioElement }).isaAudio.src),
    ).not.toBe(firstSource);
    await isa.getByRole('button', { name: /^Isa:/u }).click();
    await expect(isa.getByRole('button', { name: /^Isa:/u })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      await page.evaluate(
        () => (window as unknown as { isaAudio: HTMLAudioElement }).isaAudio.paused,
      ),
    ).toBe(true);
  });
}

test('Isa cancela la descarga de frases al silenciarla', async ({ page }) => {
  const audio = readFileSync('e2e/data/isa/es_long.wav').toString('base64');
  await page.addInitScript(
    ({ audio }) => {
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        if (!String(input).includes('/api/v1/voz/')) return nativeFetch(input, init);
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify({
                  type: 'audio',
                  index: 0,
                  total: 2,
                  audio,
                  segments: [],
                }) + '\n',
              ),
            );
            init?.signal?.addEventListener('abort', () => {
              (window as unknown as { isaCancelled: boolean }).isaCancelled = true;
              controller.close();
            });
          },
        });
        return Promise.resolve(
          new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } }),
        );
      };
    },
    { audio },
  );
  await page.goto('/');
  await search(page, 'Cordoba');
  const isa = page.locator('[data-component=app-isabel]');
  await expect(isa.getByRole('status')).toContainText('Isa está hablando');
  await isa.getByRole('button', { name: /^Isa:/u }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { isaCancelled: boolean }).isaCancelled))
    .toBe(true);
  await expect(page.locator('#advice-text')).not.toBeEmpty();
});
