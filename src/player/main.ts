import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';

import '../main.css';

const pre = document.querySelector('pre') as HTMLPreElement;

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  const uid = userCredential.user.uid;

  const connections = database.ref('/connections');
  const connection = connections.push();

  connection.onDisconnect().set(null);

  const player = new Peer({ initiator: true, trickle: false });
  Object.defineProperty(window, 'player', { value: player });

  player
    .on('signal', data => {
      if (data.type !== 'offer') {
        return;
      }

      connection.set({ uid, offer: data });
    })
    .on('connect', () => {
      console.log('connect');
    })
    .on('data', data => {
      console.log('data', data);
    });

  connection.child('answer').on('value', answer => {
    if (!answer) {
      return;
    }

    player.signal(JSON.stringify(answer.val()));
  });
});
