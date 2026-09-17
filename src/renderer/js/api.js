// Thin wrapper around the IPC bridge exposed by preload.js.
export class ApiError extends Error { constructor(code) { super(code); this.code = code; } }

export async function api(channel, payload) {
  const res = await window.api.invoke(channel, payload);
  if (!res || !res.ok) throw new ApiError(res ? res.error : 'no_response');
  return res.data;
}
export function onEvent(channel, cb) { return window.api.on(channel, cb); }
