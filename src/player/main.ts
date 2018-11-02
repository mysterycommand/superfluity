import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';

import '../main.css';

// const pre = document.querySelector('pre') as HTMLPreElement;

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  const connections = database.ref('/connections');
  const connection = connections.push();

  const offer = connection.child('offer').ref;
  const answer = connection.child('answer').ref;

  connection.onDisconnect().set(null);

  const player = new Peer({ initiator: true, trickle: false });
  console.log(player);

  player
    .on('signal', data => {
      if (data.type !== 'offer') {
        return;
      }

      offer.set(data);
    })
    .on('connect', () => {
      console.log('connect');
    })
    .on('data', data => {
      console.log('data', JSON.parse(data));
    });

  answer.on('value', data => {
    if (!(data && data.val())) {
      return;
    }

    console.log(data.val());
    player.signal(data.val());
  });
});
