import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';

import '../main.css';

const h1 = document.querySelector('h1') as HTMLHeadingElement;
const pre = document.querySelector('pre') as HTMLPreElement;

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

  const onDeviceOrientation = (event: DeviceOrientationEvent) => {
    const { absolute, alpha, beta, gamma } = event;
    player.send(JSON.stringify({ absolute, alpha, beta, gamma }));
  };

  player
    .on('signal', data => {
      if (data.type !== 'offer') {
        return;
      }

      offer.set(data);
    })
    .on('connect', () => {
      h1.textContent = `player ${connection.key} - connected`;

      const time = new Date().toLocaleTimeString();
      player.send(JSON.stringify({ player: connection.key, time }));

      window.addEventListener('deviceorientation', onDeviceOrientation);
    })
    .on('close', () => {
      h1.textContent = `player ${connection.key} - closed`;
      window.removeEventListener('deviceorientation', onDeviceOrientation);
    })
    .on('end', () => {
      h1.textContent = `player ${connection.key} - ended`;
      window.removeEventListener('deviceorientation', onDeviceOrientation);
    })
    .on('data', data => {
      const parsed = JSON.parse(data);

      if (parsed.time) {
        const message = JSON.stringify(parsed, null, 2);
        const time = new Date().toLocaleTimeString();
        pre.textContent += `/* ${time} */\n${message}\n\n`;
      }
    });

  answer.on('value', data => {
    if (!(data && data.val())) {
      return;
    }

    player.signal(data.val());
  });
});
