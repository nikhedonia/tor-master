require('.')
  .createTorAgent()
    .then(a=>a.get('https://api.ipify.org'))
    .then(x=>console.log(x.text));

require('.')
  .createTorAgent()
    .then(a=>a.get('https://api.ipify.org'))
    .then(x=>console.log(x.text))
