import firebase from 'firebase/app';
import 'firebase/database';

import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';
import { DataSnapshot, SignalData } from '../lib/types';

import PoseSensor from 'cardboard-vr-display/src/sensor-fusion/fusion-pose-sensor';

import './main.css';
import randomBytes from '../lib/random-bytes';

const main = document.querySelector('main') as HTMLElement;
const h1 = document.querySelector('h1') as HTMLHeadingElement;
const button = document.querySelector('button') as HTMLButtonElement;

const { innerWidth: width, innerHeight: height } = window;
const { hash } = location;

main.className = 'loading';
button.addEventListener('click', (event) => {
  event.preventDefault();
  location.reload(true);
});

auth.signInAnonymously().then((userCredential) => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  main.className = 'signed-in';
  h1.innerText = 'logged in';
  const { uid } = userCredential.user;

  const connections = database.ref(`/rooms/${hash.slice(1)}/connections`);
  const connection = connections.push({
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  });

  const offer = connection.child('offer').ref;
  const answer = connection.child('answer').ref;

  connection.onDisconnect().set(null);

  const player = new Peer({ initiator: true, trickle: false });
  const poseSensor = new PoseSensor(
    0.98,
    0.04,
    false,
    process.env.NODE_ENV === 'development',
  );
  let frameId = -1;

  const send = (t: DOMHighResTimeStamp) => {
    frameId = requestAnimationFrame(send);
    const o = poseSensor.getOrientation();
    player.send(JSON.stringify({ orientation: [].slice.call(o) }));
  };

  const onSignal = (data: SignalData) => {
    if (data.type !== 'offer') {
      return;
    }

    main.className = 'calling';
    h1.innerText = 'connecting…';
    offer.set({ ...data, uid });
  };

  const onConnect = () => {
    main.className = 'connected';
    h1.innerText = `${playerUuid}`;

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

    frameId = requestAnimationFrame(send);
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
    h1.innerHTML = 'sorry player<br />something went wrong';
    cancelAnimationFrame(frameId);
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

  const playerUuid = randomBytes().toString('hex').slice(0, 7);

  player
    .on('signal', onSignal)
    .on('connect', onConnect)
    .on('error', onErrorCloseOrEnd)
    .on('close', onErrorCloseOrEnd)
    .on('end', onErrorCloseOrEnd)
    .on('data', onData);

  answer.on('value', onAnswer);
});
