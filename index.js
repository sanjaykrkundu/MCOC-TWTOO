'use strict';


//------------------------------------
//     IMPORTS
//------------------------------------
const line = require('@line/bot-sdk');
const express = require('express');
let fs = require('fs');
let os = require('os');
let http = require('https');

//------------------------------------
//     CONFIGS
//------------------------------------
const config = {
  channelAccessToken: 'TOKEN',
  channelSecret: 'SECRET',
};

//------------------------------------
//     CONSTANTS
//------------------------------------
const filePaths = {
  DEFENCE_LIST: "./data/war defenders - Defence.csv",
  ACCOUNT_LIST: "./data/war defenders - AccountList.csv"
}

const urls = {
  ACCOUNT_LIST: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdPFD29dU3dXCbB4EERXhchLit84FSz2O3dT0QUy1NxZP9hA0xjU2pMlNJRC70RK07zfGwJ1M4XW-/pub?gid=192191816&single=true&output=csv",
  DEFENCE_LIST: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDdPFD29dU3dXCbB4EERXhchLit84FSz2O3dT0QUy1NxZP9hA0xjU2pMlNJRC70RK07zfGwJ1M4XW-/pub?gid=2132250749&single=true&output=csv"
}

const GROUPS = {
  "C173a3f0ccd6391f66ad8d268ea9c4bb4": "TWTOO",
  "Cd497a5b4a09bb47b74cfef18a848c27a": "OFFICERS",
  "Cd4a77fc16f20265b2605069a36088c93": "AW1 - TWTOO",
  "C5139cc51c0f5e8e719c69d26191141ef": "AW2 - TWTOO",
  "C04299a7d3bea6c8c16c670ec24af5174": "AW3 - TWTOO",
  "Ce80a758cb22b85324e16de1574ec3f90": "AQ1 - TWTOO",
  "C7a108adee84029729b14be799279291b": "AQ2 - TWTOO",
  "C54064dd68c20de685c969c454e38ed76": "AQ3 - TWTOO",
}

const GROUPIDS = {
  "TWTOO": "C173a3f0ccd6391f66ad8d268ea9c4bb4",
  "OFFICERS": "Cd497a5b4a09bb47b74cfef18a848c27a",
  "AW1 - TWTOO": "Cd4a77fc16f20265b2605069a36088c93",
  "AW2 - TWTOO": "C5139cc51c0f5e8e719c69d26191141ef",
  "AW3 - TWTOO": "C04299a7d3bea6c8c16c670ec24af5174",
  "AQ1 - TWTOO": "Ce80a758cb22b85324e16de1574ec3f90",
  "AQ2 - TWTOO": "C7a108adee84029729b14be799279291b",
  "AQ3 - TWTOO": "C54064dd68c20de685c969c454e38ed76",
}

const HELP_TEXT = `Commands :
========================
 - /defence                  : To display the defence list of the war BG.
 - /mydefence             : To display the defence list of the user in the war BG.
 - /defence @<user>  : To display the defence list of the mentioned user.`;



//------------------------------------
//     APP
//------------------------------------
const client = new line.Client(config);
const app = express();


let officersList = {
  "Ueda6777c2c40eb7e1ad365378a2d14d5":"FLOYD",
  "U35d3a92d8def8d489f40733de81bd624":"THEWATCHER",
  "U1634591f8c212050a27071bb302e3c37":"RAVIRAJSINH VAGHELA",
}
let defenceList = {};
let userProfile_memo = {
  "Ueda6777c2c40eb7e1ad365378a2d14d5":"FLOYD",
  "U35d3a92d8def8d489f40733de81bd624":"THEWATCHER",
  "U1634591f8c212050a27071bb302e3c37":"RAVIRAJSINH VAGHELA",
};
let multiUserList = {};
createDefenceList();
createMultiUserList();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});



//------------------------------------
//     APIS
//------------------------------------

// reference for downloading redirected urls.
// https://github.com/request/request/blob/86b99b671a3c86f4f963a6c67047343fd8edae8f/request.js#L762
app.get("/updateData", (req, res) => {
  downloadGoogleSheet(urls.ACCOUNT_LIST,filePaths.ACCOUNT_LIST, createMultiUserList);
  downloadGoogleSheet(urls.DEFENCE_LIST,filePaths.DEFENCE_LIST, createDefenceList);
});


app.get("/defence", (req, res) => {
  res.send(defenceList);
});

app.get("/accounts", (req, res) => {
  res.send(multiUserList);
});

app.get("/userprofile", (req, res) => {
  res.send(userProfile_memo);
});

app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});


//------------------------------------
//     UTILS
//------------------------------------
const replyText = (token, texts) => {
  texts = Array.isArray(texts) ? texts : [texts.trim()];

  if (texts.length == 0) {
    return Promise.resolve(null);
  }
  return client.replyMessage(
    token,
    texts.map((text) => ({
      type: 'text',
      text
    }))
  );
};

function downloadGoogleSheet(url,filePath, callbackMethod){
  console.log("downloading to " + filePath);
  http.get(url, res => {
    let data = "";
    res.on("data", chunk => {
      data += chunk;
    });


    res.on("end", () => {

      if (res.statusCode > 300 && res.statusCode < 400 && 'location' in res.headers) {
        http.get(res.headers['location'], res2 => {
          let data = "";
          res2.on("data", chunk => {
            data += chunk;
          });
          res2.on("end", () => {
            fs.writeFile(filePath, data, 'utf8', (err) => {
              if (err) throw err;
              console.log('File Updated. ', filePath);
              callbackMethod();
            });
          });
        });
      }
    });
  });
}

// Msg handler
function handleEvent(event) {

  switch (event.type) {
    case 'message':
      switch (event.message.type) {
        case 'text':
          return handleText(event.message, event.replyToken, event.source);
      }
      default:
        throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}

// handle text msg (commands)
function handleText(message, replyToken, source) {
  let textmsg = message.text.toLowerCase().trim();
  if(textmsg in {"/help":"","/defence":"","/mydefence":""}){
    console.log("source : ", source, "\nmessage : ", JSON.stringify(message));
  }
  if (textmsg == '/help') {
    return replyText(replyToken, HELP_TEXT);
  } else if (textmsg == '/mydefence') {
    return handle_mydefence(replyToken, source);
  } else if (textmsg == '/defence') {
    return handle_defence(replyToken, source);
  } else if (textmsg.startsWith('/defence @') && "mention" in message) {
    return handle_defence_mentionees(replyToken, message, source);
  } 


  // officers command.
  if(source.userId in officersList){
    if (textmsg == '/updatedata'){
      console.log("source : ", source, "\nmessage : ", JSON.stringify(message));
      downloadGoogleSheet(urls.ACCOUNT_LIST,filePaths.ACCOUNT_LIST, createMultiUserList);
      downloadGoogleSheet(urls.DEFENCE_LIST,filePaths.DEFENCE_LIST, createDefenceList);
      return replyText(replyToken, "Updated by : " + officersList[source.userId]);
    }
  }
}

function handle_mydefence_helper(source, userDisplayName) {
  console.log("User : ", userDisplayName);
  let reply = "";
  if (source.groupId == GROUPIDS['AW1 - TWTOO'] || source.groupId == GROUPIDS['AW2 - TWTOO'] || source.groupId == GROUPIDS['AW3 - TWTOO']) {
    let memberFound = false;
    let userList = [];
    if (userDisplayName in multiUserList)
      userList = multiUserList[userDisplayName];
    console.log(userList);
    Object.keys(defenceList[source.groupId]).map(key => {
      // console.log(key);
      if (key == userDisplayName || userList.indexOf(key) > -1) {
        memberFound = true;
        reply += "\n" + key + " :\n - ";
        defenceList[source.groupId][key].forEach(champ => {
          reply += champ + ", ";
        });
        reply = reply.slice(0, -2);
        reply += "\n";
      }
    });

    if (!memberFound) {
      reply = "\nYou are not assigned to this War BG.";
    }

  } else {
    reply = "\nWrong Group. Please check your defence in AW groups.";
  }
  return reply;
}

function handle_defence_mentionees(replyToken, message, source) {
  let reply = "";
  message.mention.mentionees.forEach(user => {
    if ("userId" in user) {
      console.log("Mentioned : ", user.userId);
      if (user.userId in userProfile_memo) {
        reply += handle_mydefence_helper(source, userProfile_memo[user.userId]).slice(1);
        return replyText(replyToken, reply);
      } else {
        console.log("fetching from line : ", user.userId);
        client.getProfile(user.userId).then((profile) => {
          userProfile_memo[user.userId] = profile.displayName.toUpperCase();
          reply += handle_mydefence_helper(source, userProfile_memo[user.userId]).slice(1);
          return replyText(replyToken, reply);
        }).catch(e => {
          // console.log("Error.... ", e);
          reply += "\nCouldn't fetch userData from Line. for user : " + message.text.substring(user.index, user.index + user.length) + "\n";
          return replyText(replyToken, reply);
        });
      }
    }else{
      let userNameFromMsg = message.text.substring(user.index + 1, user.index + user.length).toUpperCase();
      console.log("MentionedName : ", userNameFromMsg);
      let replyMsg = handle_mydefence_helper(source, userNameFromMsg);
      if(replyMsg.startsWith("You are not")  || replyMsg.startsWith("Wrong Group.")){
        reply += "\nMentioned User Need to be friends with TWTOO. User : " + message.text.substring(user.index, user.index + user.length) + "\n";
      }else{
        reply += replyMsg;
      }
      return replyText(replyToken, reply);
    }
  });
}

function handle_mydefence(replyToken, source) {
  if (source.groupId) {
    if (source.userId) {
      if (source.userId in userProfile_memo) {
        let reply = handle_mydefence_helper(source, userProfile_memo[source.userId]).slice(1);
        return replyText(replyToken, reply);
      } else {
        client.getProfile(source.userId).then((profile) => {
          userProfile_memo[source.userId] = profile.displayName.toUpperCase();
          let reply = handle_mydefence_helper(source, userProfile_memo[source.userId]).slice(1);
          return replyText(replyToken, reply);
        });
      }
    }else{
      return replyText(replyToken, "Can't access your profile. Add me as friend, So I can help better.");
    }

  }
}

function handle_defence(replyToken, source) {
  if (source.groupId) {
    let dd = {};
    let reply = "";
    if (source.groupId == GROUPIDS['AW1 - TWTOO'] || source.groupId == GROUPIDS['AW2 - TWTOO'] || source.groupId == GROUPIDS['AW3 - TWTOO']) {
      Object.keys(defenceList[source.groupId]).map(key => {
        reply += "\n\n" + key + " :\n - ";
        defenceList[source.groupId][key].forEach(champ => {
          reply += champ.trim() + ", ";
          if(champ.trim().length > 0)
            dd[champ.trim()] = "";
        });
        reply = reply.slice(0, -2);
      });
    } else {
      reply = "Wrong Group. Please check your defence in AW groups.";
    }
    reply = "Defence List : DD (" + Object.keys(dd).length + ")\n==========================================" + reply;
    return replyText(replyToken, reply);
  }
}

function createMultiUserList() {
  fs.readFile(filePaths.ACCOUNT_LIST, 'utf8', function (err, data) {
    if (err) throw err;
    multiUserList = {};
    data.split(os.EOL).forEach(line => {
      line = line.toUpperCase();
      let playerList = line.split(",");
      if (playerList.length < 1 || playerList[0].length == 0) {
        //do nothing....
      } else {
        let lineId = playerList[0];
        multiUserList[lineId] = [];
        playerList = playerList.slice(1);

        playerList.forEach(player => {
          player = player.trim();
          if(player.length > 0){
            multiUserList[lineId].push(player);
          }
        });

      }
    });
    console.log("Read File", filePaths.ACCOUNT_LIST);
    // console.log("Data : ", multiUserList);

  });

}

function createDefenceList() {
  fs.readFile(filePaths.DEFENCE_LIST, 'utf8', function (err, data) {
    if (err) throw err;

    defenceList = {};
    let bg = "BG1";
    data.split(os.EOL).forEach(line => {

      line = line.toUpperCase();
      let playerList = line.split(",");
      if (playerList.length < 1 || playerList[0].length == 0 || playerList[0] == "NAME") {
        //do nothing....
      } else {
        playerList[0] = playerList[0].trim();
        playerList[1] = playerList[1].trim();
        playerList[2] = playerList[2].trim();
        playerList[3] = playerList[3].trim();
        playerList[4] = playerList[4].trim();
        playerList[5] = playerList[5].trim();

        if (playerList[0] == "BG1") {
          bg = GROUPIDS['AW1 - TWTOO'];
          defenceList[bg] = {}
        } else if (playerList[0] == "BG2") {
          bg = GROUPIDS['AW2 - TWTOO'];
          defenceList[bg] = {}
        } else if (playerList[0] == "BG3") {
          bg = GROUPIDS['AW3 - TWTOO'];
          defenceList[bg] = {}
        } else {
          defenceList[bg][playerList[0]] = [playerList[1], playerList[2], playerList[3], playerList[4], playerList[5]];
        }
      }
    });
    console.log("Read File", filePaths.DEFENCE_LIST);
    // console.log("Data : ", defenceList);
  });
}

