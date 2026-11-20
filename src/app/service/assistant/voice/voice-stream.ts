import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IsaSegment, readIsaSegments } from '../../../models/assistant/isa-performance';

export interface VoiceClip {
  blob: Blob;
  index: number;
  total: number;
  segments: IsaSegment[];
}

/** Incremental fetch is intentional: the complete WAV remains the legacy fallback. */
export function requestVoice(
  url: string,
  payload: {
    texto: string;
    idioma?: 'en';
    segmentos?: IsaSegment[];
  },
): Observable<VoiceClip> {
  return new Observable((subscriber) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const run = async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
        body: JSON.stringify(payload),
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new HttpErrorResponse({
          status: response.status,
          headers: new HttpHeaders({ 'Retry-After': response.headers.get('Retry-After') ?? '5' }),
        });
      }
      const type = response.headers.get('Content-Type')?.split(';')[0].trim();
      if (type === 'audio/wav') {
        const blob = await response.blob();
        if (blob.size < 44 || blob.size > 4038676) throw new Error('Invalid voice audio');
        subscriber.next({ blob, index: 0, total: 1, segments: payload.segmentos ?? [] });
        return;
      }
      if (type !== 'application/x-ndjson' || !response.body)
        throw new Error('Invalid voice response');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let buffer = '';
      let bytes = 0;
      let received = 0;
      let total: number | undefined;
      let done = false;
      const consume = (line: string) => {
        if (!line.trim()) return;
        if (done) throw new Error('Voice data after completion');
        const event: unknown = JSON.parse(line);
        if (!event || typeof event !== 'object') throw new Error('Invalid voice event');
        const part = event as Record<string, unknown>;
        if (part['type'] === 'done') {
          if (!received || part['total'] !== received || total !== received)
            throw new Error('Incomplete voice stream');
          done = true;
          return;
        }
        if (
          part['type'] !== 'audio' ||
          part['index'] !== received ||
          typeof part['total'] !== 'number' ||
          !Number.isInteger(part['total']) ||
          part['total'] < 1 ||
          part['total'] > 6 ||
          received >= part['total'] ||
          (total !== undefined && total !== part['total']) ||
          typeof part['audio'] !== 'string' ||
          part['audio'].length > 5400000 ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(part['audio'])
        )
          throw new Error('Invalid voice part');
        total = part['total'];
        const binary = atob(part['audio']);
        const data = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        if (
          data.length < 44 ||
          new TextDecoder().decode(data.subarray(0, 4)) !== 'RIFF' ||
          new TextDecoder().decode(data.subarray(8, 12)) !== 'WAVE'
        )
          throw new Error('Invalid WAV');
        const candidate = part['segments'];
        const text = Array.isArray(candidate)
          ? candidate.map((item) => item?.text ?? '').join(' ')
          : '';
        subscriber.next({
          blob: new Blob([data], { type: 'audio/wav' }),
          index: received++,
          total,
          segments: readIsaSegments(candidate, text, 6) ?? [],
        });
      };
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          bytes += next.value.byteLength;
          if (bytes > 6000000) throw new Error('Voice stream too large');
          buffer += decoder.decode(next.value, { stream: true });
          let end: number;
          while ((end = buffer.indexOf('\n')) >= 0) {
            consume(buffer.slice(0, end));
            buffer = buffer.slice(end + 1);
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) consume(buffer);
        if (!done) throw new Error('Truncated voice stream');
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    };
    void run()
      .then(() => subscriber.complete())
      .catch((error: unknown) => subscriber.error(error));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  });
}
