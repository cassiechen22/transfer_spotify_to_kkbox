let kkbox_access_token = "";
let spotify_access_token = "";
let authorize = 0;


$(window).bind('beforeunload', function () {
    if (authorize >= 1) {
        logout();
    }
});


$("#logout").click(logout);

function logout() {
    $.ajax({
        type: 'POST',
        url: '/clearSession',
        async: false
    }).done(function (response) {
        console.log(response);
        window.location = "/";
    }).error(function (response) {
        console.log(response)
    })
}


if (document.cookie.indexOf('spo_access_token') !== -1) {
    $('.spoAuthBtn').hide();
    spotify_access_token = getCookie('spo_access_token');
    // console.log(spotify_access_token)
}

if (document.cookie.indexOf('kk_access_token') !== -1) {
    $('.kkAuthBtn').hide();
    kkbox_access_token = getCookie('kk_access_token');
    // console.log(kkbox_access_token)
}

if (document.cookie.indexOf('kk_access_token') !== -1 && document.cookie.indexOf('spo_access_token') !== -1) {
    $('.showKkboxBtn').show();
    $('.showSpotifyBtn').show();
    $('.messageOfResult').html("Login KKBOX and Spotify successfully!")
}


function getCookie(cname) {
    const name = cname + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}


let numOfSongs = 0;

function getLimit(totalSongs, action) {
    let limit = 10;

    for (i = 0; i < totalSongs; i += 10) {
        if ((totalSongs - i) < 10) {
            limit = totalSongs - i; // rest of times
        }
        action(limit, i)
    }
}


$("#spotify_saved_tracks").click(function () {
    numOfSongs = document.getElementById('numOfSongs').value;
    getLimit(numOfSongs, getSpotifySongs);
    authorize += 1;
    sessionStorage.setItem("authorize", authorize)
});


let tracksInfo_array = new Array();
let getSavedSongs = 0;

function getSpotifySongs(limit, offset) {
    const spotify_access_token = getCookie('spo_access_token');

    $(".showResult").html("");

    tracksInfo_array = new Array();

    $.ajax({
        url: 'https://api.spotify.com/v1/me/tracks?market=TW&limit=' + limit + '&offset=' + offset,
        headers: {
            'Authorization': 'Bearer ' + spotify_access_token
        },
    }).error(function () {
        alert("Please click Authorize button and enter how many songs you want to transfer!")
    }).done(function (response) {
        const tracks = response.items;

        // 拿到 items 要抓data artist/songname
        for (i = 0; i < tracks.length; i++) {
            const aTrack = tracks[i].track.external_ids.isrc;
            const artist_name = tracks[i].track.artists[0].name;
            const track_name = tracks[i].track.name;

            console.log(aTrack);
            tracksInfo_array.push(aTrack);
            $(".showResult").append("<span>" + artist_name + ' - ' + track_name + "</span><br>");
        }

        console.log("------------- spotify end ----------------");
        console.log(tracksInfo_array.length);
        getSavedSongs = 1
    });
}


$('#show_playlists').click(getPlaylist);

const idsOfPlaylist = new Array();
let totalTracks = 0;

function getPlaylist(user_id) {
    authorize += 1;
    const spotify_access_token = getCookie('spo_access_token');
    sessionStorage.setItem("authorize", authorize);

    $(".showResult").html("");
    var user_id = document.getElementById('spo_user_id').value;
    let url = "";

    if (user_id !== "") {
        console.log(user_id);
        url = 'https://api.spotify.com/v1/users/' + user_id + '/playlists?'
    } else {
        url = 'https://api.spotify.com/v1/me/playlists?'
    }

    $.ajax({
        url: url + 'limit=50',
        headers: {
            'Authorization': 'Bearer ' + spotify_access_token
        },
    }).error(function (result) {
        alert("Please enter user_id or authorize again.")
    }).done(function (response) {
        const playlists = response.items;

        for (i = 0; i < playlists.length; i++) {
            const aIdOfPlaylist = playlists[i].id;
            const nameOfPlaylist = playlists[i].name;
            totalTracks = playlists[i].tracks.total;
            $(".showResult").append('<input type="radio" name="valueOfPlaylist" value=' + aIdOfPlaylist + '><span style="font-size: 1.2em">' + "&nbsp;&nbsp;&nbsp;" + nameOfPlaylist + "</span><br>");
        }
    });
}


let idOfchosenPlaylist = "";
$('#get_playlist_songs').click(function () {
    idOfchosenPlaylist = $('input:radio[name="valueOfPlaylist"]:checked').val();
    getLimit(totalTracks, getPlaylistSongs);
    authorize += 1;
    sessionStorage.setItem("authorize", authorize)
});

const playlistsTracksInfo_array = new Array();
let getSongsFromPlaylist = 0;

function getPlaylistSongs(limit, offset) {
    const spotify_access_token = getCookie('spo_access_token');
    $(".showResult").html("");

    if (idOfchosenPlaylist !== null || idOfchosenPlaylist !== 'null') {
        $.ajax({
            url: 'https://api.spotify.com/v1/playlists/' + idOfchosenPlaylist + '/tracks?market=TW&limit=' + limit + '&offset=' + offset,
            headers: {
                'Authorization': 'Bearer ' + spotify_access_token
            },
        }).error(function (result) {
            alert("Please click Authorize button or choose which playlist you want to transfer!")
        }).done(function (response) {
            const tracksInPlaylist = response.items;

            for (i = 1; i < tracksInPlaylist.length; i++) {
                const trackId = tracksInPlaylist[i].track.external_ids.isrc;
                const track_name = tracksInPlaylist[i].track.name;
                const artist_name = tracksInPlaylist[i].track.artists[0].name;
                playlistsTracksInfo_array.push(trackId);
                $(".showResult").append("<span>" + artist_name + ' - ' + track_name + "</span><br>");
            }
            getSongsFromPlaylist = 1;
            console.log(playlistsTracksInfo_array)
        });
    }

}

$("#add_to_kkbox").click(searchInKkbox);

let retrySearch;

function searchInKkbox() {
    if (getSavedSongs === 1 && tracksInfo_array.length == numOfSongs && retrySearch <= 3) {
        console.log("saved songs");
        const getSpecificTrack = tracksInfo_array;
        while (getSpecificTrack.length > 0) {
            const track_addToKK = getSpecificTrack.shift();
            getKkboxTrackId(track_addToKK)
        }
    }
    if (getSongsFromPlaylist === 1 && retrySearch <= 3) {
        console.log("playlists");
        const getSpecificTrack = playlistsTracksInfo_array;
        console.log(getSpecificTrack);
        while (getSpecificTrack.length > 0) {
            const track_addToKK = getSpecificTrack.shift();
            getKkboxTrackId(track_addToKK)
        }
    }

}


//在 kkbox 裡面找歌
retrySearch = 0;
const tracksIdOfKKbox = new Array();

function getKkboxTrackId(track_addToKK, tryCount = 0, retryLimit = 3) {

    $.ajax({
        url: 'https://api.kkbox.com/v1.1/search?offset=0&limit=10&territory=TW&type=track&q=isrc:' + track_addToKK, //+ artistOfTrack +' '+ nameOfTrack,
        headers: {
            'Authorization': 'Bearer ' + kkbox_access_token
        },
    }).done(function (response) {
        const tracksDataOfresponse = response.tracks.data;
        console.log(tracksDataOfresponse);

        if (tracksDataOfresponse.length === 0) {
            console.log("No Response: " + tracksDataOfresponse);
        } else {
            const trackIdd = tracksDataOfresponse[0].id;
            console.log(trackIdd);
            tracksIdOfKKbox.push(trackIdd);


            // 在 spotify 拿到歌曲 - kk search 得到 trackId 的歌曲 相減 不大於5
            if (tracksInfo_array.length - tracksIdOfKKbox.length < 5) {
                addIntoKkboxFavorite(tracksIdOfKKbox)
            } else {
                searchInKkbox();
                retrySearch += 1;

                if (retrySearch > 3) {
                    const accuracy = (tracksInfo_array.length - tracksIdOfKKbox.length) / tracksInfo_array.length;
                    if (accuracy < 0.7) {
                    }
                }
            }
        }
    }).error(function (response) {
        tryCount++;
        if (tryCount <= retryLimit) {
            console.log(tryCount);
            getKkboxTrackId(track_addToKK, tryCount, retryLimit);
            return;
        }
        console.log(response);
        return;
    })
}


function addIntoKkboxFavorite(tracksId) {
    if (tracksId.length !== 0) {
        const kk_access_token = getCookie('kk_access_token');
        const aTrackId = tracksId[0];
        console.log(aTrackId);

        $.ajax({
            type: 'POST',
            url: '/favorite',
            data: {
                'trackId': aTrackId,
                'kk_access_token': kk_access_token
            },
            dataType: 'json'
        }).done(function (response) {
            if (response.error) {
                console.log("Try Again!!!");
                addIntoKkboxFavorite(tracksId)
            } else if (response.message === "Success") {
                console.log(response);
                $(".showResult").prepend("<span>" + JSON.stringify(response) + "</span>");
                tracksId.shift();
                addIntoKkboxFavorite(tracksId)
            }
        }).error(function (response) {
            // console.log(response);
            addIntoKkboxFavorite(tracksId)
        })
    } else {
        alert("Add into your KKBOX successfully!")
    }


}


let totalFavoriteSongs = 0;
$('#get_kkbox_songs').click(function () {
    const kkbox_access_token = getCookie('kk_access_token');

    // get total songs
    $.ajax({
        url: 'https://api.kkbox.com/v1.1/me/favorite?limit=1',
        headers: {
            'Authorization': 'Bearer ' + kkbox_access_token
        },
    }).error(function () {
        alert("Really? Do your KKBOX favorite contain any songs? If do not, you can use buttons below to help you add songs.")
    }).done(function (response) {

        totalFavoriteSongs = response.summary.total;
        console.log(totalFavoriteSongs);
        getLimit(totalFavoriteSongs, get_kkbox_songs);
    });
});

function get_kkbox_songs(limit, offset) {
    const kkbox_access_token = getCookie('kk_access_token');

    $.ajax({
        url: 'https://api.kkbox.com/v1.1/me/favorite?limit=' + limit + '&offset=' + offset,
        headers: {
            'Authorization': 'Bearer ' + kkbox_access_token
        },
    }).error(function () {
        alert("Really? Do your KKBOX favorite contain any songs? If do not, you can use buttons below to help you add songs.")
    }).done(function (response) {
        const favoriteTracks = response.data;
        console.log(favoriteTracks);

        for (i = 0; i < favoriteTracks.length; i++) {
            const track_name = favoriteTracks[i].name;
            const artist_name = favoriteTracks[i].album.artist.name;

            console.log("Track:" + track_name );
            $(".showResult").prepend("<span>" + artist_name + ' - ' +  track_name + "</span><br>");
        }
    });
}


