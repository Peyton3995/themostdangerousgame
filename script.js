"use strict";

const displayLocation = document.getElementById("local")

let map, marker;

window.onload = () => {
    getLocation();
}

async function getLocation() {
  if (navigator.geolocation) {
    console.log("estimating user position...")
    displayLocation.innerHTML = 'Latitude: YY.yyyyyyy --- Longitude: XX.xxxxxxx'
    navigator.geolocation.getCurrentPosition(success, error);
  } else { 
    console.log("Geolocation is not supported by this browser.");
  }
}
    
async function success(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    displayLocation.innerText = `Latitude: ${lat} --- Longitude: ${lng}`;
    console.log(`Latitude: ${lat}, Longitude: ${lng}`);

    const userLocation = { lat, lng };

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