
var express = require('express');
const si = require('systeminformation');
var path = require('path');
var app = express();
const bodyParser = require('body-parser');
var cors = require('cors');
require('dotenv').config();
var snowflake = require('snowflake-sdk');
var crypto = require('crypto');
var fs = require('fs');
const config = require('config');
snowflake.configure({logLevel : 'ERROR'});

app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));


let port = process.env.PORT;
var privateKeyFile = fs.readFileSync('rsa_key.pem');
var connection=null;
const user = config.get('snow.user');
const account = config.get('snow.account');
const warehouse=config.get('snow.warehouse');
const role=config.get('snow.role');

if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function () {
  console.log('App listening on port '+port);
})

app.use(express.static(path.join(__dirname, "/public")));
const privateKeyObject = crypto.createPrivateKey({
  key: privateKeyFile,
  format: 'pem',
  passphrase: 'passphrase'
});

var privateKey = privateKeyObject.export({
  format: 'pem',
  type: 'pkcs8'
});

function connectSnow(){
    return new Promise((resolve,reject)=>{
        var c=snowflake.createConnection( {
          account: account,
          username: user,
          authenticator: "SNOWFLAKE_JWT",
          warehouse:warehouse,
          role:role,
          clientSessionKeepAlive:true,
          clientSessionKeepAliveHeartbeatFrequency:12000,
          privateKey: privateKey
        })
        
        c.connect( 
            (err)=> {
              if (err) {
                console.error('Unable to connect: ');
                reject(err);
              } else{
                connection=c; 
                resolve();
              }  
            })
    })
}

async function getRawValues(){
  return new Promise(async (resolve,reject)=>{
      if(connection==null)
          await connectSnow().catch((e)=>{
            console.log(e)
          });
    var statement =connection.execute({
      sqlText: `select * from snowpipe_streaming.dev.fromsdk where TS> dateadd(minute,-5,current_timestamp()) order by TS desc;`,
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute statement due to the following error: ' + err.message);
          return reject(err)
        } else {
          return resolve(rows);
        }
      }
    })
  })  
} 

async function getRawCount(){
  return new Promise(async (resolve,reject)=>{
      if(connection==null)
          await connectSnow().catch((e)=>{
            console.log(e)
          });
    var statement =connection.execute({
      sqlText: `select count(1) as rowcount from snowpipe_streaming.dev.fromsdk;`,
      complete: function(err, stmt, rows) {
        if (err) {
          console.error('Failed to execute statement due to the following error: ' + err.message);
          return reject(err)
        } else {
          return resolve(rows);
        }
      }
    })
  })  
} 

async function getTemp(){
  var info=await si.cpuTemperature();
  return info;
}


app.post('/msg', async function (req, res) {
  res.send({message_back:"got it!"});
})

app.get('/rawcount', async function (req, res) {
  var ret="";
  ret=await getRawCount();
  res.send({message_back:ret,info:await getTemp()})
})  

app.get('/rawval', async function (req, res) {
  var ret="";
  ret=await getRawValues();
  res.send({message_back:ret,info:await getTemp()})
})  

process.stdin.resume();

function destroyConnection(){
  return new Promise((resolve,reject)=>{
    if (connection!=null){
      console.log('clean');
      connection.destroy(function(err, conn) {
        if (err) {
          console.error('Unable to disconnect: ' + err.message);
          reject(err)
        } else {
          console.log('Disconnected connection');
          resolve()
        }
      });
    }
  })
}

async function exitHandler(options, exitCode) {
    if (options.cleanup) {
      await destroyConnection()
    }
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));