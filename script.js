"use strict";

window.onload = () => {
    getLocation();
}

function getLocation() {
  if (navigator.geolocation) {
    console.log("estimating user position...")
    navigator.geolocation.watchPosition(success, error);
  } else { 
    console.log("Geolocation is not supported by this browser.");
  }
}
    
function success(position) {
    console.log(`Latitude: ${position.coords.latitude} Longitude: ${position.coords.longitude}`);
}

function error(error) {
  switch(error.code) {
    case error.PERMISSION_DENIED:
      console.log("User denied the request for Geolocation.");
      break;
    case error.POSITION_UNAVAILABLE:
      console.log("Location information is unavailable.");
      break;
    case error.TIMEOUT:
      console.log("The request to get user location timed out.");
      break;
    case error.UNKNOWN_ERROR:
      console.log("An unknown error occurred.");
      break;
  }
}

setInterval(getLocation, 30000);