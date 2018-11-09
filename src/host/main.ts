import Peer, { Instance } from 'simple-peer';
import { toCanvas, QRCodeRenderersOptions } from 'qrcode';

import { auth, database } from '../lib/firebase';

import './main.css';

const ul = document.querySelector('ul') as HTMLUListElement;
const pre = document.querySelector('pre') as HTMLPreElement;
const canvas = document.querySelector('canvas') as HTMLCanvasElement;

const log = (str: string) => {
  pre.textContent += str;
  pre.scrollTo({
    top: pre.scrollHeight,
    behavior: 'smooth',
  });
};

const { href } = location;
const playerUrl = href.replace('host', 'player');
const qrcodeOpts: QRCodeRenderersOptions = {
  color: { light: '#ffffff66' },
  scale: 3,
};

toCanvas(canvas, playerUrl, qrcodeOpts, error => {
  if (error) {
    log(`qrcode error:\n${error.message}`);
    return;
  }
});

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  const { uid } = userCredential.user;
  const guests: Record<string, Instance> = {};
  Object.defineProperty(window, 'guests', { value: guests });

  const removeGuest = (key: string) => {
    if (guests[key]) {
      const host = guests[key];
      host.destroy();

      delete guests[key];
    }

    const li = document.getElementById(`connection-${key}`);
    if (li) {
      li.remove();
    }
  };

  const connections = database.ref('/connections');
  connections.on('child_added', connection => {
    if (!(connection && connection.key)) {
      return;
    }

    const offer = connection.child('offer').ref;
    const answer = connection.child('answer').ref;

    const host = new Peer({ initiator: false, trickle: false });
    guests[connection.key] = host;

    const li = document.createElement('li');
    li.id = `connection-${connection.key}`;

    const onErrorCloseOrEnd = (error?: Error) => {
      if (!(connection && connection.key)) {
        return;
      }

      if (error) {
        log(`error:\n${error.message}\n\n`);
      } else if (guests[connection.key]) {
        log(`connection: ${connection.key} - disconnected\n`);
      }

      removeGuest(connection.key);
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

        ul.appendChild(li);

        const time = new Date().toLocaleTimeString();
        host.send(JSON.stringify({ host: connection.key, time }));
      })
      .on('error', onErrorCloseOrEnd)
      .on('close', onErrorCloseOrEnd)
      .on('end', onErrorCloseOrEnd)
      .on('data', data => {
        const { time, player, width, height, alpha, beta, gamma } = JSON.parse(
          data,
        );

        if (time) {
          const localTime = new Date().toLocaleTimeString();

          log(
            `\nplayer: ${player} - added\nplayer time: ${time}\nhost time: ${localTime}\n\n`,
          );

          li.style.width = `${width / 4}px`;
          li.style.height = `${height / 4}px`;

          const h1 = Math.random() * 360;
          const h2 = (h1 + 180) % 360;
          li.style.background = `linear-gradient(hsl(${h1}, 50%, 50%), hsl(${h2}, 50%, 50%))`;
        } else {
          li.style.transform = [
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

    removeGuest(connection.key);
    log(`connection: ${connection.key} - removed\n`);
  });
});
