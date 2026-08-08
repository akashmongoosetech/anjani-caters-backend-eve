// Returns a new object containing only the allowed keys present in `source`.
// Prevents mass-assignment of fields that should never be client-controlled.
export function pick(source = {}, allowed = []) {
  const result = {};
  for (const field of allowed) {
    if (source[field] !== undefined) result[field] = source[field];
  }
  return result;
}
