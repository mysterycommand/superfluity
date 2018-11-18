import firebase from 'firebase/app';
import 'firebase/database';

import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';
import { DataSnapshot, SignalData } from '../lib/types';

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

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  main.className = 'signed-in';
  const { uid } = userCredential.user;

  const connections = database.ref('/connections');
  const connection = connections.push({
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  });

  const offer = connection.child('offer').ref;
  const answer = connection.child('answer').ref;

  connection.onDisconnect().set(null);

  const player = new Peer({ initiator: true, trickle: false });

  const onSignal = (data: SignalData) => {
    if (data.type !== 'offer') {
      return;
    }

    main.className = 'calling';
    offer.set({ ...data, uid });
  };

  const onDeviceOrientation = (event: DeviceOrientationEvent) => {
    const { absolute, alpha, beta, gamma } = event;
    player.send(
      JSON.stringify({ width, height, absolute, alpha, beta, gamma }),
    );
  };

  const onConnect = () => {
    main.className = 'connected';
    h1.textContent = `player: ${playerUuid}`;

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

    window.addEventListener('deviceorientation', onDeviceOrientation);
  };

  const onData = (data: string) => {
    const parsed = JSON.parse(data);

    if (parsed.time) {
      const message = JSON.stringify(parsed, null, 2);
      const time = new Date().toLocaleTimeString();

      // tslint:disable-next-line no-console
      console.log(`player.on 'data':\n/* ${time} */\n${message}\n\n`);
    }
  };

  const onErrorCloseOrEnd = () => {
    main.className = 'error';
    h1.textContent = 'sorry player';

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
