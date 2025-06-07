"use strict";

const displayLocation = document.getElementById("local")

window.onload = () => {
    getLocation();
}

async function getLocation() {
  if (await navigator.geolocation) {
    console.log("estimating user position...")
    displayLocation.innerHTML = 'Latitude: YY.yyyyyyy --- Longitude: XX.xxxxxxx'
    await navigator.geolocation.getCurrentPosition(success, error);
  } else { 
    console.log("Geolocation is not supported by this browser.");
  }
}
    
function success(position) {
    console.log(`Latitude: ${position.coords.latitude} Longitude: ${position.coords.longitude}`);
    displayLocation.innerHTML = `Latitude: ${position.coords.latitude} --- Longitude: ${position.coords.longitude}`
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