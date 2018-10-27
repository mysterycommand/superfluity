import { Duplex } from 'readable-stream';

export const MAX_BUFFERED_AMOUNT = 64 * 1024;
export const ICE_COMPLETE_TIMEOUT = 5 * 1000;

function randomBytes(length = 0): Buffer {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes.buffer);
}

export default class RtcData extends Duplex {
  constructor(
    public readonly id = randomBytes(4)
      .toString('hex')
      .slice(0, 7),
  ) {
    super();
  }
}
