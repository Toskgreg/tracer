"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// JS code specific to publisher
if (logo) {
  $("#logo").attr("src", logo);
  $("#btn_logo").attr("src", logo);
  $("#map_logo").attr("src", logo);
} else {
  $("#logo").hide();
  $("#btn_logo").hide();
  $("#map_logo").hide();
}

if (logo_text) {
  $("#logo_name").attr("src", logo_text);
  $("#map_logo_name").attr("src", logo_text);
} else {
  $("#logo_name").hide();
  $("#map_logo_name").hide();
}

$(document).ready(function () {
  if (has_backend) {
    $("#loadFromFile").hide();
    $("#password").keypress(function (e) {
      if (e.keyCode == 13) $("#login").click();
    });
  } else {
    $("#loadFromServer").hide();
    $("#api-key").keypress(function (e) {
      if (e.keyCode == 13) $("#submit").click();
    });
  }
}); ///////////////////////////////////////
// Login

if (!isInitalized(MAP_API_KEY) || MAP_API_KEY == "" || MAP_API_KEY == null || MAP_API_KEY == "null" || MAP_API_KEY == "MAP_API_KEY") {
  // First run, do the "startup" sequence
  startupSequence();
} else {
  // Returning, already finished with the startup
  // Restore the last published name/URL
  // TODO: Call the backend instead to populate with an saved Name and URL
  $("#org_name").val(localStorage.getItem("org_name"));
  $("#org_url").val(localStorage.getItem("org_url"));
  $("#safe_path_json").val(localStorage.getItem("safe_path_json"));
  $("#floating-panel").show();
  $("#map").show();
  if (logo) $("#map_logo").show();
  if (logo_text) $("#map_logo_name").show();
  if (has_backend) $("#logout").show(); // Inject the Google Maps Javascript API key

  var script = document.createElement("script");
  script.async = true;
  script.defer = true;
  script.src = "https://maps.googleapis.com/maps/api/js?key=".concat(MAP_API_KEY, "&libraries=drawing,geometry&callback=initMap");
  document.head.appendChild(script);
}

var exposureLoaded = [];
var exposurePoints = []; // Associative array of groupId to markers, JSON elements, and
// LatLngBounds objects contained within each group
//

var exposureJSON;
var map; //May still have use for geo-coding
//var infoWindow;

var drawingManager;
var selectedArea;
var selectedAreaControls;
var selectedMarker;
var msVizStart = 0; // all times are in milliseconds;

var msVizEnd = 4743934953000;
var fileRegExp = new RegExp(/-REDACTED.*\.json$/);
var dateFirst = null;
var dateLast = null;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: {
      lat: 42.3601,
      lng: -71.0942
    },
    mapTypeId: "terrain"
  }); //infoWindow = new google.maps.InfoWindow();

  google.maps.event.addListenerOnce(map, "bounds_changed", function (event) {
    this.setZoom(map.getZoom() - 1);

    if (this.getZoom() > 15) {
      this.setZoom(15);
    }
  });
  initDrawing();
  initDateSlider(0, 0);
}

function selectNone() {
  deleteAreaBoundary();
}

function deleteAreaMarkers() {
  if (isInitalized(selectedArea)) {
    if (isInitalized(exposurePoints)) {
      var areaBounds = selectedArea.getBounds();
      exposurePoints.forEach(function (element, index) {
        if (areaBounds.contains(element.getPosition())) {
          deleteExposure(index, element);
        }
      });
    }

    deleteAreaBoundary();
  }
}

function clearMap() {
  clearMarkers();
  clearPolylines();
  selectedMarker = null;
}

function clearMarkers() {
  if (isInitalized(exposurePoints)) {
    exposurePoints.forEach(function (element, index) {
      if (isInitalized(element)) {
        deleteMarker(element);
      }
    });
    exposurePoints = null;
  }
}

function normalizeInputData(arr) {
  // This fixes several issues that I found in different input data:
  //   * Values stored as strings instead of numbers
  //   * Extra info in the input
  //   * Improperly sorted data (can happen after an Import)
  var result = [];

  for (var i = 0; i < arr.length; i++) {
    elem = arr[i];

    if ("time" in elem && "latitude" in elem && "longitude" in elem) {
      var lat = Number(elem.latitude);
      var lng = Number(elem.longitude);

      if (lat != 0 || lat != 0) {
        result.push({
          time: Number(elem.time),
          latitude: lat,
          longitude: lng
        });
      }
    }
  }

  result.sort();
  return result;
}

function loadExposureData(exposureJSON) {
  var lastLatLng = null;
  var currentGroupId = 0;
  var currentGroupBounds = new google.maps.LatLngBounds();
  exposureJSON.forEach(function (element, index) {
    if (exposureLoaded.findIndex(function (t) {
      return t.latitude === element.latitude && t.longitude === element.longitude && t.time == element.time;
    }) != -1) {
      console.log("Skipping: " + element.latitude + "x" + element.longitude);
      return; // point/time already exists
    } // TODO: Auto-filter based on date (< 14 days is all the further we need to load)


    var elementLatLng = new google.maps.LatLng(element.latitude, element.longitude);
    var marker = new google.maps.Marker({
      position: elementLatLng,
      title: moment.tz(element.time, TZ_STRING).format(DATE_FORMAT),
      icon: MARKER_ICONS.DEFAULT,
      map: map
    });
    exposureLoaded.push(element);
    exposurePoints.push(marker); //just add this location to our group bounds in order to update the center of the group appropriately

    currentGroupBounds.extend(elementLatLng); //set our current JSON element properties with our current group info

    element.groupId = currentGroupId; //we add the event listener after we determine what group the marker is in

    google.maps.event.addListener(marker, "click", function (thisMarker, groupId) {
      return function (event) {
        selectNone();
        enableDelete(false); //then set the clicked marker to green

        thisMarker.setIcon(MARKER_ICONS.SELECTED);
        selectedMarker = thisMarker;
      };
    }(marker, currentGroupId));
    lastLatLng = elementLatLng;
  });
}

function loadPath() {
  if (has_backend) {
    // Load from backend
    $.get(getAJAXOptions("/redacted_trails")).done(function (content) {
      if (content.organization) {
        $("#org_name").val(content.organization.authority_name);
        localStorage.setItem("org_name", content.organization.authority_name);
        $("#org_url").val(content.organization.info_website);
        localStorage.setItem("org_url", content.organization.info_website);
        $("#safe_path_json").val(content.organization.safe_path_json);
        localStorage.setItem("safe_path_json", content.organization.safe_path_json);
      }

      var trails = content["data"];

      for (var i = 0; i < trails.length; i++) {
        exposureJSON = trails[i]["trail"];
        exposureJSON = exposureJSON.map(function (obj) {
          return _objectSpread(_objectSpread({}, obj), {}, {
            time: obj.time * 1000
          });
        });
        loadExposureData(exposureJSON);
      } // Zoom to see all of the loaded points


      zoomToExtent(); //auto-classify all points

      if (_typeof(exposureJSON) === "object") {
        if (dateFirst === null || exposureJSON[0].time < dateFirst) {
          dateFirst = exposureJSON[0].time;
        }

        if (dateLast === null || exposureJSON[exposureJSON.length - 1].time > dateLast) {
          dateLast = exposureJSON[exposureJSON.length - 1].time;
        }
      }

      initDateSlider(dateFirst, dateLast);
      updateStats();
      $("#save").removeClass("disabled").addClass("enabled").prop("disabled", false);
    }).fail(function (error) {
      console.log(error);
    });
  } else {
    // Load from selected files
    for (var i = 0; i < $("#privatekitJSON").get(0).files.length; i++) {
      file = $("#privatekitJSON").get(0).files[i];

      if (typeof window.FileReader !== "function") {
        alert("The file API isn't supported on this browser yet.");
      } else if (file === undefined || !fileRegExp.test(file.name)) {
        alert("Unable to load the file.");
      } else {
        fr = new FileReader();

        fr.onload = function (map, points) {
          return function (event) {
            var lines = event.target.result;
            exposureJSON = normalizeInputData(JSON.parse(lines));
            loadExposureData(exposureJSON); // Zoom to see all of the loaded points

            zoomToExtent(); //auto-classify all points

            if (dateFirst === null || exposureJSON[0].time < dateFirst) dateFirst = exposureJSON[0].time;
            if (dateLast === null || exposureJSON[exposureJSON.length - 1].time > dateLast) dateLast = exposureJSON[exposureJSON.length - 1].time;
            initDateSlider(dateFirst, dateLast);
            updateStats();
          };
        }(map, exposurePoints);

        fr.readAsText(file);
        $("#save").removeClass("disabled").addClass("enabled").prop("disabled", false);
      }
    }
  }
}

function initDateSlider(msStartDate, msEndDate) {
  var incrementFactor = 1000 * 60 * 60; //milliseconds in one hour

  var dateRange = Math.ceil((msEndDate - msStartDate) / incrementFactor) + 1;
  $(function () {
    var windowRange = {
      value: null
    }; //needs to be an object to work nicely with closures.  Alternatively, can move to a global variable, but that is a PITA

    $("#slider-range").slider({
      range: true,
      min: 0,
      max: dateRange,
      values: [0, dateRange],
      start: function (windowRange) {
        return function (event, ui) {
          var eventSuccess = true;

          if ($("#lock-window").prop("checked")) {
            if (!isInitalized(windowRange.value)) {
              windowRange.value = ui.values[1] - ui.values[0];

              if (windowRange.value <= 0) {
                eventSuccess = false;
                windowRange.value = null;
                $("#lock-window").prop("checked", false);
                alert("Cannot move lock sliders when locked to the same day!");
              }
            }
          } else {
            windowRange.value = null;
          }

          return eventSuccess;
        };
      }(windowRange),
      slide: function (msStartDate, incrementFactor, windowRange) {
        return function (event, ui) {
          var eventSuccess = true;

          if ($("#lock-window").prop("checked") && isInitalized(windowRange.value)) {
            var slidingHandle = ui.handleIndex;
            var followingHandle = Math.abs(slidingHandle - 1);

            if (ui.values[1] - ui.values[0] != windowRange.value) {
              var valueDelta = 0;

              if (followingHandle == 1) {
                valueDelta = windowRange.value - (ui.values[1] - ui.values[0]);
              } else if (followingHandle == 0) {
                valueDelta = ui.values[1] - ui.values[0] - windowRange.value;
              }

              var followingHandleTargetValue = ui.values[followingHandle] + valueDelta;

              if (followingHandleTargetValue >= $("#slider-range").slider("option", "min") && followingHandleTargetValue <= $("#slider-range").slider("option", "max")) {
                $("#slider-range").slider("values", followingHandle, ui.values[followingHandle] + valueDelta);
                ui.values[followingHandle] += valueDelta;
              } else {
                eventSuccess = false;
              }
            }
          }

          if (eventSuccess) {
            msVizStart = msStartDate + ui.values[0] * incrementFactor;
            msVizEnd = msStartDate + ui.values[1] * incrementFactor;
            var startDate = new Date(msVizStart);
            var endDate = new Date(msVizEnd);
            updateDateRange(startDate, endDate);
          }

          return eventSuccess;
        };
      }(msStartDate, incrementFactor, windowRange)
    }); // Set the display string

    var startDate = new Date(msStartDate + $("#slider-range").slider("values", 0) * incrementFactor);
    var endDate = new Date(msStartDate + $("#slider-range").slider("values", 1) * incrementFactor);
    updateDateRange(startDate, endDate);
  });
}

function updateExposurePoints() {
  var incrementFactor = 1000 * 60; //milliseconds in one minute

  var applyTimeWindow = function applyTimeWindow(exposureJSONElement) {
    var elementIndex = exposureLoaded.indexOf(exposureJSONElement); //hide all markers if the exposure timestamp is outside the window

    if (exposureJSONElement.time < msVizStart || exposureJSONElement.time > msVizEnd) {
      removeMarker(exposurePoints[elementIndex]);
    } else {
      //show all markers, if they have not been redacted via deletion
      if (isInitalized(exposureJSONElement.latitude) && isInitalized(exposureJSONElement.longitude)) {
        addMarker(exposurePoints[elementIndex]);
      }
    }
  };

  if (isInitalized(exposurePoints)) {
    exposureLoaded.forEach(function (element, index) {
      applyTimeWindow(element);
    });
    updateStats();
  }
}

function zoomToExtent(mapBounds) {
  // Zoom to the extent of the selection or the extent of all points
  if (mapBounds === undefined || mapBounds === null) {
    if (selectedArea) return zoomToArea();else if (isInitalized(exposurePoints) && exposurePoints.length > 0) {
      mapBounds = new google.maps.LatLngBounds();
      exposurePoints.forEach(function (element, index) {
        if (element.getMap() !== null) {
          mapBounds.extend(element.getPosition());
        }
      });
    } else {
      map.setCenter(new google.maps.LatLng(39.0609926, -94.5734936, 19.75));
      return;
    }
  }

  map.setCenter(mapBounds.getCenter());
  map.fitBounds(mapBounds);
}

function zoomToArea() {
  // TODO: Should we zoom to the extent of the points within the
  //       area instead of the area itself?
  var areaBounds = selectedArea.getBounds();
  map.setCenter(areaBounds.getCenter());
  map.fitBounds(areaBounds);
}

function addMarker(marker) {
  marker.setMap(map);
}

function addLine(polyline) {
  polyline.setMap(map);
}

function removeMarker(marker) {
  if (isInitalized(marker)) {
    marker.setMap(null);
  }
}

function removeLine(polyline) {
  if (isInitalized(polyline)) {
    polyline.setMap(null);
  }
}

function erasePoint(event) {
  if (isInitalized(selectedMarker)) {
    editExposure(event, selectedMarker);
  }
}

function editExposure(event, marker) {
  var i = 0;
  var bFoundPath = false; //DANGER: loop condition uses shortcutting and in-place incrementing in order to work!

  do {
    if (exposurePoints[i] === marker) {
      bFoundPath = true;
      deleteExposure(i, marker);
    }
  } while (!bFoundPath && ++i < exposurePoints.length);

  enableDelete(false, false);
}

function deleteExposure(i, marker) {
  //remove the marker from the map
  removeMarker(marker); //remove the connecting lines

  removeLinesToPoint(i); //handle the actual exposure data

  exposureLoaded[i].latitude = null;
  exposureLoaded[i].longitude = null;
  updateStats();
}

function updateStats() {
  var statsElement = $("#stats");
  var loadedElement = $("#loaded", statsElement);
  var visibleCount = 0;
  var hiddenCount = 0;
  var deletedCount = 0;
  var totalCount = 0;
  var visibleElement = $("#visible", statsElement);
  var hiddenElement = $("#hidden", statsElement);
  var deletedElement = $("#deleted", statsElement);
  var totalElement = $("#total", statsElement);

  if (loadedElement.length == 0) {
    loadedElement = $("<div />").prop("id", "loaded").html("Loaded: " + exposureLoaded.length + "");
    statsElement.prepend(loadedElement);
  }

  exposureLoaded.forEach(function (element, index) {
    if (!isInitalized(element.latitude) || !isInitalized(element.longitude)) {
      deletedCount++;
    } else if (isInitalized(exposurePoints[index].getMap())) {
      visibleCount++;
    } else {
      hiddenCount++;
    }
  });
  totalCount = visibleCount + deletedCount + hiddenCount;
  visibleElement.html(+visibleCount);
  hiddenElement.html(+hiddenCount);
  deletedElement.html(+deletedCount);
  totalElement.html(+totalCount);
}

function saveText() {
  var complete = {
    authority_name: $("#org_name").val(),
    publish_date: Math.round(Date.now() / 1000),
    info_website: $("#org_url").val(),
    safe_path_json: $("#safe_path_json").val()
  }; // Remember these for next time we load the Publisher

  localStorage.setItem("org_name", complete.authority_name);
  localStorage.setItem("org_url", complete.info_website);
  localStorage.setItem("safe_path_json", complete.safe_path_json);

  if (has_backend) {
    // POST safe-paths.json data to the backend
    $("#saving-panel").show();
    complete.start_date = Math.round(msVizStart / 1000);
    complete.end_date = Math.round(msVizEnd / 1000);
    var payload = JSON.stringify(complete);
    $.post(getAJAXOptions("/safe_paths"), payload).done(function (content) {
      $("#progress").text("Result:  Published ".concat(moment.tz(content.safe_path.publish_date * 1000, TZ_STRING).format(DATE_FORMAT)));
      setTimeout(function () {
        $("#saving-panel").hide();
      }, 5000);
    }).fail(function (error) {
      $("#saving-panel").text("Result:  ".concat(error));
      setTimeout(function () {
        $("#saving-panel").hide();
      }, 5000);
    });
  } else {
    // Create the export format.  It should be exactly the same as
    // the import format, just missing the redacted points.
    complete.concern_points = [];

    for (var i = 0; i < exposureLoaded.length; i++) {
      if (isInitalized(exposureLoaded[i].latitude) && isInitalized(exposureLoaded[i].longitude) && isInitalized(exposurePoints[i].getMap())) {
        var element = {};
        element.time = exposureLoaded[i].time;
        element.longitude = exposureLoaded[i].longitude;
        element.latitude = exposureLoaded[i].latitude;
        complete.concern_points.push(element);
      }
    } // Simple save to safe-paths.json


    var text = JSON.stringify(complete);
    var filename = "safe-paths.json";
    var a = document.createElement("a");
    a.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    a.setAttribute("download", filename);
    a.click();
  }
}