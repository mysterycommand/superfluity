import { User } from 'firebase';
import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';

import '../main.css';

const pre = document.querySelector('pre') as HTMLPreElement;

auth.signInAnonymously().then(authSnapshot => {
  if (!authSnapshot) {
    return;
  }

  const user = authSnapshot.user as User;
  const player = new Peer({ initiator: false, trickle: false });
  Object.defineProperty(window, 'player', { value: player });

  database.ref('/hosts').on('child_added', hostSnapshot => {
    if (!hostSnapshot) {
      return;
    }

    console.log(hostSnapshot.val());
    player.signal(JSON.stringify(hostSnapshot.val()));
  });

  player.on('signal', data => {
    pre.innerText = JSON.stringify(
      {
        ...data,
        sdp: data.sdp.split('\r\n'),
      },
      null,
      2,
    );
    database.ref(`/players/${user.uid}`).set(data);
  });

  player.on('connect', () => {
    console.log('connect');
  });

  player.on('data', () => {
    console.log('data');
  });
});
