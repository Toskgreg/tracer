"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// constants
var MARKER_ICONS = {
  DEFAULT: "https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|FE7569",
  //RED
  GROUP: "https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|855dfd",
  //PURPLE
  SELECTED: "https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|34ba46",
  //GREEN
  RECURRING: "https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|e661ac",
  //PINK
  TRANSIENT: "https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|ff9900",
  //ORANGE
  TRAVEL: "https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|fdf569" //YELLOW

};
var GROUP_TYPES = {
  UNDEF: "undefined",
  RECURRING: "recurring",
  TRANSIENT: "transient",
  TRAVEL: "travel"
};
var MARKER_ZINDEX = {
  DEFAULT: 0,
  //ideally would have liked to use google.maps.Marker.MAX_ZINDEX, but it library isn't initalized when this tries to load
  SELECTED: 4,
  //selected marker is always on top
  GROUP: 3,
  //followed by others in its selected group
  TRANSIENT: 2,
  //transients are higher priority than recurring (???)
  RECURRING: 1,
  //
  TRAVEL: 0 //travel should always be on the bottom

}; ///////////////////////////////////////
// logging support

function HHMMSSmmm() {
  var now = new Date();
  var ms = "000" + now.getMilliseconds();
  return now.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1") + "." + ms.substr(ms.length - 3);
}

function isInitalized(parameter) {
  return isDefined(parameter) && parameter != null;
}

function isDefined(parameter) {
  return !(typeof parameter === "undefined");
}

function LOG(str) {
  if (!(typeof str === "string" || str instanceof String)) str = JSON.stringify(str);
  console.log(HHMMSSmmm() + " - " + str + "\n");
} // AJAX helpers
//
// Adapted from:  http://www.html5rocks.com/en/tutorials/es6/promises/#toc-javascript-promises
// Added the optional respType parameter
//
// Use:
//   get("http://...").then(function(result){
//        ... do whatever with 'result' ...
//       },
//       function(err){
//       });
//

/*

function get(url, respType, auth) {
    return doXHR("GET", url, respType, auth, null);
}

// Ex: post("createAcct.php", "fname=Henry&lname=Ford");
//     post("compactDbase.php");
function post(url, data, creds) {
    return doXHR("POST", url, data, null, creds);
}

function doXHR(method, url, param, auth, creds) {
    LOG("XHR " + method + ": " + url, "XHR");

    // Return a new promise.
    return new Promise(function (resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();

        if (method === "GET" && isDefined(param)) {
            var respType = param;
            if (
                respType === "blob" ||
                respType === "arrayBuffer" ||
                respType === "document" ||
                respType === "json" ||
                respType === "text"
            )
                req.responseType = respType;
        }
        req.open(method, url);

        req.onload = function () {
            // This is called even on 404 etc
            // so check the status
            if (req.status === 200) {
                // Resolve the promise with the response text
                LOG("XHR " + method + " success", "XHR");
                resolve(req.response);
            } else {
                LOG("XHR " + method + " failed:" + req.status, "XHR");
                // Otherwise reject with the status text
                // which will hopefully be a meaningful error
                reject(Error(req.statusText + ": " + url));
            }
        };

        // Handle network errors
        req.onerror = function () {
            LOG("XHR network error", "XHR");
            reject(Error("Network Error"));
        };

        // Make the request
        if (method === "POST" && isDefined(param)) {
            var data = param;
            if (isDefined(creds)) {
                req.setRequestHeader("Authorization", creds);
            }
            req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            req.send(data);
        } else {
            req.setRequestHeader("Authorization", "Basic " + auth);
            req.send();
        }
    });
}

*/


function doLogout() {
  localStorage.setItem("token", null);
  localStorage.setItem("MAP_API_KEY", null);
  document.cookie = "token= ; expires = Thu, 01 Jan 1970 00:00:00 GMT";
  location.reload();
}

function onLogoClick() {
  window.open(logo_destination_url);
}

function initDrawing() {
  drawingManager = new google.maps.drawing.DrawingManager();
  drawingManager.setDrawingMode(null);
  drawingManager.setMap(map);
  google.maps.event.addListener(drawingManager, "rectanglecomplete", function (rectangle) {
    drawingManager.setDrawingMode(null);
    selectedArea = rectangle;
    document.getElementById("select-area").classList.remove("pressed");
    enableDelete(true, false);
  });
}

function selectArea() {
  if (document.getElementById("select-area").classList.contains("pressed")) {
    // Already in select area mode, untoggle button and exit the
    document.getElementById("select-area").classList.remove("pressed");
    drawingManager.setDrawingMode(null);
    return;
  } // Erase any existing selection rect and put user in rect drawing mode


  selectNone();
  document.getElementById("select-area").classList.add("pressed"); //Setting options for the Drawing Tool. In our case, enabling Polygon shape.

  drawingManager.setOptions({
    drawingMode: google.maps.drawing.OverlayType.RECTANGLE,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [google.maps.drawing.OverlayType.RECTANGLE]
    },
    rectangleOptions: {
      strokeColor: "#6c6c6c",
      strokeWeight: 3.5,
      fillColor: "#926239",
      fillOpacity: 0.6,
      editable: true,
      draggable: true
    }
  });
}

function deleteMarker() {
  erasePoint();
}

function deleteAreaBoundary() {
  // Remove any selection area
  if (isInitalized(selectedArea)) {
    selectedArea.setMap(null);
    selectedArea = null;
  }

  if (isInitalized(selectedAreaControls)) {
    selectedAreaControls.close();
    selectedAreaControls = null;
  }

  enableDelete(false, false);
}

function enableDelete(all, single) {
  var btnDeleteAll = $("#delete-all-btn");
  var btnDelete = $("#delete-btn");

  if (all) {
    btnDeleteAll.removeClass("disabled");
  } else {
    btnDeleteAll.addClass("disabled");
  }

  if (single) {
    btnDelete.removeClass("disabled");
  } else {
    btnDelete.addClass("disabled");
  }
}

function updateLockIcon() {
  var lock = document.getElementById("lock-icon");

  if ($("#lock-window").prop("checked")) {
    lock.classList.remove("fa-lock-open");
    lock.classList.add("fa-lock");
  } else {
    lock.classList.remove("fa-lock");
    lock.classList.add("fa-lock-open");
  }
}

function updateDateRange(startDate, endDate) {
  var durationContainer = document.getElementById("duration-container");

  if (startDate.getTime() == -64800000) {
    durationContainer.style.display = "none";
    return;
  } else durationContainer.style.display = "block";

  updateLockIcon(); // Change the slider and labels related to the date range

  $("#date-start").text(moment.tz(startDate, TZ_STRING).format(DATE_FORMAT));
  $("#date-sep").html("&mdash;");
  $("#date-end").text(moment.tz(endDate, TZ_STRING).format(DATE_FORMAT));
  updateExposurePoints();
  var durHours = (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000);
  var Days = Math.floor(durHours / 24);
  var Remainder = durHours % 24;
  var Hours = Math.floor(Remainder);
  var text = "";

  if (Days > 0) {
    text += Days + " day"; // TRANSLATION:

    if (Days > 1) text += "s"; // TRANSLATION: plural
  }

  if (Hours > 0) {
    text += " " + Hours + " hr"; // TRANSLATION:

    if (Hours > 1) text += "s"; // TRANSLATION: plural
  }

  $("#duration").text(text);
}

function startupSequence() {
  // Setup the web UI for whatever login is necessary
  if (has_backend) {
    $("#login-panel").show();
  } else {
    $("#get-map-api-panel").show();
  }
}

function enterAPIKey() {
  localStorage.setItem("MAP_API_KEY", $("#api-key").val());
  location.reload();
}

function doLogin() {
  var payload = JSON.stringify({
    username: $("#username").val(),
    password: $("#password").val()
  });
  $.post(getAJAXOptions("/login"), payload).done(function (data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("MAP_API_KEY", data.maps_api_key);
    document.cookie = "token=" + data.token;
    location.reload();
  }).fail(function (data) {
    $("#validateTips").text(err);
  });
}

function showBounds() {
  var ne = map.getBounds().getNorthEast();
  var sw = map.getBounds().getSouthWest();
  $("#bounds").val('bounds: { "ne": { "latitude": ' + ne.lat().toString() + ', "longitude": ' + ne.lng().toString() + "}, " + '"sw": { "latitude": ' + sw.lat().toString() + ', "longitude": ' + sw.lng().toString() + "}}");
  var copyText = document.getElementById("bounds");
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  document.execCommand("copy");
  alert("Bounding box copied to the clipboard.");
}

var getAJAXOptions = function getAJAXOptions(url) {
  return _objectSpread(_objectSpread({}, AJAX_OPTIONS), {}, {
    url: "".concat(BACKEND_ROOT).concat(url),
    headers: {
      Authorization: localStorage.getItem("token")
    }
  });
};