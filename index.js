"use strict";
const asana = require('asana');
var https = require('https');
var querystring = require('querystring');
var SlackRobot = require('slack-robot');
var robot = new SlackRobot(process.env.SLACK_TOKEN);

var spawn = require('child_process').spawn;
var options = { stdio: [null, null, null, 'pipe'] };
var child = null;

var $res = null;
var $interval = null;

var asanaClient = asana.Client.create().useAccessToken(process.env.ASANA_TOKEN);

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

  if (msg.match(/\.cafe/i)) {
    console.log("ignore frank.cafe");
    return;
  }

  msg = msg.replace(/@?frank:?/i, '').trim();
  console.log('got:"' + msg + '"');

  let reminderMatch = msg.match(/^提醒我(.*)/);
  if (reminderMatch) {
    let sender = req.from.name;
    let reminderMsg = reminderMatch[1].trim();
    let asanaTask = {
      name: `(${sender}) 請記得${reminderMsg}`,
      //tags: [88650505604939 /* v */],
      //notes: `notes`,
      projects: [154961323396368] // 工作看板
    };
    asanaClient.tasks.createInWorkspace(13451994895738 /* unisharp.com */, asanaTask);
    $res.text("加到 asana 了，提醒 @" + sender + ' ' + reminderMsg).send();
    return;
  }

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
