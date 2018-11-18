import { Instance } from 'simple-peer';

export type DataSnapshot = firebase.database.DataSnapshot;

export interface SignalData {
  type: 'offer' | 'answer';
  sdp: string;
  uid: string;
}

export interface Guest {
  acceleration: { alpha: number; beta: number; gamma: number };
  orientation: { alpha: number; beta: number; gamma: number };
  host: Instance;
}
