"use strict";

const displayLocation = document.getElementById("local")

let latitude
let longitude

window.onload = () => {
    getLocation();
}

async function getLocation() {
  if (navigator.geolocation) {
    console.log("estimating user position...")
    displayLocation.innerHTML = 'Latitude: YY.yyyyyy --- Longitude: XX.xxxxxx'
    navigator.geolocation.getCurrentPosition(success, error);
  } else { 
    console.log("Geolocation is not supported by this browser.");
  }
}
    
async function success(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    displayLocation.innerText = `Latitude: ${latitude} --- Longitude: ${longitude}`;
    console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

    setTimeout(getLocation, 30000);
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