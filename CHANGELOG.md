# [1.9.0](https://github.com/fartts/superfluity/compare/v1.8.2...v1.9.0) (2019-07-27)


### Bug Fixes

* **host/main.ts:** fixes a double room key issue ([905c20a](https://github.com/fartts/superfluity/commit/905c20a))
* **package.json:** enable https in dev ([9253861](https://github.com/fartts/superfluity/commit/9253861)), closes [/developer.apple.com/documentation/safari_release_notes/safari_12_1_release_notes#3130296](https://github.com//developer.apple.com/documentation/safari_release_notes/safari_12_1_release_notes/issues/3130296)


### Features

* **host/main.ts:** use the same bytes every time in dev ([e7b8249](https://github.com/fartts/superfluity/commit/e7b8249))

## [1.8.2](https://github.com/fartts/superfluity/compare/v1.8.1...v1.8.2) (2019-07-18)


### Bug Fixes

* **player/main:** maybe HTMLMainElement was overspecified and removed intentionally? ([bf822ef](https://github.com/fartts/superfluity/commit/bf822ef))

## [1.8.1](https://github.com/fartts/superfluity/compare/v1.8.0...v1.8.1) (2019-04-15)


### Bug Fixes

* **package.json:** uwe the patched version of sr-gh-pr ([8b42c54](https://github.com/fartts/superfluity/commit/8b42c54))

# [1.8.0](https://github.com/fartts/superfluity/compare/v1.7.0...v1.8.0) (2018-11-29)


### Features

* **host, player:** add the concept of rooms, allows multiple hosts to exist w/o killing other guest ([ed194f4](https://github.com/fartts/superfluity/commit/ed194f4))

# [1.7.0](https://github.com/fartts/superfluity/compare/v1.6.0...v1.7.0) (2018-11-18)


### Features

* **box2d:** add a box2d world for each guest, it's only got one ball in it for now, but it works da ([cbdb658](https://github.com/fartts/superfluity/commit/cbdb658))
* **host:** adds a canvas and some styling for it, also inverts the z(?) axis ([6db4d85](https://github.com/fartts/superfluity/commit/6db4d85))

# [1.6.0](https://github.com/fartts/superfluity/compare/v1.5.0...v1.6.0) (2018-11-18)


### Features

* **host, player:** a bunch of little tweaks to make things look nicer ([040ab57](https://github.com/fartts/superfluity/commit/040ab57))
* **host, player:** add fusion pose sensor, get orientation as quaternion and convert to rotation ma ([6549d7f](https://github.com/fartts/superfluity/commit/6549d7f))
* **package.json, yarn.lock:** add cardboard-vr-display dependency ([cdac997](https://github.com/fartts/superfluity/commit/cdac997))

# [1.5.0](https://github.com/fartts/superfluity/compare/v1.4.0...v1.5.0) (2018-11-18)


### Features

* **host, player:** make useMotion a common switch, add some mobile web app stuff to player's html, ([f189cd3](https://github.com/fartts/superfluity/commit/f189cd3))
* **package.json, yarn.lock:** add gyronorm dep ([d668962](https://github.com/fartts/superfluity/commit/d668962))
* **player:** make the main view unscrollable ([a92b831](https://github.com/fartts/superfluity/commit/a92b831))
* **player:** use gyronorm for orientation data ([71c231e](https://github.com/fartts/superfluity/commit/71c231e))
* **types:** add a Guest type that's a player's host instance plus the player's orientation and acce ([6c39ebd](https://github.com/fartts/superfluity/commit/6c39ebd))

# [1.4.0](https://github.com/fartts/superfluity/compare/v1.3.1...v1.4.0) (2018-11-09)


### Features

* **host:** better styling for multiple players, some notes, hide cursor on host ([9f01e6e](https://github.com/fartts/superfluity/commit/9f01e6e))

## [1.3.1](https://github.com/fartts/superfluity/compare/v1.3.0...v1.3.1) (2018-11-09)


### Bug Fixes

* **host:** generate the right player url ([c8e2f02](https://github.com/fartts/superfluity/commit/c8e2f02))

# [1.3.0](https://github.com/fartts/superfluity/compare/v1.2.0...v1.3.0) (2018-11-09)


### Features

* **host:** add a nicer looking auto updating logger to the works ([9661152](https://github.com/fartts/superfluity/commit/9661152))
* **host:** generate a qr code for the player URL ([f409b82](https://github.com/fartts/superfluity/commit/f409b82))
* **host:** generates a qrcode and shows it on the screen ([9c7d0ca](https://github.com/fartts/superfluity/commit/9c7d0ca))
* **host:** some more tweaking the logger output and styles ([c5645d4](https://github.com/fartts/superfluity/commit/c5645d4))
* **host [mostly]:** host now keeps a record of connections and cleans them up if/when they die, doe ([2a6d092](https://github.com/fartts/superfluity/commit/2a6d092))

# [1.2.0](https://github.com/fartts/superfluity/compare/v1.1.1...v1.2.0) (2018-11-09)


### Features

* **host:** make the pre element not interfere with the main/div setup ([c4b1010](https://github.com/fartts/superfluity/commit/c4b1010))
* **host/player:** add custome stylesheets for each endpoint, start tweaking styles ([9ca89d6](https://github.com/fartts/superfluity/commit/9ca89d6))
* **player state:** break connecting into calling (offer) and receiving (answer) before going to con ([61314ca](https://github.com/fartts/superfluity/commit/61314ca))
* **player styles:** add styling for loading, signed-in, connecting, connected, signed-out, and erro ([516fd20](https://github.com/fartts/superfluity/commit/516fd20))
* **player: try again:** add transition for button visibility/styling ([1f8e157](https://github.com/fartts/superfluity/commit/1f8e157))

## [1.1.1](https://github.com/fartts/superfluity/compare/v1.1.0...v1.1.1) (2018-11-02)


### Bug Fixes

* **package.json:** updates public url because this is a project page ([7f745a7](https://github.com/fartts/superfluity/commit/7f745a7))

# [1.1.0](https://github.com/fartts/superfluity/compare/v1.0.0...v1.1.0) (2018-11-02)


### Features

* **device orientation:** a single rotating rectangle feels pretty good ([1ec62fb](https://github.com/fartts/superfluity/commit/1ec62fb))
* **firebase:** adds firebase creds ([09ca470](https://github.com/fartts/superfluity/commit/09ca470))
* **lib/rtc-data.ts:** more fleshing out the constructor/class/options ([91b3283](https://github.com/fartts/superfluity/commit/91b3283))
* **lib/rtc-data.ts:** start of an rtc-data stream object ([f15821e](https://github.com/fartts/superfluity/commit/f15821e))
* **package.json, yarn.lock:** yarn add firebase ([c71536c](https://github.com/fartts/superfluity/commit/c71536c))
* **simple-peer:** add simple-peer, wire up the example app just to get it working ([5ffb71a](https://github.com/fartts/superfluity/commit/5ffb71a))

# 1.0.0 (2018-10-27)


### Features

* **package.json, src/:** it builds ([107293e](https://github.com/fartts/superfluity/commit/107293e))
