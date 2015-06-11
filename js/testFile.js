var lists = [];
var listName;
var restaurantList = [];
var tempRestaurantList;
var center;
var map;
var autocomplete;
var markerArray = [];
var metroId;
var restaurantsInMetro = [];
var serverEndpoint = "http://nodejs-akhetan.rhcloud.com";
//var serverEndpoint = "http://localhost:1234";

function initialize(){
    var mapCanvas=document.getElementById("map-canvas");
    center = new google.maps.LatLng (39.5, -98.35);
    var mapOptions = {
        center: center,
        zoom: 3,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
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
    });
    loadListOptions();
}
function enableAutocomplete(){
    $( "#restaurantInput" ).autocomplete({
        /*Source refers to the list of fruits that are available in the auto complete list. */
        source:restaurantsInMetro,
        /* auto focus true means, the first item in the auto complete list is selected by default. therefore when the user hits enter,
         it will be loaded in the textbox */
        autoFocus: true
    });
}

function addRemoveRestaurant(){

    if(listName == undefined) {
        document.getElementById("List").innerHTML = "Please select or create a list";
        return;
    }
    var restaurantName = document.getElementById("restaurantInput").value;
    var url;

    //add restaurant to list and write to server
    if (restaurantList.indexOf(restaurantName) == -1){
        url = serverEndpoint+"/addRestaurant?listName=" + listName + "&restaurantName="+restaurantName;

        $.ajax({
            type: 'POST',
            url: url,
            dataType: "text",
            data: restaurantName,
            success: function(){
                restaurantList.push(restaurantName);
                displayList();
                tempRestaurantList=[];
                tempRestaurantList.push(restaurantName);
                getPlacesFromGoogle();
            },
            error: function(xhr,ajaxOptions,thrownError){
                console.log("error thrown: " + thrownError + " Status: " + JSON.stringify(xhr));
            }
        });
    //remove restaurant from list and update server file
    } else {
        url = serverEndpoint + "/removeRestaurant?listName=" + listName + "&restaurantName=" +restaurantName;
        $.ajax({
            type: 'POST',
            url: url,
            dataType: "text",
            data: restaurantName,
            success: function(){
                var index = restaurantList.indexOf(restaurantName);
                restaurantList.splice(index, 1);
                removeMarker(restaurantName);
                displayList();
            },
            error: function(xhr,ajaxOptions,thrownError){
                console.log("error thrown: " + thrownError + " Status: " + JSON.stringify(xhr));
            }
        });
    }
    document.getElementById("restaurantInput").value = "";
}

function resetModalFields(){
    document.getElementById("listName").value = "";
    document.getElementById("city").value = "";
    document.getElementById("saveError").innerHTML = "";
}

function createNewList(){
    var url = serverEndpoint + "/createNewList";
    document.getElementById("saveError").innerHTML = "";
    listName = document.getElementById("listName").value;
    metroId = document.getElementById("city").value;

    if(listName == "" || metroId == ""){
        document.getElementById("saveError").innerHTML = "Please select a list name and city";
    }
    else if (lists.indexOf(listName) != -1){
        document.getElementById("saveError").innerHTML = "A list with that name already exists.  Please try another";
    }
    else {
        $('#createModal').modal('hide');
        $('#loading').show();
        document.getElementById("List").innerHTML="";
        var listObject = {
            metroId: metroId,
            listName: listName
         };
        $.ajax({
            type: 'POST',
            url: url,
            dataType: "text",
            data: JSON.stringify(listObject),
            success: writeFileCallback,
            error: function(xhr,ajaxOptions,thrownError){
                console.log("error thrown: " + thrownError + " Status: " + JSON.stringify(xhr));
                $('#loading').hide();
            }
        });
    }
}
function writeFileCallback(){
    lists.push(listName);
    restaurantList = [];
    restaurantsInMetro = [];
    recenterMap();
    loadListOptions();
    $("ul.nav li").removeClass("disabled").addClass('');
    $("ul.nav li").removeClass("disabledTab");
    $('.nav-tabs a[href=#favorites]').tab('show');
}

function deleteList() {
    document.getElementById("deleteError").innerHTML = "";
    var deletedList = document.getElementById("deleteListName").value;
    if(lists.indexOf(deletedList) <0 ) {
        document.getElementById("deleteError").innerHTML = "Please pick a valid list to delete";
    }
    else {
        var url = serverEndpoint + "/deleteList?filename=" + deletedList;
        $.ajax({
            type:'GET',
            url: url,
            dataType: "text",
            crossDomain: true,
            success: function(){
                deleteListCallback(deletedList);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log("error thrown: " + thrownError);
            }
        })
    }
}

function deleteListCallback(deletedList){
    $('#deleteModal').modal('hide');
    loadListOptions();
    document.getElementById("deleteListName").value = "";
    if(listName == deletedList){
        listName = "";
        removeAllMarkers();
        center = new google.maps.LatLng (39.5, -98.35);
        map.panTo(center);
        map.setZoom(3);
        $('#favoritesList').removeClass('').addClass("disabled");
        $('#favoritesList').addClass("disabledTab");
        $('#reservationsList').removeClass('').addClass("disabled");
        $('#reservationsList').addClass("disabledTab");
    }
}

function loadListOptions(){
    var url = serverEndpoint +"/loadListOptions";
    $.ajax({
        type:'GET',
        url: url,
        dataType: "text",
        crossDomain: true,
        success: returnOptionsCallback,
        error: function(xhr, ajaxOptions, thrownError) {
            console.log("error thrown: " + thrownError);
        }
    })
};


var returnOptionsCallback = function(data) {
    var str = data.replace(/.txt/g, "");
    lists = str.split(",");
    var listOptions = '';

    for (var i in lists) {
        listOptions = listOptions + "<li class = 'tag' onclick = 'loadList(\"" + lists[i] +"\")'> <span>" + lists[i] + "</span></button></li>";
    }
    document.getElementById("fileList").innerHTML = listOptions;
};


function loadList(listname){
    $('#loading').show()
    document.getElementById("List").innerHTML="";
    listName = listname;
    var url = serverEndpoint +"/loadlist?listname=" + listName;
    document.getElementById("reservationTimes").innerHTML = "";
    restaurantsInMetro = [];
    removeAllMarkers();
    $.ajax({
        type:'GET',
        url: url,
        dataType: "text",
        crossDomain: true,
        success: returnListCallback,
        error: function(xhr, ajaxOptions, thrownError) {
            console.log("error thrown: " + thrownError);
            $('#loading').hide();
        }
    })
}

var returnListCallback = function(data){
    var responseArray = data.split(",");
    metroId = responseArray[0];
    responseArray.shift();
    restaurantList = responseArray.slice(0);
    recenterMap();
    $("ul.nav li").removeClass("disabled").addClass('');
    $("ul.nav li").removeClass("disabledTab");

    $('.nav-tabs a[href=#favorites]').tab('show');
}

function recenterMap() {
    var url = serverEndpoint+"/centerMap?metroId=" + metroId;
    $.ajax({
        type: 'GET',
        url: url,
        dataType: "text",
        crossDomain: true,
        success: recenterCallback,
        error: function (xhr, ajaxOptions, thrownError) {
            console.log("Error status on callback: " + xhr.status);
            console.log("Error thrown: " + thrownError);
        }
    });
}

var recenterCallback = function(data) {
    var responseArray = JSON.parse(data);
    var lat = responseArray.Display.GeoLocation.Lat;
    var lng = responseArray.Display.GeoLocation.Lon;
    center = new google.maps.LatLng(lat, lng);
    map.panTo(center);
    map.setZoom(12);

    //read in and store full list of restaurants
    for (var i = 0; i < responseArray.Results.Restaurants.length; i++) {
        restaurantsInMetro.push(responseArray.Results.Restaurants[i].Name);
    }
    displayList();
    getPlacesFromGoogle();
    $('#loading').hide();
};

function displayList() {
    if(listName == ""){
        document.getElementById("List").innerHTML = "Please select or create a new list";
    }
    else {
        tempRestaurantList = restaurantList.slice(0);
        var list = '';
        for (var i in restaurantList) {
            if(restaurantsInMetro.indexOf(restaurantList[i]) >= 0) {
                list += "<li><i><b>";
                list += restaurantList[i];
                list += "</i></b></li>";
            }
            else {
                list += "<li>";
                list += restaurantList[i];
                list += "</li>";
            }
        }
        document.getElementById("List").innerHTML = list;
    }
}

function getPlacesFromGoogle() {
    var service;

    if(tempRestaurantList.length > 0 && tempRestaurantList[0] != "") {
        var request = {
            location: center,
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
        console.log(tempRestaurantList[0] + " ERROR: Unhandled status of search for: " + status);
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

function removeAllMarkers(){
    while (markerArray.length > 0) {
        markerArray[0].setMap(null);
        markerArray.splice(0,1);
    }
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
    //error case if list hasn't been chosen
    if(listName == undefined) {
        document.getElementById("reservationTimes").innerHTML = "Please select or create a list";
        return;
    }

    //reset the reservations in case there was a previous search
    document.getElementById("reservationTimes").innerHTML = "";
    removeHighlights();

    //create the url
    var partySize = document.getElementById("partySize").value;
    var date = document.getElementById("datePicker").value;
    var time = document.getElementById("time").value;
    var url = serverEndpoint+"/reservations?partySize=" + partySize + "&date=" + date + "&time=" + time + "&metroId=" + metroId;

    //show the spinner as results load
    $('#progress').show();

    //make the call to the server for reservation times
    $.ajax({
        type: 'GET',
        url: url,
        dataType: "text",
        crossDomain: true,
        success: availabilityCallback,
        error: function(xhr, ajaxOptions, thrownError) {
            console.log("Error status on callback: " + xhr.status);
            console.log("Error thrown: " + thrownError);
            $('#progress').hide();
            document.getElementById("reservationTimes").innerHTML = "Server Error (" + xhr.status + ")";
        }
    });

}

var availabilityCallback = function(data) {
    //get the json objects for each request
    var responseArray = JSON.parse(data);

    if(responseArray.message == "No search results"){
        $('#progress').hide();
        document.getElementById("reservationTimes").innerHTML =responseArray;
    }
    else {
        //search each request
        var outputStr = "";
        var lookup = {};
        var partySize = document.getElementById("partySize").value;

        for (var i = 0; i < responseArray.Results.Restaurants.length; i++) {
            lookup[responseArray.Results.Restaurants[i].Name] = responseArray.Results.Restaurants[i];
        }

        restaurantList.forEach(function (restaurant) {
            if (lookup.hasOwnProperty(restaurant)) {
                outputStr = outputStr + "<tr> <td><b>" + restaurant + ":</b></td> ";
                var checksum = parseInt(lookup[restaurant].Id) + parseInt(partySize) + 123;
                for (var i in lookup[restaurant].TimeSlots) {
                    if (lookup[restaurant].TimeSlots[i].IsAvail == true) {
                        var tempStr = lookup[restaurant].TimeSlots[i].TimeString;
                        var tempArray = tempStr.split(" ");
                        var reservationUrl = "http://www.opentable.com/httphandlers/ValidateReservationRequest.ashx?rid=" + lookup[restaurant].Id + "&d=" + encodeURI(lookup[restaurant].TimeSlots[i].LinkString)+ "&p="+partySize + "&checksum=" + checksum;
                        outputStr = outputStr + "<td><a href='" + reservationUrl + "'target='_blank'>"+ tempArray[0] + "</a></td>";
                    }
                }
                outputStr += "</tr>";
                highlightMarker(restaurant);
            }
        });
        $('#progress').hide();
        if(outputStr == ""){
            outputStr = "No available reservations";
        }
        document.getElementById("reservationTimes").innerHTML = outputStr;
    }
}