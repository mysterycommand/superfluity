declare module '*.json';

declare module 'readable-stream' {
  export {
    Readable,
    Writable,
    Transform,
    Duplex,
    pipeline,
    finished,
  } from 'stream';
}
