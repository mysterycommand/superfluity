import './main.css';

import Peer from './lib/peer';

const data = new Peer({ initiator: true });
console.log(data.id);
