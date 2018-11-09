import Peer, { Instance } from 'simple-peer';

import { auth, database } from '../lib/firebase';

import './main.css';

const pre = document.querySelector('pre') as HTMLPreElement;
const div = document.querySelector('div') as HTMLDivElement;

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  const { uid } = userCredential.user;
  const guests: Record<string, Instance> = {};
  Object.defineProperty(window, 'guests', { value: guests });

  const connections = database.ref('/connections');
  connections.on('child_added', connection => {
    if (!(connection && connection.key)) {
      return;
    }

    const offer = connection.child('offer').ref;
    const answer = connection.child('answer').ref;

    const host = new Peer({ initiator: false, trickle: false });
    guests[connection.key] = host;

    const onErrorCloseOrEnd = (error?: Error) => {
      if (!(connection && connection.key)) {
        return;
      }

      if (error) {
        pre.textContent += `error: ${error.message}\n\n`;
      } else if (guests[connection.key]) {
        pre.textContent += `player ${connection.key} - disconnected\n\n`;
      }

      if (guests[connection.key]) {
        host.destroy();
        delete guests[connection.key];
      }
    };

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
      .on('error', onErrorCloseOrEnd)
      .on('close', onErrorCloseOrEnd)
      .on('end', onErrorCloseOrEnd)
      .on('data', data => {
        const parsed = JSON.parse(data);

        if (parsed.time) {
          const message = JSON.stringify(parsed, null, 2);
          const time = new Date().toLocaleTimeString();
          pre.textContent += `/* ${time} */\n${message}\n\n`;
        } else {
          div.style.transform = [
            `rotateY(${parsed.alpha - 180}deg)`,
            `rotateX(${parsed.beta - 90}deg)`,
            `rotateZ(${-parsed.gamma}deg)`,
          ].join(' ');
        }
      });

    offer.on('value', data => {
      if (!(data && data.val())) {
        return;
      }

      host.signal(data.val());
    });
  });

  connections.on('child_removed', connection => {
    if (!(connection && connection.key)) {
      return;
    }

    pre.textContent += `player ${connection.key} - removed\n\n`;

    if (guests[connection.key]) {
      if (guests[connection.key] instanceof Peer) {
        const host = guests[connection.key];
        host.destroy();
      }

      delete guests[connection.key];
    }
  });
});
