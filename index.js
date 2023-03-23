
var express = require('express');
var path = require('path');
var app = express();
const bodyParser = require('body-parser');
var cors = require('cors');
require('dotenv').config();
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
var snowflake = require('snowflake-sdk');
let port = process.env.PORT;


if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function () {
  console.log('App listening on port '+port);
})



function connect(){
    var connection = snowflake.createConnection( {
        account: process.env.ACCOUNT,
        username: process.env.USERNAME,
        password: process.env.PASSWORD
        }
        );
        connection.connect( 
          function(err, conn) {
              if (err) {
                  console.error('Unable to connect: ' + err.message);
                  } 
              }
        )
}


 
app.post('/msg', async function (req, res) {
//   writeToStage(req.body);
  res.send({message_back:"got it!"});

})
// app.get('/', async function (req, res) {
// //   res.redirect("/game")
// })
app.use(express.static(path.join(__dirname, "/public")));