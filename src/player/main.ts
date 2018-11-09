import firebase from 'firebase/app';
import 'firebase/database';

import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';

import './main.css';

const main = document.querySelector('main') as HTMLMainElement;
const h1 = document.querySelector('h1') as HTMLHeadingElement;

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  const { uid } = userCredential.user;

  const connections = database.ref('/connections');
  const connection = connections.push({
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  });

  const offer = connection.child('offer').ref;
  const answer = connection.child('answer').ref;

  connection.onDisconnect().set(null);

  const player = new Peer({ initiator: true, trickle: false });

  const onDeviceOrientation = (event: DeviceOrientationEvent) => {
    const { absolute, alpha, beta, gamma } = event;
    player.send(JSON.stringify({ absolute, alpha, beta, gamma }));
  };

  const onErrorCloseOrEnd = () => {
    h1.textContent = 'player';
    window.removeEventListener('deviceorientation', onDeviceOrientation);
  };

  player
    .on('signal', data => {
      if (data.type !== 'offer') {
        return;
      }

      offer.set({ ...data, uid });
    })
    .on('connect', () => {
      h1.textContent = `player ${connection.key} - connected`;

      const time = new Date().toLocaleTimeString();
      player.send(JSON.stringify({ player: connection.key, time }));

      window.addEventListener('deviceorientation', onDeviceOrientation);
    })
    .on('error', onErrorCloseOrEnd)
    .on('close', onErrorCloseOrEnd)
    .on('end', onErrorCloseOrEnd)
    .on('data', data => {
      const parsed = JSON.parse(data);

      if (parsed.time) {
        const message = JSON.stringify(parsed, null, 2);
        const time = new Date().toLocaleTimeString();

        // tslint:disable-next-line no-console
        console.log(`player.on 'data':\n/* ${time} */\n${message}\n\n`);
      }
    });

  answer.on('value', data => {
    if (!(data && data.val())) {
      return;
    }

    // tslint:disable-next-line no-console
    console.log(
      `answer.on 'value':\n${JSON.stringify(data.val(), null, 2)}\n\n`,
    );
    player.signal(data.val());
  });
});
