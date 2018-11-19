import { Instance } from 'simple-peer';

export type DataSnapshot = firebase.database.DataSnapshot;

export interface SignalData {
  type: 'offer' | 'answer';
  sdp: string;
  uid: string;
}

export interface Guest {
  orientation: number[];
  host: Instance;
}
