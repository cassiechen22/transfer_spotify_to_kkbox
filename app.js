var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var sessionStorage = require('sessionstorage');
var bodyParser = require('body-parser');
var url = require('url');
var http = require('http');

var spo_client_id = ''; 
var spo_client_secret = ''; 
var spo_redirect_uri = 'https://transfer-songs-to-kkbox.herokuapp.com/callback/'; 
var grant_type = 'authorization_code'

var kk_client_id = ''; 
var kk_client_secret = '';
var kk_redirect_uri = 'https://transfer-songs-to-kkbox.herokuapp.com/kkboxcallback'; 


//產生 state
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser())
   .use(bodyParser());


app.get('/loginSPO', function(req, res) {
  if(sessionStorage.getItem("spotify_access_token")!==null){
    sessionStorage.removeItem("spotify_access_token");
  }
  var state = generateRandomString(16);
  res.cookie(stateKey, state); //將 state Random產生的值 加入 spotify_auth_state 這個 cookie 

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-library-read playlist-read-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: spo_client_id,
      scope: scope,
      redirect_uri: spo_redirect_uri,
      state: state
    }));
});


app.get('/callback', function(req, res) {
if(sessionStorage.getItem("spotify_access_token")!==null){
    sessionStorage.removeItem("spotify_access_token");
  }
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null; 

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: spo_redirect_uri,
        grant_type: grant_type
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(spo_client_id + ':' + spo_client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;
        sessionStorage.setItem("session_spotify_token",access_token)
        console.log(access_token)
        
        res.redirect('/#' +
          querystring.stringify({
            state: 'spotify_login_successfully'
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token',
            state: 'spotify'
          }));
      }
    });
  }
});


app.get('/loginKK', function(req, res) {
  if(sessionStorage.getItem("kkbox_access_token")!==null){
    sessionStorage.removeItem("kkbox_access_token");
  }
  var scope = 'user_profile user_territory user_account_status';
  var state = '123'

  res.redirect('https://account.kkbox.com/oauth2/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: kk_client_id,
      scope: scope,
      redirect_uri: kk_redirect_uri,
      state: state
  })); 
});


app.get('/kkboxcallback', function(req, res) {
if(sessionStorage.getItem("kkbox_access_token")!==null){
    sessionStorage.removeItem("kkbox_access_token");
  }
  var code = req.query.code || null;
  var state = req.query.state || null;
  var scope = 'user_profile user_territory user_account_status';
  
  if (state === null || state !== "123") {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    var authOptions = {
      url: 'https://account.kkbox.com/oauth2/token',
      form: {
        code: code,
        redirect_uri: kk_redirect_uri,
        grant_type: grant_type,
        scope: scope,
        client_id: kk_client_id,
        client_secret: kk_client_secret
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(kk_client_id + ':' + kk_client_secret).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token
        sessionStorage.setItem("session_kkbox_token",access_token)
        console.log(access_token)

        res.redirect('/#' +
          querystring.stringify({
            state: 'kkbox_login_successfully'
          }));

      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token',
            state: 'kkbox'
          }));
      }
    });
  }
});

app.post('/checkAuthorize', function(req, res) {
  var kkbox_access_token = sessionStorage.getItem("session_kkbox_token")
  var spotify_access_token = sessionStorage.getItem("session_spotify_token")
  var access_tokens = kkbox_access_token + '@' + spotify_access_token;
  res.send(access_tokens)
});


app.post('/favorite', function(req, res) {

  var kk_access_token = req.body.kk_access_token
  var track_id = (req.body.trackId).toString()

  request.post('https://api.kkbox.com/v1.1/me/favorite', {
    headers: {
        'Authorization': 'Bearer ' + kk_access_token,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ 
        "track_id": track_id 
      })
  }, (error, response, body) => {
    console.log(`statusCode: ${res.statusCode}`)
    console.log(body)

    res.send(body)
  })
});

process.on('uncaughtException', function (err) {
    console.log(err);
}); 

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.post('/clearSession', function(req,res){
  sessionStorage.removeItem("spotify_access_token");
  sessionStorage.removeItem("kkbox_access_token");
  sessionStorage.clear();
});

console.log('Listening on 8888');
app.listen(8888);
