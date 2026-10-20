import { AccountRequestError } from './account-http.ts';

/** Preserve the API's status and message without retrying a submitted form. */
export async function readFormResponse<T>(response: Response, fallback: string): Promise<T> {
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = result && typeof result === 'object' && 'error' in result ? result.error : null;
    const code = result && typeof result === 'object' && 'code' in result && typeof result.code === 'string' ? result.code : undefined;
    throw new AccountRequestError(typeof error === 'string' && error.trim() ? error : fallback, response.status, code);
  }
  if (result === null) throw new Error(fallback);
  return result as T;
}
