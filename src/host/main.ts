import Peer from 'simple-peer';
import { toCanvas, QRCodeRenderersOptions } from 'qrcode';

import { auth, database } from '../lib/firebase';
import { DataSnapshot, SignalData, Guest } from '../lib/common';

import './main.css';
import compose from './compose';

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
};

toCanvas(canvas, playerUrl, qrcodeOpts, error => {
  if (error) {
    log(`qrcode error:\n${error.message}`);
    return;
  }
});

const guests: Record<string, Guest> = {};
if (process.env.NODE_ENV === 'development') {
  Object.defineProperty(window, 'guests', { value: guests });
}

const draw = (t: DOMHighResTimeStamp) => {
  requestAnimationFrame(draw);

  Object.entries(guests).forEach(([key, { orientation }]) => {
    const li = document.getElementById(`connection-${key}`);
    if (!li) {
      return;
    }

    const p = li.querySelector('p');
    if (!p) {
      return;
    }

    const matrix = compose(orientation);
    matrix[1] = -matrix[1];
    matrix[4] = -matrix[4];
    const xf = `matrix3d(${matrix.join(',')})`;

    li.style.transform = xf;
    if (process.env.NODE_ENV === 'development') {
      p.style.fontFamily = 'monospace';
      p.style.fontSize = '0.5em';
      p.innerHTML = matrix.reduce((str, v, i) => {
        const vf = (Math.abs(v) === v ? '&nbsp;' : '') + v.toFixed(2);
        return str + ((i + 1) % 4 === 0 ? `${vf}&nbsp;<br />` : `${vf}, `);
      }, '');
    }
  });
};

requestAnimationFrame(draw);

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  const { uid } = userCredential.user;
  const connections = database.ref('/connections');

  const removeGuest = (key: string) => {
    if (guests[key]) {
      const { host } = guests[key];
      host.destroy();

      delete guests[key];
    }

    const li = document.getElementById(`connection-${key}`);
    if (li) {
      li.remove();
    }
  };

  const onConnectionAdded = (connection: DataSnapshot | null) => {
    if (!(connection && connection.key)) {
      return;
    }

    const { key } = connection;

    const offer = connection.child('offer').ref;
    const answer = connection.child('answer').ref;

    const host = new Peer({ initiator: false, trickle: false });
    guests[key] = {
      orientation: [0, 0, 0, 1],
      host,
    };

    const li = document.createElement('li');
    li.id = `connection-${key}`;

    const c = document.createElement('canvas');
    li.append(c);

    const onSignal = (data: SignalData) => {
      if (data.type !== 'answer') {
        return;
      }

      answer.set({ ...data, uid });
    };

    const onConnect = () => {
      log(`connection: ${key} - connected\n`);

      ul.appendChild(li);

      const time = new Date().toLocaleTimeString();
      host.send(JSON.stringify({ host: key, time }));
    };

    const onErrorCloseOrEnd = (error?: Error) => {
      if (error) {
        log(`error:\n${error.message}\n\n`);
      } else if (guests[key]) {
        log(`connection: ${key} - disconnected\n`);
      }

      removeGuest(key);
    };

    const onData = (data: string) => {
      const { time, player, width, height, orientation } = JSON.parse(data);

      if (time) {
        const localTime = new Date().toLocaleTimeString();

        log(
          `\nplayer: ${player} - added\nplayer time: ${time}\nhost time: ${localTime}\n\n`,
        );

        li.style.width = c.style.width = `${width / 2}px`;
        li.style.height = c.style.height = `${height / 2}px`;

        c.width = width / 2;
        c.height = height / 2;

        const p = document.createElement('p');
        li.append(p);
        p.innerText = player;

        const h1 = Math.random() * 360;
        const h2 = (h1 + 120 * (1 + Math.round(Math.random()))) % 360;

        // TODO: @mysterycommand - more here, radial-gradients?
        const bkgd = !!Math.round(Math.random())
          ? `linear-gradient(hsl(${h1}, 80%, 50%), hsl(${h2}, 80%, 50%))`
          : `radial-gradient(circle at center, hsl(${h1}, 80%, 50%), hsl(${h2}, 80%, 50%))`;

        li.style.background = bkgd;
        host.send(JSON.stringify({ bkgd }));
        return;
      }

      guests[key].orientation = orientation;
    };

    const onOffer = (data: DataSnapshot | null) => {
      if (!(data && data.val())) {
        return;
      }

      host.signal(data.val());
    };

    host
      .on('signal', onSignal)
      .on('connect', onConnect)
      .on('error', onErrorCloseOrEnd)
      .on('close', onErrorCloseOrEnd)
      .on('end', onErrorCloseOrEnd)
      .on('data', onData);

    offer.on('value', onOffer);
  };

  const onConnectionRemoved = (connection: DataSnapshot | null) => {
    if (!(connection && connection.key)) {
      return;
    }

    const { key } = connection;

    removeGuest(key);
    log(`connection: ${key} - removed\n`);
  };

  connections.on('child_added', onConnectionAdded);
  connections.on('child_removed', onConnectionRemoved);
});
