import firebase from 'firebase/app';
import 'firebase/database';

import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';
import { DataSnapshot, SignalData } from '../lib/common';

import './main.css';

const main = document.querySelector('main') as HTMLMainElement;
const h1 = document.querySelector('h1') as HTMLHeadingElement;
const button = document.querySelector('button') as HTMLButtonElement;

const { innerWidth: width, innerHeight: height } = window;

main.className = 'loading';
button.addEventListener('click', event => {
  event.preventDefault();
  location.reload(true);
});

const randomBytes = (size = 2) => {
  const raw = new Uint8Array(size);

  if (size > 0) {
    crypto.getRandomValues(raw);
  }

  return Buffer.from(raw.buffer);
};

// window.addEventListener('orientationchange', () => {
//   const { orientation } = window;

//   const o = parseInt(`${orientation}`, 10);
//   const isPortrait = o % 180 === 0;

//   main.style.transform = isPortrait ? '' : `rotate(${-o}deg)`;
// });

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  main.className = 'signed-in';
  h1.textContent = 'logged in';
  const { uid } = userCredential.user;

  const connections = database.ref('/connections');
  const connection = connections.push({
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  });

  const offer = connection.child('offer').ref;
  const answer = connection.child('answer').ref;

  connection.onDisconnect().set(null);

  const player = new Peer({ initiator: true, trickle: false });

  const device = {
    accelerometer: { alpha: 0, beta: 0, gamma: 0 },
    orientation: { alpha: 0, beta: 90, gamma: 0 },
    gyroscope: { alpha: 0, beta: 0, gamma: 0 },
  };

  let pt = performance.now();
  let dt = 0;

  const send = (t: DOMHighResTimeStamp) => {
    requestAnimationFrame(send);

    dt = t - pt;
    pt = t;

    const {
      accelerometer: { alpha: aa, beta: ab, gamma: ag },
      orientation: { alpha: oa, beta: ob, gamma: og },
      gyroscope: { alpha: ga, beta: gb, gamma: gg },
    } = device;

    device.orientation = {
      alpha: 0.98 * (oa + ga * (dt / 1000)) + 0.02 * aa,
      beta: 0.98 * (ob + gb * (dt / 1000)) + 0.02 * ab,
      gamma: 0.98 * (og - gg * (dt / 1000)) + 0.02 * ag,
    };

    player.send(JSON.stringify(device.orientation));
  };

  requestAnimationFrame(send);

  const onSignal = (data: SignalData) => {
    if (data.type !== 'offer') {
      return;
    }

    main.className = 'calling';
    h1.textContent = 'connecting…';
    offer.set({ ...data, uid });
  };

  const onDeviceOrientation = (event: DeviceOrientationEvent) => {
    const { alpha, beta, gamma } = event;
    device.accelerometer = {
      alpha: alpha || 0,
      beta: beta || 0,
      gamma: gamma || 0,
    };
    // player.send(JSON.stringify({ alpha, beta, gamma }));
  };

  const onDeviceMotion = (event: DeviceMotionEvent) => {
    if (!event.rotationRate) {
      return;
    }

    const { alpha, beta, gamma } = event.rotationRate;
    device.gyroscope = {
      alpha: alpha || 0,
      beta: beta || 0,
      gamma: gamma || 0,
    };
    // player.send(JSON.stringify({ alpha, beta, gamma }));
  };

  const onConnect = () => {
    main.className = 'connected';
    h1.textContent = `${playerUuid}`;

    const time = new Date().toLocaleTimeString();
    player.send(
      JSON.stringify({
        width,
        height,
        connection: connection.key,
        player: playerUuid,
        time,
      }),
    );

    window.addEventListener('devicemotion', onDeviceMotion);
    window.addEventListener('deviceorientation', onDeviceOrientation);
  };

  const onData = (data: string) => {
    const { host, time, bkgd } = JSON.parse(data);

    if (time) {
      if (process.env.NODE_ENV === 'development') {
        const message = JSON.stringify({ host, time }, null, 2);
        // tslint:disable-next-line no-console
        console.log(`player.on 'data':\n${message}\n\n`);
      }

      return;
    }

    main.style.background = bkgd;
  };

  const onErrorCloseOrEnd = () => {
    main.className = 'error';
    h1.textContent = 'sorry player something went wrong';

    window.removeEventListener('devicemotion', onDeviceMotion);
    window.removeEventListener('deviceorientation', onDeviceOrientation);
  };

  const onAnswer = (data: DataSnapshot | null) => {
    if (!(data && data.val())) {
      return;
    }

    // tslint:disable-next-line no-console
    console.log(
      `answer.on 'value':\n${JSON.stringify(data.val(), null, 2)}\n\n`,
    );

    main.className = 'receiving';
    player.signal(data.val());
  };

  const playerUuid = randomBytes()
    .toString('hex')
    .slice(0, 7);

  player
    .on('signal', onSignal)
    .on('connect', onConnect)
    .on('error', onErrorCloseOrEnd)
    .on('close', onErrorCloseOrEnd)
    .on('end', onErrorCloseOrEnd)
    .on('data', onData);

  answer.on('value', onAnswer);
});
