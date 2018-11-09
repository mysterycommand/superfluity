import Peer, { Instance } from 'simple-peer';
import { toCanvas } from 'qrcode';

import { auth, database } from '../lib/firebase';

import './main.css';

const main = document.querySelector('main') as HTMLMainElement;
const pre = document.querySelector('pre') as HTMLPreElement;
const div = document.querySelector('div') as HTMLDivElement;

const { protocol, hostname, port } = location;
toCanvas(
  `${protocol}//${hostname}:${port}/player/index.html`,
  (error, canvas) => {
    main.appendChild(canvas);
  },
);

const log = (str: string) => {
  pre.textContent += str;
  pre.scrollTo({
    top: pre.scrollHeight,
    behavior: 'smooth',
  });
};

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
        log(`error:\n${error.message}\n\n`);
      } else if (guests[connection.key]) {
        log(`connection: ${connection.key} - disconnected\n`);
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
        log(`connection: ${connection.key} - connected\n`);

        const time = new Date().toLocaleTimeString();
        host.send(JSON.stringify({ host: connection.key, time }));
      })
      .on('error', onErrorCloseOrEnd)
      .on('close', onErrorCloseOrEnd)
      .on('end', onErrorCloseOrEnd)
      .on('data', data => {
        const { time, player, alpha, beta, gamma } = JSON.parse(data);

        if (time) {
          const localTime = new Date().toLocaleTimeString();
          log(
            `\nplayer: ${player} - added\nplayer time: ${time}\nhost time: ${localTime}\n\n`,
          );
        } else {
          div.style.transform = [
            `rotateY(${alpha - 180}deg)`,
            `rotateX(${beta - 90}deg)`,
            `rotateZ(${-gamma}deg)`,
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

    log(`connection: ${connection.key} - removed\n`);

    if (guests[connection.key]) {
      if (guests[connection.key] instanceof Peer) {
        const host = guests[connection.key];
        host.destroy();
      }

      delete guests[connection.key];
    }
  });
});
