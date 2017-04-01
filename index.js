"use strict";
var https = require('https');
var querystring = require('querystring');
var SlackRobot = require('slack-robot');
var robot = new SlackRobot(process.env.SLACK_TOKEN);

var spawn = require('child_process').spawn;
var options = { stdio: [null, null, null, 'pipe'] };
var child = null;

var $res = null;
var $interval = null;

var Nancy = {
  'init': function() {
    child = spawn('./a.out', [], options);
    child.stdout.setEncoding('utf-8');
    child.stdin.setEncoding('utf-8');


    child.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });

    child.stdout.on('data', function(data) {
      if (data.length > 0) {
        var out = data.replace(/@?frank:?/i, '').trim();
        /* // 明確表示不懂
        if (out == "NANCY_UNKNOW") {
          return; // unknown message
        }
        */
        console.log('reply:"' + out + '"');
        Nancy.callback(out);
      }
    });

    child.on('close', function(code) {
      console.log('closed');
      Nancy.init();
    });
    if ($interval) {
      clearInterval($interval);
    }
    //$interval = setInterval(function(){child.kill('SIGINT');}, 10000);
    $interval = setInterval(function(){child.stdin.write("exit\n");}, 3600000);
  },
  'callback': function(out) {
    $res.text(out).send();
  }
};


Nancy.init();

// will post 'world' text as bot when receiving 'hello' message
// in channel, group, or direct message
robot.listen(/.*/, function (req, res) {
  $res = res;
  if (!req.message || !req.message.value) {
    console.log("no message");
     return;
  }
  var msg = req.message.value.text;
  if (!req.to) {
    console.log("no to");
    return;
  }

  msg = msg.replace(/@?frank:?/i, '').trim();
  console.log('got:"' + msg + '"');

  if (req.message.value.mentioned != true) {
    if (req.to.type != 'dm') {
      // 2% 的機率亂入
      if (Math.floor((Math.random() * 100) + 1) < 99) {
        console.log("skip: " + msg);
        return;
      }
    }
  }
  if (req.to && req.to.type != 'dm') {
    if (msg.match(/=/) && req.message.value.mentioned != true) {
      console.log("skip " + msg);
      return; // Group chat 不處理帶有 = 的語句
    }
  }
  child.stdin.write(msg + "\n");
});

// ignore message from '#general' channel, even if it matches the listener
robot.ignore('#general');

// start listening
robot.start();
