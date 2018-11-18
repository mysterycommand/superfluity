import Peer from 'simple-peer';
import { toCanvas, QRCodeRenderersOptions } from 'qrcode';

import { auth, database } from '../lib/firebase';
import { DataSnapshot, SignalData, Guest } from '../lib/common';

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

    const xf = [
      `rotateX(${orientation.alpha}deg)`,
      `rotateY(${orientation.beta}deg)`,
      `rotateZ(${orientation.gamma}deg)`,
    ];

    li.style.transform = xf.join(' ');
    if (process.env.NODE_ENV === 'development') {
      li.innerText = xf.join('\n');
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
      orientation: { alpha: 0, beta: 0, gamma: 0 },
      host,
    };

    const li = document.createElement('li');
    li.id = `connection-${key}`;

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
      const { time, player, width, height, alpha, beta, gamma } = JSON.parse(
        data,
      );

      if (time) {
        const localTime = new Date().toLocaleTimeString();

        log(
          `\nplayer: ${player} - added\nplayer time: ${time}\nhost time: ${localTime}\n\n`,
        );

        li.style.width = `${width / 2}px`;
        li.style.height = `${height / 2}px`;
        li.innerText = player;

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

      guests[key].orientation = { alpha, beta, gamma };
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
