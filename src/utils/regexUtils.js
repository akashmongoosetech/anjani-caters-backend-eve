// Escapes user-supplied search text before it is embedded into a MongoDB $regex,
// preventing ReDoS and regex injection via operators like . * + ? ^ $ { } ( ) | [ ] \
export function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Convenience wrapper that trims and escapes a query-string search term.
export function safeSearchTerm(search) {
  if (!search) return '';
  return escapeRegex(String(search).trim());
}
