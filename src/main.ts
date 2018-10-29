import './main.css';

import Peer from 'simple-peer';

const peer = new Peer({ initiator: location.hash === '#1', trickle: false });
Object.defineProperty(window, 'peer', {
  value: peer,
});

peer.on('error', (error: Error) => {
  console.log('error', error); // tslint:disable-line
});

peer.on('signal', (data: {}) => {
  console.log('SIGNAL', JSON.stringify(data, null, 2)); // tslint:disable-line
  (document.querySelector(
    '#outgoing',
  ) as HTMLPreElement).textContent = JSON.stringify(data);
});

(document.querySelector('form') as HTMLFormElement).addEventListener(
  'submit',
  (event: Event) => {
    event.preventDefault();
    peer.signal(
      JSON.parse(
        (document.querySelector('#incoming') as HTMLTextAreaElement).value,
      ),
    );
  },
);

peer.on('connect', () => {
  console.log('CONNECT'); // tslint:disable-line
  peer.send('whatever' + Math.random());
});

peer.on('data', (data: string) => {
  console.log('data: ' + data); // tslint:disable-line
});
