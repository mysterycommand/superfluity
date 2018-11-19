export default function randomBytes(size = 2) {
  const raw = new Uint8Array(size);
  if (size > 0) {
    crypto.getRandomValues(raw);
  }
  return Buffer.from(raw.buffer);
}
