/**
 * @namespace for coordinating the various visualization scripts into a
 * coherent web application.
 */
var MDPVis = {

  /**
   * Each of the chart objects. These are the callable objects when things need to update.
   */
  charts: {
    distributionCharts: {},
    temporalCharts: {}
  },

  /**
   * Request functions for objects from the server.
   */
  server: {

    /**
     * The domain that answers to the initialize, rollouts, optimize, and state requests.
     */
    dataEndpoint: "",

    /**
     * Ask the server for the starting parameters, put them onto the page,
     * then request the rollouts associated with the starting parameters.
     */
    getInitialize: function() {
      $.ajax({
        url: MDPVis.server.dataEndpoint + "/initialize",
        data: "",
        method: "GET"
      }).done(function(data) {
        MDPVis.server._createButtons(data);
        MDPVis.server.getRollouts();
        $(".policy-is-optimized-button").hide();
        $(".optimize-policy-button").prop("disabled", false);
        $(".optimize-policy-button").show();
      }).fail(function(data) {
        alert("Failed to fetch initialization. Try reloading.");
        console.error("Failed to fetch initialization object.");
        console.error(data.responseText);
      });
    },

    /**
     * Gets the rollouts defined for the current set of parameters from the MDP server.
     */
    getRollouts: function() {

      $("input").prop('disabled', true);

      // Construct the query object
      var q = {
        reward: {},
        transition: {},
        policy: {}
      };

      // collect all the button values and make a query string from them.
      $(".button_value").each(function(idx, v){
        q[v.getAttribute("data-param-set")][v.getAttribute("name")] = v.value;
      });

      // Fetch the initialization object from the server
      $.ajax({
        url: MDPVis.server.dataEndpoint + "/rollouts",
        data: q
      })
      .done(function(response){
        $(".post-getrollouts-show").show();
        $(".generate-rollouts-button").hide();
        $(".optimize-policy-button").prop("disabled", false);
        $(".rollouts-are-current-button").hide();
        $(".policy-is-optimizing-button").hide();
        $(".rollouts-are-generating-button").hide();

        var rollouts = response.rollouts;
        data.filters.currentRollouts = rollouts;
        var statistics = data.computeStatistics(rollouts);
        data.filters.assignActiveRollouts(rollouts);
        MDPVis.render.renderRollouts(rollouts, statistics);
        MDPVis.server._addToHistory(rollouts, statistics, $.param(q));
        $("input").prop('disabled', false);
      })
      .fail(function(response) {
        alert("Failed to fetch rollouts. Try reloading.");
        console.error("Failed to fetch rollouts.");
        console.error(response.responseText);
      });
    },

    /**
     * Ask the server to optimize a policy for the current parameter set.
     */
    getOptimizePolicy: function() {

      // Construct the query object
      var q = {
        reward: {},
        transition: {},
        policy: {}
      };

      // collect all the button values and make a query string from them.
      $(".button_value").each(function(idx, v){
        q[v.getAttribute("data-param-set")][v.getAttribute("name")] = v.value;
      });

      $(".generate-rollouts-button").hide();
      $(".optimize-policy-button").hide();
      $(".rollouts-are-current-button").hide();
      $(".policy-is-optimizing-button").show();
      $(".rollouts-are-generating-button").show();

      // Fetch the initialization object from the server
      $.ajax({
        url: MDPVis.server.dataEndpoint + "/optimize",
        data: q
      })
      .done(function(data){
        for( policyVariable in data ) {
          $("input[name='" + policyVariable + "']").val(data[policyVariable]);
        }
        MDPVis.server.getRollouts();
        $(".policy-is-optimizing-button").hide();
        $(".policy-is-optimized-button").show();
        })
      .fail(function(data) {
        alert("Failed to fetch initialization. Try reloading.");
        console.error("Failed to fetch initialization object.");
        console.error(data.responseText);
      });
    },

    /**
     * Get the state details from the server for the given rollout.
     * @param {int} pathwayID The identifier for the pathway of interest.
     * @param {int} eventNumber The identifier for the event of interest.
     */
    getState: function(pathwayID, eventNumber) {

      console.log("getting pathway " + pathwayID + " event " + eventNumber);

      // Construct the query object
      var q = {
        "Event Number": eventNumber,
        "Pathway Number": pathwayID,
        reward: {},
        transition: {},
        policy: {}
      };

      // collect all the button values and make a query string from them.
      $(".button_value").each(function(idx, v){
        q[v.getAttribute("data-param-set")][v.getAttribute("name")] = v.value;
      });

      // Fetch the initialization object from the server
      $.ajax({
        url: MDPVis.server.dataEndpoint + "/state",
        data: q
      })
      .done(function(data){
        var stats = data["statistics"];
        var statisticsArea = $(".statistics-area");
        statisticsArea.empty();
        for( var stat in stats ) {
          statisticsArea.append($("<p><strong>" + stat + "</strong>: " + stats[stat]  + "</p>"));
        }
        var images = data["images"];
        var imagesArea = $(".images-row");
        $(".image-column").remove();
        for( var i = 0; i <  images.length ; i++ ) {
          var imageColumn = $("<div class='col-xs-3 image-column'></div>")
          for ( var j = 0; j < images[i].length; j++ ) {
            imageColumn
              .append($('<p>' + images[i][j] + '</p>'))
              .append($('<img/>', {
                src: MDPVis.server.dataEndpoint + "/" + images[i][j],
                "class": "img-responsive",
                "width": "1200px" // max width since it is responsive
              }));
          }
          imagesArea.append(imageColumn);
        }
      })
      .fail(function(data) {
        alert("Failed to get state. Check your server.");
        console.error("Failed to get state.");
        console.error(data.responseText);
      });
    },

    /**
     * Create the buttons with the current values as specified by the init object.
     * The current buttons will first be cleared.
     * @param {object} init the initialization object as returned by the server.
     */
    _createButtons: function(init) {

      var createButtonSection = function(ob, paramSet, appendTo) {
        ob.forEach(function(vals){
          var units = vals["units"] + "\u00A0";
          if ( units === "\u00A0" ) { units = "\u00A0"; } // Non breaking space
          var newElement = $('<p/>')
          .append(document.createTextNode( units ))
          .append($('<input/>', {
            name: vals["name"],
            "class": "button_value",
            type: "number",
            "data-min": vals["min"], // Used to restore state later
            min: vals["min"],
            "data-max": vals["max"], // Used to restore state later
            max: vals["max"],
            step: (vals["max"]-vals["min"])/25,
            value: vals["current_value"],
            "data-param-set": paramSet,
            "data-initialization-value": JSON.stringify(vals)
          }))
          .append(document.createTextNode( " " ))
          .append($('<strong>' + vals["name"] + '</strong>'))
          .append(document.createTextNode(": " + vals["description"]));
          appendTo.append(newElement);
        });
      }

      for( key in init ) {
        var appendToID = "#" + key + "-buttons";
        var appendTo = $(appendToID);
        $(appendToID).empty();
        createButtonSection(init[key], key, appendTo);
      }

      function showServerRequestButtons() {
        MDPVis.updateHash();
        $(".generate-rollouts-button").show();
        $(".optimize-policy-button").show();
        $(".policy-is-optimized-button").hide();
        $(".rollouts-are-current-button").hide();
        $(".policy-is-optimizing-button").hide();
        $(".rollouts-are-generating-button").hide();
      }
      $( ".button_value" )
        .change(showServerRequestButtons)
        .on('input', showServerRequestButtons);
    },

    /**
     * Store the rollout object and create the buttons necessary to re-load it later.
     */
    _addToHistory: function(rollout, statistics, query) {

      // Save the rollout set and the statistics
      data.rolloutSets.push({rollout: rollout, statistics: statistics});

      // Hide the eye symbols that are not this one being added
      $(".comparator-rollouts").hide();
      $(".primary-rollouts").hide();

      var newElement = $('<p/>')
        .append($('<span/>', {
          "class": "glyphicon glyphicon-eye-open history-selector-icon primary-rollouts"
          }))
        .append($('<span/>', {
          "class": "glyphicon glyphicon-eye-close history-selector-icon comparator-rollouts",
          "style": "display:none;"
          }))
        .append(document.createTextNode(" Expected Value $ " + d3.round(statistics.expectedValue, 2)))
        .append($('<br/>'))
        .append($('<button/>', {
          "class": "btn btn-sm btn-primary load-button",
          "data-rollout-number": data.rolloutSets.length - 1,
          "data-query-string": query
          }).text('View Rollout Set ' + data.rolloutSets.length)
        )
        .append('&nbsp;')
        .append($('<button/>', {
          "class": "btn btn-sm btn-primary compare-to-button",
          "data-rollout-number": data.rolloutSets.length - 1,
          "data-query-string": query
          }).text('Compare To')
        );

      $("#history-buttons").prepend(newElement);

      $(".load-button").click(MDPVis.server._viewStoredRollouts);
      $(".compare-to-button").click(MDPVis.server._compareRollouts);
    },

    /**
     * Render a rollout set that was returned previously.
     * @param {event} ev The event that the button triggered.
     */
    _viewStoredRollouts: function(ev) {
      var rolloutsID = ev.currentTarget.getAttribute("data-rollout-number");
      var queryString = ev.currentTarget.getAttribute("data-query-string");
      var queryObject = $.deparam(queryString);

      // Enable changing the input buttons
      $("input")
        .prop('disabled', false)
        .css({color:""});

      // Hide comparison warning
      $(".comparison-warning").hide();

      // Show active eyes
      $(".primary-rollouts").hide();
      $(".comparator-rollouts").hide();
      $(ev.currentTarget).prevAll(".primary-rollouts:first").show();

      // Assign Buttons
      for ( section in queryObject ) {
        for ( button in queryObject[section] ) {
          var selector = "#"+section+"-buttons input[name='" + button + "']";
          var input = $(selector);
          input.attr("max", input.attr("data-max"));
          input.attr("min", input.attr("data-min"));
          input.val(queryObject[section][button]);
        }
      }
      var rollouts = data.rolloutSets[rolloutsID].rollout;
      var statistics = data.rolloutSets[rolloutsID].statistics;
      $(".generate-rollouts-button").hide();
      data.filters.assignActiveRollouts(rollouts);
      MDPVis.render.renderRollouts(rollouts, statistics);
      MDPVis.brush._updateAllBrushPositions();
      $(".rollouts-are-current-button").show();
      $(".policy-is-optimized-button").hide();
      $(".optimize-policy-button").show();
      MDPVis.updateHash();
    },

    /**
     * Render a rollout set that was returned previously.
     * @param {event} ev The event that the button triggered.
     */
    _compareRollouts: function(ev) {
      var rolloutsID = ev.currentTarget.getAttribute("data-rollout-number");

      $(".generate-rollouts-button").hide();
      $(".policy-is-optimized-button").hide();
      $(".optimize-policy-button").hide();
      $(".rollouts-are-current-button").show();
      $(".policy-is-optimizing-button").hide();
      $(".rollouts-are-generating-button").hide();

      // Show active eyes
      $(".comparator-rollouts").hide();
      $(ev.currentTarget).prevAll(".comparator-rollouts:first").show();

      // Show comparison warning
      $(".comparison-warning").show();

      // Dissable the input buttons
      $("input").prop('disabled', true);

      // Assign the buttons to the difference of their values
      var primaryElement = $(".primary-rollouts:visible").siblings("[data-query-string]")[0];
      var primaryQueryString = primaryElement.getAttribute("data-query-string");
      var primaryQueryObject = $.deparam(primaryQueryString);
      var comparatorQueryString = ev.currentTarget.getAttribute("data-query-string");
      var comparatorQueryObject = $.deparam(comparatorQueryString);
      for ( section in comparatorQueryObject ) {
        for ( button in comparatorQueryObject[section] ) {
          var selector = "#"+section+"-buttons input[name='" + button + "']";
          var input = $(selector);
          input.removeAttr("max");
          input.removeAttr("min");
          var difference = primaryQueryObject[section][button] - comparatorQueryObject[section][button];
          input.val(difference);
          if( difference > 0 ) {
            input.css({color: "#5cb85c"});
          } else if( difference < 0 ) {
            input.css({color: "#a63603"});
          }
        }
      }

      var rollouts = data.rolloutSets[rolloutsID].rollout;
      var statistics = data.computeStatistics(rollouts);
      MDPVis.render.compare(rollouts, statistics);
      MDPVis.brush._updateAllBrushPositions();
    }
  },

  /**
   * Functions associated with plotting data
   */
  render: {

    /**
     * Render the newly returned rollouts to the visualization.
     * @param {object} rollouts The rollouts object.
     * @param {object} statistics The statistics computed for the selected rollouts.
     * @param {boolean} rescale optional parameter indicating whether temporal charts should be rescaled.
     */
    renderRollouts: function(rollouts, statistics, rescale) {

      // Default to rescaling axes
      if( typeof rescale !== "boolean" ) {
        rescale = true;
      }

      // If we have charts to update, else create all the things
      if ( Object.keys(MDPVis.charts.distributionCharts).length > 0 ) {
        for( var variableName in MDPVis.charts.distributionCharts ) {
          MDPVis.charts.distributionCharts[variableName].updateData(rollouts,
            MDPVis.render._createInitialStateAccessor(variableName, data.filters.filteredTimePeriod));
        }
        MDPVis.render.rendertemporalCharts(rollouts, statistics, rescale);
      } else {
        for( var variableName in rollouts[0][0] ){
          var barChart = new BarChart(
            variableName, "units", rollouts,
            MDPVis.render._createInitialStateAccessor(variableName, 0));
          MDPVis.charts.distributionCharts[variableName] = barChart;
          $(".initial-states").append(barChart.getDOMNode());

          var fanChart = new FanChart(statistics.percentiles[variableName], variableName, rollouts);
          MDPVis.charts.temporalCharts[variableName] = fanChart;
          $(".line-charts").append(fanChart.getDOMNode());
        };
      }

      $(".rollouts-are-current-button").show();
    },

    /**
     * Update the fan charts with new data.
     * @param {object} rollouts The rollouts object.
     * @param {object} statistics The statistics computed for the selected rollouts.
     * @param {boolean} rescale Rescale the axis on update.
     */
    rendertemporalCharts: function(rollouts, statistics, rescale) {
      for( var variableName in MDPVis.charts.temporalCharts ) {
        MDPVis.charts.temporalCharts[variableName].updateData(statistics.percentiles[variableName], rollouts, rescale);
      }
    },

    /**
     * Put all the plots into comparison mode with the currently displayed rollouts and the
     * rollouts given as an argument.
     * @param {object} rollouts the rollouts we are wanting to compare the current set to.
     * @param {object} statistics the stats for the set of rollouts we are comparing to.
     */
    compare: function(rollouts, statistics) {
      for( var variableName in MDPVis.charts.distributionCharts ) {
        MDPVis.charts.distributionCharts[variableName].intersectWithSecondRolloutSet(rollouts);
      }
      var baseStatistics = data.computeStatistics(data.filters.activeRollouts);
      for( var variableName in MDPVis.charts.temporalCharts ) {
        MDPVis.charts.temporalCharts[variableName].intersectWithSecondRolloutSet(baseStatistics.percentiles[variableName], statistics.percentiles[variableName]);
      }
    },

    /**
     * Gives an accessor for the initial state's bar charts.
     * When you change the initial year this needs to be updated.
     */
    _createInitialStateAccessor: function(variableName, eventNumber) {
      return function(d) {
        return d[Math.min(eventNumber, d.length - 1)][variableName];
      }
    }
  },

  /**
   * Functions associated with updating data and brushes following a brush event.
   */
  brush: {

    /**
     * A distribution chart's brush has changed.
     * This will update the corresponding brush in the other charts and the
     * rollouts will be filtered.
     * @param {string} name The name of the variable being brushed.
     * @param {array} extent The extent of the current brush.
     */
    brushDistributionChart: function(name, extent) {

      // Remove filter if it was removed
      if( extent[0] === extent[1] ) {
        data.filters.removeFilter(name);
      } else {
        data.filters.addFilter(name, extent);
      }

      // Redraw each of the initial histograms
      for( var variableName in MDPVis.charts.distributionCharts ){
        MDPVis.charts.distributionCharts[variableName].brushCounts(data.filters.activeRollouts);
      }

      // Redraw each of the fan charts
      for( variableName in MDPVis.charts.temporalCharts ){
        var currentPercentiles = data.filters.statistics.percentiles[variableName];
        MDPVis.charts.temporalCharts[variableName].updateData(currentPercentiles, data.filters.activeRollouts, false);
      }
      MDPVis.brush._updateAllBrushPositions();
    },

    /**
     * Brush the visualization for a change in a temporal chart's brush.
     * @param {string} name The name of the variable being brushed.
     * @param {array} extent The extent of the current brush.
     */
    brushTemporalChart: function(name, extent) {

      var newMax = extent[1][1];
      var newMin = extent[0][1];
      var filteredValueChange = (newMax !== newMin);
      var filteredValueRemoved = false;

      // Assign the event number.
      // Don't add a filter if the eventNumber changed since the filter
      // extent can't change when the eventNumber changes. This matters if the
      // range changes upon changing the rollout set.
      var eventNumber = Math.floor(extent[0][0]);
      var eventNumberChange = data.filters.filteredTimePeriod !==  eventNumber &&
        extent[0][0] !== extent[1][0];
      if ( eventNumberChange ) {
        data.filters.changeFilteredTimePeriod(eventNumber);
      } else if( filteredValueChange ){
        data.filters.addFilter(name, [newMin, newMax]);
      } else {
        filteredValueRemoved = true;
        data.filters.removeFilter(name);
      }

      // Render the new data if the event depth changed,
      // otherwise just brush the initial histograms and render the fan charts
      var stats = data.filters.statistics;
      if( eventNumberChange ) {
        MDPVis.render.renderRollouts(data.filters.currentRollouts, stats, false);
      } else if( filteredValueChange || filteredValueRemoved ) {

        // Redraw each of the initial histograms
        for( var variableName in MDPVis.charts.distributionCharts ){
          MDPVis.charts.distributionCharts[variableName].brushCounts(data.filters.activeRollouts);
        }
        MDPVis.render.rendertemporalCharts(data.filters.activeRollouts, stats, false);
      }

      MDPVis.brush._updateAllBrushPositions();
    },

    /**
     * Update the position of all the brushes for their currently defined filter
     * positions. This does not change any data or filter values, it only changes
     * where brushes are rendered on the charts.
     */
    _updateAllBrushPositions: function() {

      var extent, eventDepth;

      for( var variableName in MDPVis.charts.distributionCharts ){
        if( data.filters.activeFilters[variableName] !== undefined ) {
          extent = data.filters.activeFilters[variableName];
          MDPVis.charts.distributionCharts[variableName].updateBrush(extent);
        } else {
          // Reset the brush
          MDPVis.charts.distributionCharts[variableName].updateBrush([0,0]);
        }
      }
      for( variableName in MDPVis.charts.temporalCharts ){
        eventDepth = data.filters.filteredTimePeriod;
        if( data.filters.activeFilters[variableName] !== undefined ) {
          var yExtent = data.filters.activeFilters[variableName];
          extent = [[eventDepth, yExtent[0]],[eventDepth + .5, yExtent[1]]];
          MDPVis.charts.temporalCharts[variableName].updateBrush(extent);
        } else {
          // Reset the brush
          extent = [[eventDepth, 0], [eventDepth + .5, 0]];
          MDPVis.charts.temporalCharts[variableName].updateBrush(extent);
        }
      }
    }
  },

  /**
   * Updates the options hash based on the currently defined set of
   * options buttons.
   */
  updateHash: function() {
    if( window.location.hash ) {
      var hash = window.location.hash.substring(1);
      var params = JSON.parse(decodeURIComponent(hash));
    } else {
      params = {};
    }
    // Construct the query object
    var data = {
      reward: [],
      transition: [],
      policy: []
    }

    // collect all the button values and make a query string from them.
    $(".button_value").each(function(idx, v){
      var currentInitString = v.getAttribute("data-initialization-value");
      var currentInit = JSON.parse(currentInitString);

      var current = {};
      current.current_value = v.value;
      current.description = currentInit.description;
      current.max = currentInit.max;
      current.min = currentInit.min;
      current.name = currentInit.name;
      current.units = currentInit.units;
      data[v.getAttribute("data-param-set")].push(current);
    });

    params.initialization = data;
    var newHash = encodeURIComponent(JSON.stringify(params));
    window.location.hash = "#" + newHash;
  },

  /**
   * Initialize the visualization.
   * Checks the hash text for pre-initialization and other options.
   */
  initialize: function() {

    $( ".generate-rollouts-button" ).click(function() {
      $(".generate-rollouts-button").hide();
      $(".optimize-policy-button").prop("disabled", true);
      $(".policy-is-optimized-button").hide();
      $(".rollouts-are-current-button").hide();
      $(".policy-is-optimizing-button").hide();
      $(".rollouts-are-generating-button").show();
      MDPVis.server.getRollouts();
    });

    $( ".optimize-policy-button" ).click(function() {
      $(".generate-rollouts-button").hide();
      $(".optimize-policy-button").prop("disabled", false);
      $(".optimize-policy-button").hide();
      $(".rollouts-are-current-button").hide();
      $(".policy-is-optimizing-button").show();
      $(".rollouts-are-generating-button").show();
      MDPVis.server.getOptimizePolicy();
    });

    // If there are no hash parameters, don't parse them
    if( ! window.location.hash ) {
      MDPVis.server.getInitialize();
      return;
    }

    /**
     * {
     *  options:
     *  {
     *       help: "show|hide",
     *       tooltip: "help|context"
     *   }
     * initialization:
     *   {
     *       SERVER_INITIALIZATION_OBJECT
     *   }
     * dataSource: "http://CORS_ENABLED_DOMAIN.com"
     * }
     */
    var hash = window.location.hash.substring(1);
    var params = JSON.parse(decodeURIComponent(hash));
    if( params.options && params.options.help === "hide") {
      $(".help-message").hide();
    }
    if( params.options && params.options.tooltip === "context" ) {
      console.log("todo");
    }
    if( params.dataSource ) {
      MDPVis.server.dataEndpoint = params.dataSource;
    }
    if( params.initialization ) {
      MDPVis.server._createButtons(params.initialization);
      MDPVis.server.getRollouts();
      $(".policy-is-optimized-button").hide();
      $(".optimize-policy-button").prop("disabled", true);
      $(".optimize-policy-button").show();
    } else {
      MDPVis.server.getInitialize();
    }
  },

  /**
   * Select a simulator from a list of CORS supporting simulators
   * in a modal window.
   */
  selectSimulator: function() {
    $("button[data-open-link]").click(function(elem){
      var openLink = elem.currentTarget.getAttribute("data-open-link");
      window.open(openLink);
    });
    $("button[data-simulator-path]").click(function(elem){
      $(".post-modal-show").show();
      var simulatorPath = elem.currentTarget.getAttribute("data-simulator-path");
      MDPVis.server.dataEndpoint = simulatorPath;
      MDPVis.initialize();
    });
    $('#serverSelectionModal').modal();
  }

}

// Don't run the app if it is in the testing environment.
if( d3.select("#reward-buttons").node() ) {
  document.addEventListener('DOMContentLoaded', MDPVis.selectSimulator);
}
