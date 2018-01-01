# Tor-Master - control your tor demon and send requests

# description

Starts a tor demon and sends requests over tor.

Make save requests over a tor.

requires tor installed and be in your path

# Example

```js

const {createTorAgent} = require('tor-master');

createTorAgent( msg=>console.log(msg) ).then( agent=> {
  return agent.get('https://api.ipify.org') //uses superagent
    .then( ({body}) => console.log(body))
    .then( () => agent.request('https://api.ipify.org'))
    .then( ({body}) => console.log(body))
    .then( () => agent.renew()) // changeip
    .then( () => agent.request('https://api.ipify.org'))
    .then( ({body}) => console.log(body))
    .then( () => agent.end()); // kill the tor demon
}).catch( e => console.log(e));
```
