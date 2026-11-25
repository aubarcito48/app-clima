export class VoiceHttpError extends Error {
  constructor(
    readonly status: number,
    readonly headers: Headers,
  ) {
    super('Voice request failed (' + status + ')');
  }
}
