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
    .then( () => agent.get('https://api.ipify.org'))
    .then( ({body}) => console.log(body))
    .then( () => agent.changeIP())
    .then( () => agent.get('https://api.ipify.org'))
    .then( ({body}) => console.log(body))
    .then( () => agent.end()); // kill the tor demon
}).catch( e => console.log(e));
```


# Available methods

## get, post, put, delete

get, post, put and delete return are monkeypatched superagent methods.
More information can be found [here](https://github.com/visionmedia/superagent)

## changeIP

Changes the Tor exit node and returns a promise containing a string message.
Multiple calls to changeIP coalesce to one.

