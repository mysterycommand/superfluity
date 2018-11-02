import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';

import '../main.css';

// const pre = document.querySelector('pre') as HTMLPreElement;

auth.signInAnonymously().then(userCredential => {
  if (!(userCredential && userCredential.user)) {
    return;
  }

  const connections = database.ref('/connections');
  connections.on('child_added', connection => {
    if (!connection) {
      return;
    }

    const offer = connection.child('offer').ref;
    const answer = connection.child('answer').ref;

    const host = new Peer({ initiator: false, trickle: false });
    console.log(host);

    host
      .on('signal', data => {
        if (data.type !== 'answer') {
          return;
        }

        answer.set(data);
      })
      .on('connect', () => {
        console.log('connect');
      })
      .on('data', data => {
        console.log('data', JSON.parse(data));
      });

    offer.once('value', data => {
      if (!(data && data.val())) {
        return;
      }

      console.log(data.val());
      host.signal(data.val());
    });
  });
});

// database.ref('/offer').on('value', snapshot => {
//   if (!snapshot || !snapshot.val()) {
//     return;
//   }

//   console.log('offer', snapshot.val());

//   if (!isInitiator()) {
//     peer.signal(JSON.stringify(snapshot.val()));
//   }
// });

// database.ref('/answer').on('value', snapshot => {
//   if (!snapshot || !snapshot.val()) {
//     return;
//   }

//   if (isInitiator()) {
//     peer.signal(JSON.stringify(snapshot.val()));
//   }
// });

// const isInitiator = () => location.hash === '#1';

// const peer = new Peer({ initiator: isInitiator(), trickle: false });
// Object.defineProperty(window, 'peer', {
//   value: peer,
// });

// peer.on('error', (error: Error) => {
//   console.log('error', error); // tslint:disable-line
// });

// peer.on('signal', (data: {}) => {
//   console.log('SIGNAL', JSON.stringify(data)); // tslint:disable-line
//   (document.querySelector(
//     '#outgoing',
//   ) as HTMLPreElement).textContent = JSON.stringify(data);

//   if (isInitiator()) {
//     database.ref('/offer').set(data);
//   } else {
//     database.ref('/answer').set(data);
//   }
// });

// (document.querySelector('form') as HTMLFormElement).addEventListener(
//   'submit',
//   (event: Event) => {
//     event.preventDefault();
//     peer.signal(
//       JSON.parse(
//         (document.querySelector('#incoming') as HTMLTextAreaElement).value,
//       ),
//     );
//   },
// );

// peer.on('connect', () => {
//   console.log('CONNECT'); // tslint:disable-line
//   peer.send(JSON.stringify({ whatever: Math.random() }));
// });

// peer.on('data', (data: string) => {
//   console.log('data:', JSON.parse(data)); // tslint:disable-line
// });

// window.addEventListener('deviceorientation', event => {
//   event.preventDefault();
//   const { absolute, alpha, beta, gamma } = event;
//   peer.send(JSON.stringify({ absolute, alpha, beta, gamma }));
// });

// window.addEventListener('load', () => {
//   if (isInitiator()) {
//     database.ref('/offer').set(null);
//   }

//   database.ref('/answer').set(null);
// });
