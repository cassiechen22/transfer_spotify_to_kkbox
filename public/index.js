
var kkbox_access_token = "";
var spotify_access_token = "";
var authorize = 0



$(window).bind('beforeunload', function(){
    console.log("beforeunload " + authorize)

    if (authorize > 1) {
        return 'Are you sure you want to leave?';
    }
});

$(window).unload(function(){
    console.log("unload " + authorize)
    
    
});

function clearSession(){
    if (authorize > 1) {
        $.ajax({
              type: 'POST',
              url: '/clearSession',
        }).done(function(response) {
            console.log(response)    
        }).error(function(response) {
            console.log(response)    
        })
    }
}

function defaultOauth(){
    $.ajax({
            type: 'POST',
            url: '/checkAuthorize'
        }).error(function(result){
            alert("Please click Authorize button first!")
        }).done(function(response) {
            var access_tokens = response
            if (access_tokens == null) {
                alert("Please click Authorize button first!")
            } else {
                var split = access_tokens.indexOf('@')
                kkbox_access_token = access_tokens.substring(0,split)
                spotify_access_token = access_tokens.substring(split+1, access_tokens.length)
                console.log('kkbox_access_token:' + kkbox_access_token);
                console.log('spotify_access_token:' + spotify_access_token);

                if (kkbox_access_token !== '' && kkbox_access_token !== 'null') {
                    $('.kkAuthBtn').hide();
                    $('.messageOfResult').html("Login KKBOX successfully")
                } 

                if (spotify_access_token !== '' && spotify_access_token !== 'null') {
                    $('.spoAuthBtn').hide();
                    $('.messageOfResult').html("Login Spotify successfully")
                } 

                if (kkbox_access_token !== '' && spotify_access_token !== '' && kkbox_access_token !== 'null' && spotify_access_token !== 'null'){
                    $('.showKkboxBtn').show();
                    $('.showSpotifyBtn').show();
                    $('.messageOfResult').html("Login KKBOX and Spotify successfully!")
                }

                authorize +=1
            }
        }); 
}


checkOauth()

function checkOauth(){

    $('.messageOfResult').html("Login KKBOX and Spotify first.")
    var url = window.location.href
    
    if (url.indexOf("state") === -1 && kkbox_access_token !== null && spotify_access_token !== null) {
        clearSession()
    } else {
        defaultOauth()
    }
    
    console.log(authorize)
    if (sessionStorage.getItem("authorize") > 1) {
        clearSession()
    }
    
}


var numOfSongs = 0
var getSavedSongs = 0

function getLimit(totalSongs,action){
    var limit = 50;

    for (i = 0; i < totalSongs; i+=50) {
      if ((totalSongs - i) < 50) {
        limit = totalSongs - i; // rest of times
      }
      action(limit,i+1)
    }
}

$("#spotify_saved_tracks").click(function() {
    numOfSongs = document.getElementById('numOfSongs').value
    getLimit(numOfSongs,getSpotifySongs)
    authorize +=1
    sessionStorage.setItem("authorize",authorize)

}); 


var tracksInfo_array = new Array();
var getSavedSongs = 0

function getSpotifySongs(limit,offset){
    $(".showResult").html("");

    tracksInfo_array = new Array();

    $.ajax({
        url: 'https://api.spotify.com/v1/me/tracks?market=TW&limit=' + limit + '&offset=' + offset,
        headers: {
            'Authorization': 'Bearer ' + spotify_access_token
        },
    }).error(function(result){
        alert("Please click Authorize button first!")
    }).done(function(response) {
        var tracks = response.items

        // 拿到 items 要抓data artist/songname
        for (i = 0; i < tracks.length; i++) { 
            var aTrack = tracks[i].track.external_ids.isrc
            var artist_name = tracks[i].track.artists[0].name
            var track_name = tracks[i].track.name

            console.log(aTrack)
            tracksInfo_array.push(aTrack)
            $(".showResult").append("<span>" + artist_name + ' - ' + track_name +"</span><br>");
        }
        // showAddtoKkboxDialog()
        console.log("------------- spotify end ----------------")
        console.log(tracksInfo_array.length)
        getSavedSongs = 1
    }); 
}



$('#show_playlists').click(getPlaylist);

var idsOfPlaylist = new Array();
var totalTracks = 0
function getPlaylist(user_id){
    authorize +=1
    sessionStorage.setItem("authorize",authorize)

    $(".showResult").html("");
    var user_id = document.getElementById('spo_user_id').value
    var url = ""

    if (user_id !== "") {
        console.log(user_id)
        url = 'https://api.spotify.com/v1/users/' + user_id + '/playlists?'
    } else {
        url = 'https://api.spotify.com/v1/me/playlists?' 
    }

    $.ajax({
        url: url + 'limit=50', 
        headers: {
            'Authorization': 'Bearer ' + spotify_access_token
        },
    }).error(function(result){
        alert("Please click Authorize button first!")
    }).done(function(response) {
        var playlists = response.items

        for (i = 0; i < playlists.length; i++) { 
            var aIdOfPlaylist = playlists[i].id
            var nameOfPlaylist = playlists[i].name
            totalTracks = playlists[i].tracks.total
            $(".showResult").append('<input type="radio" name="valueOfPlaylist" value=' + aIdOfPlaylist + '><span style="font-size: 1.2em">' + "&nbsp;&nbsp;&nbsp;" + nameOfPlaylist +"</span><br>");            
        }
    });
} 


var idOfchosenPlaylist = ""
$('#get_playlist_songs').click(function() {
    idOfchosenPlaylist = $('input:radio[name="valueOfPlaylist"]:checked').val()
    getLimit(totalTracks,getPlaylistSongs)
    authorize +=1
    sessionStorage.setItem("authorize",authorize)

}); 

var playlistsTracksInfo_array = new Array();
var getSongsFromPlaylist = 0
function getPlaylistSongs(limit,offset){
    $(".showResult").html("");

    if (idOfchosenPlaylist !== null || idOfchosenPlaylist !== 'null') {
        $.ajax({
            url: 'https://api.spotify.com/v1/playlists/' + idOfchosenPlaylist + '/tracks?market=TW&limit=' + limit + '&offset=' + offset,
            headers: {
                'Authorization': 'Bearer ' + spotify_access_token
            },
        }).error(function(result){
            alert("Please click Authorize button first!")
        }).done(function(response) {
            var tracksInPlaylist = response.items

            for(i = 1; i < tracksInPlaylist.length; i++){
                var trackId = tracksInPlaylist[i].track.external_ids.isrc
                var track_name = tracksInPlaylist[i].track.name
                var artist_name = tracksInPlaylist[i].track.artists[0].name
                playlistsTracksInfo_array.push(trackId)
                $(".showResult").append("<span>" + artist_name + ' - ' + track_name +"</span><br>");
            }
            getSongsFromPlaylist = 1
            console.log(playlistsTracksInfo_array)
        });
    }
    
}

$("#add_to_kkbox").click(searchInKkbox);

function searchInKkbox(){

    if (getSavedSongs ===1 && tracksInfo_array.length == numOfSongs && retrySearch <=3) {
        console.log("saved songs")
        var getSpecificTrack = tracksInfo_array;
        while( getSpecificTrack.length > 0){
            var track_addToKK = getSpecificTrack.shift()
            getKkboxTrackId(track_addToKK)
        }
    } 
    if (getSongsFromPlaylist ===1 && retrySearch <=3){
        console.log("playlists")
        var getSpecificTrack = playlistsTracksInfo_array;
        console.log(getSpecificTrack)
        while( getSpecificTrack.length > 0){
            var track_addToKK = getSpecificTrack.shift()
            getKkboxTrackId(track_addToKK)
        }
    }
}


//在 kkbox 裡面找歌
var retrySearch = 0
var tracksIdOfKKbox = new Array();

function getKkboxTrackId(track_addToKK, tryCount = 0, retryLimit = 3){

    $.ajax({
          url: 'https://api.kkbox.com/v1.1/search?offset=0&limit=10&territory=TW&type=track&q=isrc:' + track_addToKK, //+ artistOfTrack +' '+ nameOfTrack,
          headers: {
            'Authorization': 'Bearer ' + kkbox_access_token 
          },
    }).done(function(response) {
        var tracksDataOfresponse = response.tracks.data;
            console.log(tracksDataOfresponse)

        if (tracksDataOfresponse.length === 0) {
            console.log("No Response: " + tracksDataOfresponse);
            return;
        } else{    
            var trackIdd = tracksDataOfresponse[0].id
            console.log(trackIdd)
            tracksIdOfKKbox.push(trackIdd)


            // 在 spotify 拿到歌曲 - kk search 得到 trackId 的歌曲 相減 不大於5
            if (tracksInfo_array.length - tracksIdOfKKbox.length < 5){
                addIntoKkboxFavorite(tracksIdOfKKbox)
            } else {
                searchInKkbox()
                retrySearch += 1

                if (retrySearch > 3) {
                    var accuracy = (tracksInfo_array.length - tracksIdOfKKbox.length)/tracksInfo_array.length
                    if (accuracy < 0.7) {
                    }
                }
            }
        }
    }).error(function(response) {
        tryCount++;
        if (tryCount <= retryLimit) {
            console.log(tryCount)
            getKkboxTrackId(track_addToKK, tryCount, retryLimit)
            return;
        }            
        return;
        console.log(response)
    })
}



function addIntoKkboxFavorite(tracksId) { 

    if (tracksId.length === 0) {
        return;
    }

    var aTrackId = tracksId[0]
    console.log(aTrackId)

    $.ajax({
          type: 'POST',
          url: '/favorite',
          data:{
            'trackId': aTrackId,  
            'kk_access_token': kkbox_access_token
          },
          dataType: 'json'
    }).done(function(response) {
        if (response.error) {
            console.log("Try Again!!!")
            addIntoKkboxFavorite(tracksId)
        } else if (response.message === "Success") {
            console.log(response)
            $(".showResult").prepend("<span>" + JSON.stringify(response) +"</span>");
            tracksId.shift()
            addIntoKkboxFavorite(tracksId)
        }
        
        authorize 
        sessionStorage.setItem("authorize",authorize)
    }).error(function(response) {
        console.log(response)
        addIntoKkboxFavorite(tracksId)    
    })

}



