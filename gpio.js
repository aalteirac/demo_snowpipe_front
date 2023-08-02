const Gpio = require('pigpio').Gpio;

const motor = new Gpio(17, {mode: Gpio.OUTPUT});

let pulseWidth = 1000;
let increment = 1000;


function run(){
    var inter=setInterval(() => {
        motor.servoWrite(pulseWidth);
      
        pulseWidth += increment;
        if (pulseWidth >= 2000) {
          increment = -1000;
        } else if (pulseWidth <= 1000) {
          increment = 1000;
        }
      }, 500);
    setTimeout(() => {
        clearInterval(inter)
    }, 15000);  
}



exports.run = run;