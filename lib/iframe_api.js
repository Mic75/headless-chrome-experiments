// var h1 = document.createElement('h1');
// h1.innerText = 'plop';
//
// document.body.appendChild(h1);

// // 1. Add the div element for the player
var divPlayer = document.createElement('div');
divPlayer.id = 'player';
document.body.appendChild(divPlayer);


// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(tag);

var pDebug = document.createElement('p');
pDebug.innerText = 'gone there';
document.body.appendChild(pDebug);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    videoId: 'M7lc1UVf-VE',
    events: {
      'onReady': onPlayerReady,
    },
    playerVars: {
      fs: 1
    }
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  event.target.playVideo();
}

