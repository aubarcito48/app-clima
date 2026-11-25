export const apiBaseUrl = __API_BASE_URL__;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: any,
  ) {
    super(`API request failed (${status})`);
  }
}

export async function getJson(
  path: string,
  params: URLSearchParams,
  signal?: AbortSignal,
  timeout = 45000,
): Promise<unknown> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}?${params}`, {
      signal: AbortSignal.any([AbortSignal.timeout(timeout), ...(signal ? [signal] : [])]),
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (!response.ok) throw new ApiError(response.status, null);
      throw new Error('Invalid JSON response');
    }
    if (!response.ok) throw new ApiError(response.status, body);
    return body;
  } catch (error) {
    if (signal?.aborted || error instanceof ApiError) throw error;
    throw new ApiError(0, error);
  }
}
