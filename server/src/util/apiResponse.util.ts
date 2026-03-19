/** Recursively convert BigInt to string so JSON.stringify does not throw. */
function toJSONSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) return value.map(toJSONSafe);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toJSONSafe(v);
    return out;
  }
  return value;
}

class ApiResponse {
  statusCode: number;
  data: any;
  message: string = 'Successfull';
  success: boolean;
  constructor(statusCode: number = 200, data: unknown = null, message: string = 'Successfull') {
    ((this.statusCode = statusCode),
      (this.data = toJSONSafe(data)),
      (this.message = message),
      (this.success = statusCode < 400));
  }
}

export { ApiResponse };
