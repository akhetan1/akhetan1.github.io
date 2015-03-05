var restaurantList = ["Acquerello","Atelier Crenn","Bar Tartine","Coi","Coqueta","Cotogna","Delfina","Frances","Gary Danko","Hong Kong Lounge II", "Market & Rye", "Rich Table", "State Bird Provisions", "Sons and Daughters", "The Progress", ];
var restaurantArray = [];
var map;
var autocomplete;

function initialize(){
    var mapCanvas=document.getElementById("map-canvas");
    var mapOptions = {
        center: new google.maps.LatLng(37.774929, -122.419416),
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    map=new google.maps.Map(mapCanvas, mapOptions);
    var input = document.getElementById("inputField");
    autocomplete = new google.maps.places.Autocomplete(input);

    autocomplete.bindTo('bounds', map);
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
        var place=autocomplete.getPlace();
        if(!place.geometry) {
            console.log("no geometry"); 
            return;
        }
        if(place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
            map.setZoom(15);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(15);
        }
    })
}

function loadMap()
{
    google.maps.event.addDomListener(window, 'load', initialize());
}


function displayList(){
    var list ='';
    for(var i in restaurantList){
        list+=restaurantList[i];
        list+=", ";
    }
    document.getElementById("List").innerHTML = list;
    buildRestaurantLocationArray();
}

function addRemoveRestaurant(e){
    console.log("In addrRemoveRestaurant function")
    if (e.keyCode == 13){
        var x = document.getElementById("restaurantInput").value;
        if (restaurantList.indexOf(x) == -1){
            restaurantList.push(x);
        } else {
            var index = restaurantList.indexOf(x);
            restaurantList.splice(index, 1);
        }
        displayList();
    }
    return;
}
function getGeocodeHandler(restaurantName){
    return function handleGeocodeResponse(results, status) {
        var lat, lng;

        if (status == google.maps.GeocoderStatus.OK){
            lat = results[0].geometry.location.lat();
            lng = results[0].geometry.location.lng();
            restaurantArray.push({'restaurant':restaurantName, 'latitude':lat, 'longitude':lng});
        } else {
            console.log("Error: " + restaurantName + " " + JSON.stringify(status));
        }

    }
}

function buildRestaurantLocationArray(){
    var geocoder = new google.maps.Geocoder();

    restaurantArray = [];
    for(var i=0; i<restaurantList.length; i++) {
        console.log(restaurantList[i]);
        geocoder.geocode({'address': restaurantList[i]}, getGeocodeHandler(restaurantList[i]));
    }

}