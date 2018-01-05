
Promise.all([
  require('.').createTorAgent(),
  require('.').createTorAgent(),
  require('.').createTorAgent()
]).then( ([a,b,c]) => {
  a.get('https://api.ipify.org').then(x => console.log(x.text)).then(()=>{
    b.get('https://api.ipify.org').then(x => console.log(x.text))
  }).then(() => {
    c.get('https://api.ipify.org').then(x=>console.log(x.text))
      .then(() => c.changeIP())
      .then(()=>c.get('https://api.ipify.org').then(x=>console.log(x.text)))
      .then(()=>a.get('https://api.ipify.org').then(x=>console.log(x.text)))
  })
})
