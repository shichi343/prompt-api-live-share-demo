export function startInterval(fn: () => void, ms: number) {
  const id = setInterval(fn, ms);
  return () => clearInterval(id);
}
