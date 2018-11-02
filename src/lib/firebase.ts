import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';

firebase.initializeApp({
  apiKey: 'AIzaSyDMhnS2dJk0yTMERT0j4g6jEQ80_nikPHw',
  authDomain: 'flickering-torch-6356.firebaseapp.com',
  databaseURL: 'https://flickering-torch-6356.firebaseio.com',
  projectId: 'flickering-torch-6356',
  storageBucket: 'flickering-torch-6356.appspot.com',
  messagingSenderId: '60549942221',
});

export const auth = firebase.auth();
export const database = firebase.database();
