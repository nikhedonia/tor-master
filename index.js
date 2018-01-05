const proxyfier = require('superagent-proxy');
const openports = require('openports');
const net = require('net');
const tmp = require('tmp');
const request  = require('superagent');
const uuid = require('uuid/v4');
const { spawn, exec } = require('child_process');
proxyfier(request);

function generateTorPassword() {
  const password = uuid();
  return new Promise( (done, reject) => {
    exec(`tor --hash-password ${password}`, (err, hash, stderr) => {
      if (err) return reject({error, stderr});
      return done({password, hash:hash.trim()});
    })
  });
}

function execTor(command, password, port, host='localhost') {
  return new Promise( (done, reject) => {
    const socket = net.connect({
      host, port
    }, () => {
      let data='';
      socket.write(command);
      socket.on('error', e => reject(e||data));
      socket.on('data', res => data+=res.toString());
      socket.on('end', () => done(data));
    })
  })
}

function changeIPTor(password, port, host='localhost') {
  return execTor([
   `authenticate "${password}"`, 
   'signal newnym', 
   'quit',
   ''
  ].join('\n'), password, port, host);
}


function killTor(password, port, host='localhost') {
  return execTor([
   `authenticate "${password}"`, 
   'signal shutdown', 
   'quit',
   ''
  ].join('\n'), password, port, host);
}


function spawnTorProcess(port, port2, tmpDir, {password, hash}, onStateChange=()=>{}) {
  let dead = false;
  const torProcess = spawn("tor", [
    `--CookieAuthentication 0`,
    `--HashedControlPassword "${hash}"`,
    `--DataDirectory "${tmpDir}"`,
    `--ControlPort ${port2}`,
    `--SocksPort ${port}`], 
    {shell:true, detached:true}
  );

  process.on('SIGINT', () => {
    if (!dead) {
      process.kill(-torProcess.pid);
    }
  })

  return new Promise( (done, reject) => {
    let data = '';
    let success=false;
    let killLock=null;
    let changeIPLock=null;
    torProcess.stderr.on('data', b=>data+=b.toString());
    torProcess.stderr.on('end', ()=>success||reject(data));
    torProcess.stdout.on('end', ()=>success||reject());
    torProcess.stdout.on('data', data => {
      onStateChange(data.toString());
      if (data.toString('utf8').indexOf('Done')>-1) {
        success=true;
        return done({
          port,
          controlPort:port2,
          tmp: tmpDir,
          process: torProcess,
          get: (url) => request.get(url).proxy('socks://localhost:'+port),
          put: (url) => request.put(url).proxy('socks://localhost:'+port),
          post: (url) => request.post(url).proxy('socks://localhost:'+port),
          delete: (url) => request.delete(url).proxy('socks://localhost:'+port),
          changeIP:  () => changeIPLock||(changeIPLock=changeIPTor(password, port2).then( () => {
            changeIPLock=null;
          })),
          end: () => killLock||(killLock=killTor(password, port2).then( () => {
            killLock=null;
            dead=true;
          }))
        });
      }  
    });
  })
}

function createTorAgent(onStateChange=()=>{}) {
  const ports = new Promise( (done, reject) => openports(2, (e, ports) => e? reject(e) : done(ports)));
  const tmpobj = new Promise( (done, reject) => tmp.dir({unsafeCleanup:1}, (e, path, cleanup) => e? reject(e) : done({path, cleanup})));
  const pair = generateTorPassword();
  
  return Promise.all([ports, pair, tmpobj]).then(
    ([ports, pair, {path, cleanup}]) => {
      return spawnTorProcess(ports[0], ports[1], path, pair, onStateChange).then(
        tor => {
          tor.process.on('exit', cleanup);
          return tor;
        }
      ).catch(e=>console.log(e));
    }
  )
}

module.exports = {
  generateTorPassword,
  killTor,
  changeIPTor,
  spawnTorProcess,
  createTorAgent
}


