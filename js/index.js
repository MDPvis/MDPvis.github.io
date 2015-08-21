var MDPVis = {

  /**
   * Gives the attributes that are currently being filtered and what their
   * active range is. This object is assigned by the brushes defined by the
   * histograms.
   */
  filters: {
    starting: {}, // The set of filters on the initial state
    endOfPeriod: {}, // The set of filters on the ending state
    timePeriod: {start: 0, end: -1}, // The event numbers the filters are applied to
    activeRollouts: [], // The set of rollouts that are not filtered
    currentRollouts: {}, // All the eligible rollout objects

    /**
     * Assign an array of rollouts that are not currently filtered
     */
    assignActiveRollouts: function(rollouts) {
      MDPVis.filters.currentRollouts = rollouts;
      MDPVis.filters.activeRollouts = [];
      rollouts.forEach(function(rollout) {
        if( MDPVis.filters.isActiveRollout(rollout) ) {
          MDPVis.filters.activeRollouts.push(rollout);
        }
      });
      $(".displayed-state-count").text(MDPVis.filters.activeRollouts.length);
      $(".total-state-count").text(rollouts.length);
    },

    /**
     * Determines whether the current rollout is brushed by the active filters.
     * @param {object} rollout The rollout that we want to know the state of.
     * @return {boolean} Indicates (true) that the rollout is not brushed.
     */
    isActiveRollout: function(rollout) {
      // todo, cache these since it is inefficient to do this every time.
      // todo, although this is likely a less important optimization.

      // Include shorter rollouts based on their last known value
      var startIndex = Math.min(MDPVis.filters.timePeriod.start, rollout.length-1);
      var endIndex = Math.min(MDPVis.filters.timePeriod.end, rollout.length-1);
      for( var variable in MDPVis.filters.starting ) {
        if(rollout[startIndex][variable] < MDPVis.filters.starting[variable][0]){
          return false;
        }
        if(rollout[startIndex][variable] > MDPVis.filters.starting[variable][1]){
          return false;
        }
      }
      for( var variable in MDPVis.filters.endOfPeriod ) {
        if(rollout[endIndex][variable] < MDPVis.filters.endOfPeriod[variable][0]){
          return false;
        }
        if(rollout[endIndex][variable] > MDPVis.filters.endOfPeriod[variable][1]){
          return false;
        }
      }
      return true;
    }
  },

  /**
   * Each of the chart objects. These are the callable objects when things need to update.
   */
  charts: {
    initialHistograms: {},
    fanCharts: {}
  },

  /**
   * Each set of rollouts are stored here so that they can be re-loaded
   * or compared to later. The rollouts are stored with their computed statistics
   * [{rollout:[], statistics:{percentiles: {VARIABLE:[{percentile0:0, ..., percentile100:999},...]}}},...]
   */
  rolloutSets: [],

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
      .done(function(data){
        var rollouts = data.rollouts;

        $(".generate-rollouts-button").hide();
        $(".optimize-policy-button").prop("disabled", false);
        $(".rollouts-are-current-button").hide();
        $(".policy-is-optimizing-button").hide();
        $(".rollouts-are-generating-button").hide();

        MDPVis.filters.currentRollouts = rollouts;
        var statistics = MDPVis.render.computeStatistics(rollouts);
        MDPVis.filters.timePeriod.end = d3.max(rollouts, function(d){return d.length - 1;});
        MDPVis.filters.assignActiveRollouts(rollouts);
        MDPVis.render.renderRollouts(rollouts, statistics);
        MDPVis.server._addToHistory(rollouts, statistics, $.param(q));
        $("input").prop('disabled', false);
      })
      .fail(function(data) {
        alert("Failed to fetch rollouts. Try reloading.");
        console.error("Failed to fetch rollouts.");
        console.error(data.responseText);
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
                src: "/" + images[i][j],
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
          var newElement = $('<p/>')
          .append(document.createTextNode( vals["units"] + " " ))
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

      // todo: highlightthe variables if they are different (green for positive, red for negative).

      // Save the rollout set and the statistics
      MDPVis.rolloutSets.push({rollout: rollout, statistics: statistics});

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
          "data-rollout-number": MDPVis.rolloutSets.length - 1,
          "data-query-string": query
          }).text('View Rollout Set ' + MDPVis.rolloutSets.length)
        )
        .append('&nbsp;')
        .append($('<button/>', {
          "class": "btn btn-sm btn-primary compare-to-button",
          "data-rollout-number": MDPVis.rolloutSets.length - 1,
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
      $("input").prop('disabled', false);

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
      var rollouts = MDPVis.rolloutSets[rolloutsID].rollout;
      MDPVis.filters.timePeriod.end = d3.max(rollouts, function(d){return d.length - 1;});
      var statistics = MDPVis.rolloutSets[rolloutsID].statistics;
      $(".generate-rollouts-button").hide();
      MDPVis.filters.assignActiveRollouts(rollouts);
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
          input.val(primaryQueryObject[section][button] - comparatorQueryObject[section][button]);
        }
      }

      var rollouts = MDPVis.rolloutSets[rolloutsID].rollout;
      var statistics = MDPVis.render.computeStatistics(rollouts);
      MDPVis.render.compare(rollouts, statistics);
      MDPVis.brush._updateAllBrushPositions();
    }
  },

  /**
   * Functions associated with plotting data
   */
  render: {

    /**
     * Compute the derived statistics for the rollouts.
     * @param {object} rollouts The rollouts object we compute stats on.
     * @return {object} The statistics object we compute.
     */
    computeStatistics: function(activeRollouts) {
      console.log("todo: implement sampling since this will be costly computationally");

      var statistics = {};
      statistics.percentiles = {};

      if( activeRollouts.length < 1 ) {
        $('#warningModal').modal();
        return;
      }

      var maxRolloutDepth = d3.max(MDPVis.filters.currentRollouts, function(d){return d.length;});
      for( var variableName in activeRollouts[0][0] ){
        statistics.percentiles[variableName] = []; // [{percentile0:0,...,percentile100:999}]
        for( var eventIndex = 0; eventIndex < maxRolloutDepth; eventIndex++ ) {
          var accessor = function(d) {
            if( eventIndex >= d.length ) {
              return d[d.length - 1][variableName];
            } else {
              return d[eventIndex][variableName];
            }
          }
          var stat = percentiles.getPercentiles(activeRollouts, accessor, eventIndex);
          statistics.percentiles[variableName].push(stat);
        }
      }
      var totalReward = 0;
      for ( var rolloutNumber = 0; rolloutNumber < activeRollouts.length; rolloutNumber++ ) {
        for( var eventIndex = 0; eventIndex < activeRollouts[rolloutNumber].length; eventIndex++ ) {
          totalReward += activeRollouts[rolloutNumber][eventIndex]["Discounted Reward"];
        }
      }
      statistics.expectedValue = totalReward/activeRollouts.length;

      return statistics;
    },

    /**
     * Render the newly returned rollouts to the visualization.
     * @param {object} rollouts The rollouts object.
     * @param {object} statistics The statistics computed for the selected rollouts.
     */
    renderRollouts: function(rollouts, statistics) {

      // If we have charts to update, else create all the things
      if ( Object.keys(MDPVis.charts.initialHistograms).length > 0 ) {
        for( var variableName in MDPVis.charts.initialHistograms ) {
          MDPVis.charts.initialHistograms[variableName].updateData(rollouts,
            MDPVis.render._createInitialStateAccessor(variableName, MDPVis.filters.timePeriod.start));
        }
        MDPVis.render.renderFanCharts(rollouts, statistics, true);
      } else {
        for( var variableName in rollouts[0][0] ){
          var barChart = new BarChart(
            variableName, "units", rollouts,
            MDPVis.render._createInitialStateAccessor(variableName, 0));
          MDPVis.charts.initialHistograms[variableName] = barChart;
          $(".initial-states").append(barChart.getDOMNode());

          var fanChart = new FanChart(statistics.percentiles[variableName], variableName, rollouts);
          MDPVis.charts.fanCharts[variableName] = fanChart;
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
    renderFanCharts: function(rollouts, statistics, rescale) {
      for( var variableName in MDPVis.charts.fanCharts ) {
        MDPVis.charts.fanCharts[variableName].updateData(statistics.percentiles[variableName], rollouts, rescale);
      }
    },

    /**
     * Put all the plots into comparison mode with the currently displayed rollouts and the
     * rollouts given as an argument.
     * @param {object} rollouts the rollouts we are wanting to compare the current set to.
     * @param {object} statistics the stats for the set of rollouts we are comparing to.
     */
    compare: function(rollouts, statistics) {
      for( var variableName in MDPVis.charts.initialHistograms ) {
        MDPVis.charts.initialHistograms[variableName].intersectWithSecondRolloutSet(rollouts);
      }
      var baseStatistics = MDPVis.render.computeStatistics(MDPVis.filters.activeRollouts);
      for( var variableName in MDPVis.charts.fanCharts ) {
        MDPVis.charts.fanCharts[variableName].intersectWithSecondRolloutSet(baseStatistics.percentiles[variableName], statistics.percentiles[variableName]);
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
     * A histogram's brush has changed.
     * This will update the corresponding brush in the fan chart and the
     * rollouts being filtered.
     * @param {string} name The name of the variable being brushed.
     * @param {array} extent The extent of the current brush.
     */
    brushInitial: function(name, extent) {

      // Remove filter if it was removed
      if( extent[0] === extent[1] ) {
        delete MDPVis.filters.starting[name];
      } else {
        MDPVis.filters.starting[name] = [extent[0], extent[1]];
      }

      // Filter the active rollouts
      MDPVis.filters.assignActiveRollouts(MDPVis.filters.currentRollouts);

      // Recompute the statistics
      var stats = MDPVis.render.computeStatistics(MDPVis.filters.activeRollouts);

      // Redraw each of the initial histograms
      for( var variableName in MDPVis.charts.initialHistograms ){
        MDPVis.charts.initialHistograms[variableName].brushCounts(MDPVis.filters.activeRollouts);
      }

      // Redraw each of the fan charts
      for( variableName in MDPVis.charts.fanCharts ){
        MDPVis.charts.fanCharts[variableName].updateData(stats.percentiles[variableName], MDPVis.filters.activeRollouts, false);
      }
      MDPVis.brush._updateAllBrushPositions();
    },

    /**
     * Brush the visualization for a change in the fan chart's brush.
     * @param {string} name The name of the variable being brushed.
     * @param {array} extent The extent of the current brush.
     */
    brushFan: function(name, extent) {

      var newMax = extent[1][1];
      var newMin = extent[0][1];
      var filteredValueChange = (newMax !== newMin);
      var filteredValueRemoved = false;

      // Assign the event number.
      // Don't add a filter if the eventNumber changed since the filter
      // extent can't change when the eventNumber changes. This matters if the
      // range changes upon changing the rollout set.
      var eventNumber = Math.floor(extent[0][0]);
      var eventNumberChange = MDPVis.filters.timePeriod.start !==  eventNumber &&
        extent[0][0] !== extent[1][0];
      if ( eventNumberChange ) {
        MDPVis.filters.timePeriod.start = eventNumber;
      } else if( filteredValueChange ){
        MDPVis.filters.starting[name] = [];
        MDPVis.filters.starting[name].push(newMin);
        MDPVis.filters.starting[name].push(newMax);
      } else {
        filteredValueRemoved = true;
        delete MDPVis.filters.starting[name];
      }

      // Update the data from the brushes
      MDPVis.filters.assignActiveRollouts(MDPVis.filters.currentRollouts);
      var stats = MDPVis.render.computeStatistics(MDPVis.filters.activeRollouts);

      // Render the new data if the event depth changed,
      // otherwise just brush the initial histograms and render the fan charts
      if( eventNumberChange ) {
        MDPVis.render.renderRollouts(MDPVis.filters.currentRollouts, stats);
        MDPVis.render.renderFanCharts(MDPVis.filters.activeRollouts, stats, false);
      } else if( filteredValueChange || filteredValueRemoved ) {

        // Redraw each of the initial histograms
        for( var variableName in MDPVis.charts.initialHistograms ){
          MDPVis.charts.initialHistograms[variableName].brushCounts(MDPVis.filters.activeRollouts);
        }
        MDPVis.render.renderFanCharts(MDPVis.filters.activeRollouts, stats, false);
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

      for( var variableName in MDPVis.charts.initialHistograms ){
        if( MDPVis.filters.starting[variableName] !== undefined ) {
          extent = MDPVis.filters.starting[variableName];
          MDPVis.charts.initialHistograms[variableName].updateBrush(extent);
        } else {
          // Reset the brush
          MDPVis.charts.initialHistograms[variableName].updateBrush([0,0]);
        }
      }
      for( variableName in MDPVis.charts.fanCharts ){
        if( MDPVis.filters.starting[variableName] !== undefined ) {
          eventDepth = MDPVis.filters.timePeriod.start;
          var yExtent = MDPVis.filters.starting[variableName];
          extent = [[eventDepth, yExtent[0]],[eventDepth + .5, yExtent[1]]];
          MDPVis.charts.fanCharts[variableName].updateBrush(extent);
        } else {
          // Reset the brush
          eventDepth = MDPVis.filters.timePeriod.start;
          extent = [[eventDepth, 0], [eventDepth + .5, 0]];
          MDPVis.charts.fanCharts[variableName].updateBrush(extent);
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

    if( document.location.host === "mdpvis.github.io" ) {
      var localEndpoint = "http://localhost:8938";
      console.log("This is being served by GitHub");
      console.log("Attempting to conntect to a server " + localEndpoint + "...");
      MDPVis.server.dataEndpoint = localEndpoint;
    }

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
  }
}

// Don't run the app if it is in the testing environment.
if( d3.select("#reward-buttons").node() ) {
  document.addEventListener('DOMContentLoaded', MDPVis.initialize);
}
