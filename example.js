const {createTorAgent} = require('tor-master');

createTorAgent().then( agent=> {
  return agent.request('https://api.ipify.org')
    .then( ({body}) => console.log(body))
    .then( () => agent.request('https://api.ipify.org'))
    .then( ({body}) => console.log(body))
    .then( () => agent.renew())
    .then( () => agent.request('https://api.ipify.org'))
    .then( ({body}) => console.log(body))
    .then( () => agent.end());
}).catch( e => console.log(e));
