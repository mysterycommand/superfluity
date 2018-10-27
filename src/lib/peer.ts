import { Duplex, DuplexOptions } from 'readable-stream';

export const MAX_BUFFERED_AMOUNT = 64 * 1024;
export const ICE_COMPLETE_TIMEOUT = 5 * 1000;

function randomBytes(length = 0): Buffer {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes.buffer);
}

interface PeerOptions extends DuplexOptions {
  initiator?: boolean;
  channelName?: string;
}

export default class Peer extends Duplex {
  public readonly id = randomBytes(4)
    .toString('hex')
    .slice(0, 7);

  private initiator: boolean;
  private channelName: string | null;
  private connection: RTCPeerConnection;

  constructor(opts: PeerOptions) {
    super({ ...opts, allowHalfOpen: false });

    this.initiator = opts.initiator || false;
    this.channelName = this.initiator
      ? opts.channelName || randomBytes(20).toString('hex')
      : null;

    this.connection = new RTCPeerConnection();
    if (this.initiator) {
      // setup data
      this.connection.createDataChannel(this.channelName as string, {});
    } else {
      this.connection.addEventListener('datachannel', event => {
        console.log(event); // tslint:disable-line
      });
    }
  }
}
