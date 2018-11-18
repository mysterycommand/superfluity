export type DataSnapshot = firebase.database.DataSnapshot;

export interface SignalData {
  type: 'offer' | 'answer';
  sdp: string;
  uid: string;
}
