import { User } from 'firebase';
import Peer from 'simple-peer';

import { auth, database } from '../lib/firebase';

import '../main.css';

const pre = document.querySelector('pre') as HTMLPreElement;

auth.signInAnonymously().then(userCredential => {
  if (!userCredential) {
    return;
  }
});
