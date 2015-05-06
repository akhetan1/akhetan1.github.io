var restaurantList = ["Acquerello","All Spice - San Francisco","Atelier Crenn","Bar Tartine","Campton Place","COI Restaurant","Coqueta","Cotogna","Delfina Restaurant","Flour + Water", "Frances","Gary Danko","Hong Kong Lounge II", "Kokkari Estiatorio","Market & Rye","Padrecito", "Piccino", "Range", "Rich Table", "State Bird Provisions", "Sons & Daughters", "The Progress", ];
var tempRestaurantList;
var defaultLocation;
var map;
var autocomplete;
var markerArray = [];


function initialize(){
    var mapCanvas=document.getElementById("map-canvas");
    defaultLocation= new google.maps.LatLng(37.774929, -122.419416);
    var mapOptions = {
        center: defaultLocation,
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    map=new google.maps.Map(mapCanvas, mapOptions);
    var input = document.getElementById("inputField");
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
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
    displayList();
    getPlacesFromGoogle();
}

function addRemoveRestaurant(e){
    if (e.keyCode == 13){
        var x = document.getElementById("restaurantInput").value;
        if (restaurantList.indexOf(x) == -1){
            restaurantList.push(x);
            displayList();
            tempRestaurantList=[];
            tempRestaurantList.push(x);
            getPlacesFromGoogle();
        } else {
            var index = restaurantList.indexOf(x);
            restaurantList.splice(index, 1);
            removeMarker(x);
            displayList();
        }
    }
    return;
}

function displayList(){
    tempRestaurantList = restaurantList.slice(0);
    var list ='';
    for(var i in restaurantList){
        list+=restaurantList[i];
        list+="<br>";
    }
    document.getElementById("List").innerHTML = list;
}


function getPlacesFromGoogle() {
    var service;

    if(tempRestaurantList.length > 0) {
        var request = {
            location: defaultLocation,
            radius: '40',
            query: tempRestaurantList[0],
            types: ["restaurant", "food"]
        };

        service = new google.maps.places.PlacesService(map);
        service.textSearch(request, callback);
    }
}

function callback(results, status){
    if (status==google.maps.places.PlacesServiceStatus.OK){
        matched = false;
        for (var i=0; i<results.length; i++){
            if(results[i].name.toLowerCase().indexOf(tempRestaurantList[0].toLowerCase())==0){
                matched = true;
                setMarkers(results[i]);
            }
        }

        if (!matched) {
            console.log("ERROR: Couldn't find a match for '" + tempRestaurantList[0] + "' in results!");
        }
    } else if (status == google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT){
        setTimeout(getPlacesFromGoogle, 100);
        return;
    } else{
        console.log("ERROR: Unhandled status of search for: " + status);
    }

    // Found a match or unknown error, call Google API synchronously for the next request
    tempRestaurantList.shift();
    getPlacesFromGoogle();
}

function setMarkers(result) {
    var marker = new google.maps.Marker({
        position: result.geometry.location,
        map: map,
        title: result.name
    });
    markerArray.push(marker);
}

function removeMarker(restaurantName){
    for(i=0; i< markerArray.length; i++){
        if(markerArray[i].title.indexOf(restaurantName)==0){
            markerArray[i].setMap(null);
            markerArray.splice(i,1);
        }
    }
}

function highlightMarker(restaurantName){
    for(i=0; i< markerArray.length; i++){
        if(markerArray[i].title.indexOf(restaurantName)==0){
            markerArray[i].setIcon("https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png");
        }
    }
}

function removeHighlights(){
    for(i=0; i<markerArray.length; i++){
        markerArray[i].setIcon(null);
    }
}

function setDefaultDateValue(){
    Date.prototype.toDateInputValue = (function() {
        var local = new Date(this);
        local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
        return local.toJSON().slice(0,10);
    });
    document.getElementById("datePicker").value = new Date().toDateInputValue();
}

function searchAvailability(){
    //reset the reservations in case there was a previous search
    document.getElementById("reservationTimes").innerHTML = "";
    removeHighlights();

    //create the url
    var partySize = document.getElementById("partySize").value;
    var date = document.getElementById("datePicker").value;
    var time = document.getElementById("time").value;
    var url = "http://localhost:1234/?partySize=" + partySize + "&date=" + date + "&time=" + time;

    //show the spinner as results load
    $('#progress').show();

    //make the call to the server for reservation times
    $.ajax({
        type: 'GET',
        url: url,
        dataType: "text",
        crossDomain: true,
        success: myCallback,
        error: function(xhr, ajaxOptions, thrownError) {
            console.log("Error status on callback: " + xhr.status);
            console.log("Error thrown: " + thrownError);
        }
    });

}

var myCallback = function(data) {
    //get the json objects for each request
    var responseArray = JSON.parse(data);

    //search each request
    var outputStr = "";
    var lookup = {};

    for (var i = 0; i < responseArray[0].Results.Restaurants.length; i++) {
        lookup[responseArray[0].Results.Restaurants[i].Name] = responseArray[0].Results.Restaurants[i];
    }

    restaurantList.forEach(function (restaurant) {
        if (lookup.hasOwnProperty(restaurant)) {
            outputStr = outputStr + restaurant + ": ";
            for (var i in lookup[restaurant].TimeSlots) {
                if(lookup[restaurant].TimeSlots[i].IsAvail == true) {
                    var tempStr = lookup[restaurant].TimeSlots[i].TimeString;
                    var tempArray = tempStr.split(" ");
                    outputStr = outputStr + tempArray[0] + "   ";
                }
            }
            outputStr += "<br>";
            highlightMarker(restaurant);
        }
    });
    $('#progress').hide();
    document.getElementById("reservationTimes").innerHTML = outputStr;
}