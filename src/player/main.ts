import firebase from 'firebase/app';
import 'firebase/database';

import Peer from 'simple-peer';
import GyroNorm from 'gyronorm';

import { auth, database } from '../lib/firebase';

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

  const gyro = new GyroNorm();
  const init = gyro.init();

  // const onDeviceOrientation = (event: DeviceOrientationEvent) => {
  //   const { absolute, alpha, beta, gamma } = event;
  //   player.send(
  //     JSON.stringify({ width, height, absolute, alpha, beta, gamma }),
  //   );
  // };

  /**
   * TODO: @mysterycommand - maybe type this? I'm not crazy about the API though
   * maybe reimplement but do less, modern browsers only, etc.
   *
   * @see: https://github.com/dorukeker/gyronorm.js#how-to-use
   */
  const onData = (data: {
    do: { alpha: number; beta: number; gamma: number; absolute: boolean };
    dm: {
      alpha: number;
      beta: number;
      gamma: number;

      x: number;
      y: number;
      z: number;

      gx: number;
      gy: number;
      gz: number;
    };
  }) => {
    const {
      do: { absolute, alpha, beta, gamma },
    } = data;

    player.send(
      JSON.stringify({ width, height, absolute, alpha, beta, gamma }),
    );
  };

  const onErrorCloseOrEnd = () => {
    main.className = 'error';
    h1.textContent = 'sorry player';

    // window.removeEventListener('deviceorientation', onDeviceOrientation);
    init.then(() => {
      gyro.stop();
    });
  };

  const randomBytes = (size = 2) => {
    const raw = new Uint8Array(size);

    if (size > 0) {
      crypto.getRandomValues(raw);
    }

    return Buffer.from(raw.buffer);
  };

  const playerUuid = randomBytes()
    .toString('hex')
    .slice(0, 7);

  // tslint:disable-next-line no-console
  console.log(
    `connection:\n${JSON.stringify(
      {
        connection: connection.key,
        player: playerUuid,
      },
      null,
      2,
    )}\n\n`,
  );

  player
    .on('signal', data => {
      if (data.type !== 'offer') {
        return;
      }

      main.className = 'calling';
      offer.set({ ...data, uid });
    })
    .on('connect', () => {
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

      // window.addEventListener('deviceorientation', onDeviceOrientation);
      init.then(() => {
        gyro.start();
      });
    })
    .on('error', onErrorCloseOrEnd)
    .on('close', onErrorCloseOrEnd)
    .on('end', onErrorCloseOrEnd)
    .on('data', data => {
      const parsed = JSON.parse(data);

      if (parsed.time) {
        const message = JSON.stringify(parsed, null, 2);
        const time = new Date().toLocaleTimeString();

        // tslint:disable-next-line no-console
        console.log(`player.on 'data':\n/* ${time} */\n${message}\n\n`);
      }
    });

  answer.on('value', data => {
    if (!(data && data.val())) {
      return;
    }

    // tslint:disable-next-line no-console
    console.log(
      `answer.on 'value':\n${JSON.stringify(data.val(), null, 2)}\n\n`,
    );

    main.className = 'receiving';
    player.signal(data.val());
  });
});
