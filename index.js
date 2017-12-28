const Https = require('socks5-https-client/lib/Agent');
const Http = require('socks5-http-client/lib/Agent');
const openports = require('openports');
const net = require('net');
const tmp = require('tmp');
const request  = require('request');
const uuid = require('uuid/v4');
const { spawn, exec } = require('child_process');

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

function renewTor(password, port, host='localhost') {
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


function requestOverTor(url, options={}, port, host = 'localhost') {
  const Agent = url.slice(0,5) == 'https' ? Https : Http;
  return new Promise( (done, reject) => request(Object.assign({
    url,
    agentClass: Agent,
    agentOptions: {
      socksHost: 'localhost', // Host set in config file.
      socksPort: port  // Port set in config file.
    }, options}), (e, res) => {
      if (e) return reject(e);
      return done(res)
    }
  ));
};

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

  process.on('exit', () => {
    if (!dead) {
      process.kill(-torProcess.pid);
    }
  })

  return new Promise( (done, reject) => {
    let data = '';
    let success=false;
    let killLock=null;
    let renewLock=null;
    torProcess.stderr.on('data', b=>data+=b.toString());
    torProcess.stderr.on('end', ()=>success||reject(data));
    torProcess.stdout.on('end', ()=>success||reject());
    torProcess.stdout.on('data', data => {
      onStateChange(data.toString());
      if (data.toString('utf8').indexOf('Done')>-1) {
        success=true;
        return done({
          process: torProcess,
          request: (url, options) => requestOverTor(url, options, port),
          renew:  () => renewLock||(renewLock=renewTor(password, port2).then( () => {
            renewLock=null;
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
  const ports = new Promise( (done, reject) => openports(2, (e, ports)=> e? reject(e) : done(ports)));
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
  renewTor,
  requestOverTor,
  spawnTorProcess,
  createTorAgent
}


