import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';

import './main.css';

const pre = document.querySelector('pre') as HTMLPreElement;
const div = document.querySelector('div') as HTMLDivElement;

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  const { uid } = userCredential.user;

  const connections = database.ref('/connections');
  connections.on('child_added', connection => {
    if (!connection) {
      return;
    }

    const offer = connection.child('offer').ref;
    const answer = connection.child('answer').ref;

    const host = new Peer({ initiator: false, trickle: false });

    host
      .on('signal', data => {
        if (data.type !== 'answer') {
          return;
        }

        answer.set({ ...data, uid });
      })
      .on('connect', () => {
        pre.textContent += `player ${connection.key} - connected\n\n`;

        const time = new Date().toLocaleTimeString();
        host.send(JSON.stringify({ host: connection.key, time }));
      })
      .on('close', () => {
        pre.textContent += `player ${connection.key} - closed\n\n`;
      })
      .on('end', () => {
        pre.textContent += `player ${connection.key} - ended\n\n`;
      })
      .on('data', data => {
        const parsed = JSON.parse(data);

        if (parsed.time) {
          const message = JSON.stringify(parsed, null, 2);
          const time = new Date().toLocaleTimeString();
          pre.textContent += `/* ${time} */\n${message}\n\n`;
        } else {
          div.style.transform = [
            `rotateZ(${parsed.alpha - 180}deg)`,
            `rotateX(${parsed.beta - 90}deg)`,
            `rotateY(${-parsed.gamma}deg)`,
          ].join(' ');
        }
      });

    offer.once('value', data => {
      if (!(data && data.val())) {
        return;
      }

      host.signal(data.val());
    });
  });
});
