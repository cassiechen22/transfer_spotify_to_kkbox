const express = require('express'); // Express web server framework
const request = require('request'); // "Request" library
const session = require('express-session');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const spo_client_id = '';
const spo_client_secret = '';
const spo_redirect_uri = 'https://transfer-songs-to-kkbox.herokuapp.com/callback/'; //'http://localhost:8888/callback/'; //
const grant_type = 'authorization_code';

const kk_client_id = '';
const kk_client_secret = '';
const kk_redirect_uri = 'https://transfer-songs-to-kkbox.herokuapp.com/kkboxcallback'; //'http://localhost:8888/kkboxcallback'; //


const generateRandomString = function (length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text
};


const app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser())
    .use(bodyParser())
    .use(session({secret: "ya", cookie: {maxAge: 60000}}));


app.get('/loginSPO', loginSPO);

function loginSPO(req, res) {
    const state = generateRandomString(16);
    res.cookie('spotify_auth_state', state);

    const scope = 'user-read-private user-read-email user-library-read playlist-read-private';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: spo_client_id,
            scope: scope,
            redirect_uri: spo_redirect_uri,
            state: state
        }))
}

app.get('/callback', function (req, res) {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;
    console.log(`storedState: ${storedState}`);

    if (state === null || state !== storedState) {

        res.redirect('/?' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie('spotify_auth_state');
        const authOptions = {
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

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                const access_token = body.access_token;
                req.session.spo_access_token = access_token;
                res.cookie('spo_access_token', access_token);
                console.log(access_token);
                console.log("----------------------");

                res.redirect('/?' +
                    querystring.stringify({
                        state: 'spotify_login_successfully'
                    }));
            } else {
                res.redirect('/?' +
                    querystring.stringify({
                        error: 'invalid_token',
                        state: 'spotify'
                    }))
            }
        })
    }
});


app.get('/loginKK', loginKK);

function loginKK(req, res) {
    const scope = 'user_profile user_territory user_account_status';
    const state = '123';

    res.redirect('https://account.kkbox.com/oauth2/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: kk_client_id,
            scope: scope,
            redirect_uri: kk_redirect_uri,
            state: state
        }));
}


app.get('/kkboxcallback', function (req, res) {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const scope = 'user_profile user_territory user_account_status';

    if (state === null || state !== "123") {
        res.redirect('/?' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        const authOptions = {
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

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                const access_token = body.access_token;
                res.cookie('kk_access_token', access_token);
                req.session.kk_access_token = access_token;

                res.redirect('/?' +
                    querystring.stringify({
                        state: 'kkbox_login_successfully'
                    }));

            } else {
                res.redirect('/?' +
                    querystring.stringify({
                        error: 'invalid_token',
                        state: 'kkbox'
                    }));
            }
        });
    }
});


app.post('/favorite', function (req, res) {
    const kk_access_token = req.body.kk_access_token;
    const track_id = (req.body.trackId).toString();

    request.post('https://api.kkbox.com/v1.1/me/favorite', {
        headers: {
            'Authorization': 'Bearer ' + kk_access_token,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            "track_id": track_id
        })
    }, (error, response, body) => {
        console.log(`statusCode: ${res.statusCode}`);
        console.log(body);

        res.send(body)
    })
});


process.on('uncaughtException', function (err) {
    console.log(err);
});


app.get('/refresh_token', function (req, res) {

    const refresh_token = req.query.refresh_token;
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))},
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});



app.post('/clearSession', clearSession);

function clearSession(req, res) {
    req.session.destroy();
    res.clearCookie('kk_access_token');
    res.clearCookie('spo_access_token');
    res.send("")
}


const port = Number(process.env.PORT || 8888);
app.listen(port, function () {
    console.log("Listening on " + port);
});
