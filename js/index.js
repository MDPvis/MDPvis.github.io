/**
 * @namespace for coordinating the various visualization scripts into a
 * coherent web application.
 */
var MDPVis = {

  /**
   * Each of the chart objects. These are the callable objects when things need to update.
   */
  charts: {
    sliceCharts: {},
    temporalCharts: {},

    /**
     * Update the rendering of all the existing charts based on the current data.
     */
    updateAll: function() {
      // Redraw each of the initial histograms
      for( var variableName in MDPVis.charts.sliceCharts ){
        MDPVis.charts.sliceCharts[variableName].brushCounts();
      }

      // Redraw each of the fan charts
      for( variableName in MDPVis.charts.temporalCharts ){
        var currentPercentiles = data.primaryStatistics.percentiles[variableName];
        MDPVis.charts.temporalCharts[variableName].updateData(currentPercentiles, false);
      }
      MDPVis.charts.updateAllBrushPositions();
    },

    /**
     * Update the position of all the brushes for their currently defined filter
     * positions. This does not change any data or filter values, it only changes
     * where brushes are rendered on the charts.
     */
    updateAllBrushPositions: function(){
      var extent, eventDepth;

      for( var variableName in MDPVis.charts.sliceCharts ){
        if( data.filters.activeFilters[variableName] !== undefined ) {
          extent = data.filters.activeFilters[variableName];
          MDPVis.charts.sliceCharts[variableName].updateBrush(extent);
        } else {
          // Reset the brush
          MDPVis.charts.sliceCharts[variableName].updateBrush([0,0]);
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
   * Request functions for objects from the server.
   */
  server: {

    /**
     * The domain that answers to the initialize, trajectories, optimize, and state requests.
     */
    dataEndpoint: "",

    /**
     * Ask the server for the starting parameters, put them onto the page,
     * then request the trajectories associated with the starting parameters.
     */
    getInitialize: function() {
      $.ajax({
        url: MDPVis.server.dataEndpoint + "/initialize",
        data: "",
        method: "GET"
      }).done(function(data) {
        MDPVis.server._createButtons(data);
        MDPVis.server.getTrajectories();
        $(".policy-is-optimized-button").hide();
        $(".optimize-policy-button")
          .prop("disabled", false)
          .show();
      }).fail(function(data) {
        alert("Failed to fetch initialization. Try reloading.");
        console.error("Failed to fetch initialization object.");
        console.error(data.responseText);
      });
    },

    /**
     * Gets the trajectories defined for the current set of parameters from the MDP server.
     */
    getTrajectories: function() {

      $("input").prop('disabled', true);

      // Construct the query object
      var q = {};

      // collect all the button values and make a query string from them.
      $(".button_value").each(function(idx, v){
        q[v.getAttribute("name")] = v.value;
      });

      // Fetch the initialization object from the server
      $.ajax({
        url: MDPVis.server.dataEndpoint + "/trajectories",
        data: q
      })
      .done(function(response){
        $(".post-gettrajectories-show").show();
        $(".generate-trajectories-button").hide();
        $(".optimize-policy-button").prop("disabled", false);
        $(".trajectories-are-current-button").hide();
        $(".policy-is-optimizing-button").hide();
        $(".trajectories-are-generating-button").hide();

        data.eligiblePrimaryTrajectories = response.trajectories;
        data.filters.updateActiveAndStats();
        MDPVis.render.renderTrajectories();
        MDPVis.server._addToHistory(data.eligiblePrimaryTrajectories, data.primaryStatistics, $.param(q));
        $("input").prop('disabled', false);

        MDPVis.updateHash();

        // Affix the trajectory count when scrolling down
        var countElement = $(".affix-panel");
        countElement
          .css({width: countElement.width()})
          .affix({
            offset: {
              top: countElement.offset().top
            }
        });

      })
      .fail(function(response) {
        alert("Failed to fetch trajectories. Try reloading.");
        console.error("Failed to fetch trajectories.");
        console.error(response.responseText);
      });
    },

    /**
     * Ask the server to optimize a policy for the current parameter set.
     */
    getOptimizePolicy: function() {

      // Construct the query object
      var q = {};

      // collect all the button values and make a query string from them.
      $(".button_value").each(function(idx, v){
        q[v.getAttribute("name")] = v.value;
      });

      $(".generate-trajectories-button").hide();
      $(".optimize-policy-button").hide();
      $(".trajectories-are-current-button").hide();
      $(".policy-is-optimizing-button").show();
      $(".trajectories-are-generating-button").show();

      // Fetch the initialization object from the server
      $.ajax({
        url: MDPVis.server.dataEndpoint + "/optimize",
        data: q
      })
      .done(function(data){
        for( policyVariable in data ) {
          $("input[name='" + policyVariable + "']")
            .val(data[policyVariable])
            .trigger( "input" ); // Forces resize
        }
        MDPVis.server.getTrajectories();
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
     * Get the state details from the server for the given trajectory.
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
      var panelPrototype = $("#parameter-panel-prototype");
      var parameterPanelRow = $("#parameter-panel-row");
      var createButtonSection = function(paramSet) {
        var newPanel = panelPrototype.clone().prependTo(parameterPanelRow);
        paramSet["quantitative"].forEach(function(vals){
          var units = vals["units"] + "\u00A0";
          if ( units === "\u00A0" ) { units = "\u00A0"; } // Non breaking space
          var newElement = $('<p/>')
          .append($('<input/>', {
            name: vals["name"],
            "class": "button_value",
            type: "number",
            "data-autosize-input": '{ "space": 15 }',
            "data-min": vals["min"],
            min: vals["min"],
            "data-max": vals["max"],
            max: vals["max"],
            step: vals["step"],
            value: vals["current_value"],
            "data-param-set": paramSet,
            "data-initialization-value": JSON.stringify(vals)
          }))
          .append(document.createTextNode( " " ))
          .append($('<strong>' + vals["name"] + '</strong>'))
          .append(document.createTextNode(" (" + units + ") "))
          .append(
            $("<span/>", {
              "class": "glyphicon glyphicon-info-sign lighten",
              "data-tooltip-hover-message": vals["description"]
          }));
          newPanel.append(newElement);
        });
        // todo: add categorical variables as well
        newPanel.find(".panel-icon").addClass(paramSet["panel_icon"]);
        newPanel.find(".panel-name").text(paramSet["panel_title"]);
        newPanel.find(".help-message").text(paramSet["description"]);
        newPanel.show();

        $("input").autosizeInput(); // Grow/shrink the input for the contents
        learningTooltip.addHoverListeners();
      }

      $(".parameter-panel:visible").remove()
      for( var paramSetIndex in init["parameter_collections"] ) {
        createButtonSection(init["parameter_collections"][paramSetIndex]);
      }

      function showServerRequestButtons() {
        MDPVis.updateHash();
        $(".generate-trajectories-button").show();
        $(".optimize-policy-button").show();
        $(".policy-is-optimized-button").hide();
        $(".trajectories-are-current-button").hide();
        $(".policy-is-optimizing-button").hide();
        $(".trajectories-are-generating-button").hide();
      }
      $( ".button_value" )
        .change(showServerRequestButtons)
        .on('keyup', showServerRequestButtons);
    },

    /**
     * Store the trajectory object and create the buttons necessary to re-load it later.
     */
    _addToHistory: function(trajectories, statistics, query) {

      // Highlight the proper buttons
      $(".primary-trajectories")
        .removeClass("btn-primary")
        .addClass("btn-default");
      $(".comparator-trajectories")
        .removeClass("btn-error")
        .addClass("btn-default");

      // Save the trajectory set and the statistics
      data.trajectorySets.push({trajectories: trajectories, statistics: statistics});
      var newElement = $('<p/>')
        .append(document.createTextNode(" Expected Value $ " + d3.round(statistics.expectedValue, 2)))
        .append($('<br/>'))
        .append($('<button/>', {
          "class": "btn btn-sm btn-primary load-button primary-trajectories",
          "data-trajectory-number": data.trajectorySets.length - 1,
          "data-query-string": query
          }).text('View Trajectory Set ' + data.trajectorySets.length)
        )
        .append('&nbsp;')
        .append($('<button/>', {
          "class": "btn btn-sm btn-default compare-to-button comparator-trajectories",
          "data-trajectory-number": data.trajectorySets.length - 1,
          "data-query-string": query,
          "data-tooltip-hover-message":
            "This will clear the current brushes and show the " +
            "comparison view for each visualization on the unfiltered " +
            "trajectories."
          }).text('Compare To')
        );
      $("#history-buttons").prepend(newElement);

      learningTooltip.addHoverListeners();

      $(".load-button").click(MDPVis.server._viewStoredTrajectories);
      $(".compare-to-button").click(MDPVis.server._compareTrajectories);
    },

    /**
     * Render a trajectory set that was returned previously.
     * @param {event} ev The event that the button triggered.
     */
    _viewStoredTrajectories: function(ev) {
      var trajectoriesID = ev.currentTarget.getAttribute("data-trajectory-number");
      var queryString = ev.currentTarget.getAttribute("data-query-string");
      var queryObject = $.deparam(queryString);

      // Enable changing the input buttons
      $("input")
        .prop('disabled', false)
        .css({color:""});

      // Hide comparison warning
      $(".comparison-warning").hide();

      // Highlight the proper buttons
      $(".primary-trajectories")
        .removeClass("btn-primary")
        .addClass("btn-default");
      $(".comparator-trajectories")
        .removeClass("btn-primary")
        .addClass("btn-default");
      $(ev.currentTarget)
        .removeClass("btn-default")
        .addClass("btn-primary");

      // Assign Buttons
      for ( var button in queryObject ) {
        var selector = "input[name='" + button + "'].button_value";
        var input = $(selector);
        input
          .attr("max", input.attr("data-max"))
          .attr("min", input.attr("data-min"))
          .val(queryObject[button])
          .trigger( "input" );
      }
      var trajectories = data.trajectorySets[trajectoriesID].trajectories;
      var statistics = data.trajectorySets[trajectoriesID].statistics;
      $(".generate-trajectories-button").hide();
      data.eligiblePrimaryTrajectories = trajectories;
      data.filters.updateActiveAndStats();
      MDPVis.render.renderTrajectories();
      MDPVis.charts.updateAllBrushPositions();
      $(".trajectories-are-current-button").show();
      $(".policy-is-optimized-button").hide();
      $(".optimize-policy-button").show();
      MDPVis.updateHash();

      // Update the affix distance since its position shifted
      var countElement = $(".affix-panel");
      countElement.data('bs.affix').options.offset.top = countElement.offset().top;
    },

    /**
     * Compare two sets of trajectories.
     * @param {event} ev The event that the button triggered.
     */
    _compareTrajectories: function(ev) {
      var trajectoriesID = ev.currentTarget.getAttribute("data-trajectory-number");

      // Highlight the proper buttons
      $(".comparator-trajectories")
        .removeClass("btn-primary")
        .addClass("btn-default");
      $(ev.currentTarget)
        .removeClass("btn-default")
        .addClass("btn-primary");

      $(".generate-trajectories-button").hide();
      $(".policy-is-optimized-button").hide();
      $(".optimize-policy-button").hide();
      $(".trajectories-are-current-button").show();
      $(".policy-is-optimizing-button").hide();
      $(".trajectories-are-generating-button").hide();

      // Show comparison warning
      $(".comparison-warning").show();

      // Dissable the input buttons
      $("input").prop('disabled', true);

      // Assign the buttons to the difference of their values
      var primaryElement = $(".primary-trajectories:visible").siblings("[data-query-string]")[0];
      var primaryQueryString = primaryElement.getAttribute("data-query-string");
      var primaryQueryObject = $.deparam(primaryQueryString);
      var comparatorQueryString = ev.currentTarget.getAttribute("data-query-string");
      var comparatorQueryObject = $.deparam(comparatorQueryString);
      for ( section in comparatorQueryObject ) {
        for ( button in comparatorQueryObject[section] ) {
          var difference = primaryQueryObject[section][button]
            - comparatorQueryObject[section][button];
          var selector = "#"+section+"-buttons input[name='" + button + "']";
          var input = $(selector);
          input
            .removeAttr("max")
            .removeAttr("min")
            .val(difference)
            .trigger( "input" ); // Forces resize
          if( difference > 0 ) {
            input.css({color: "#5cb85c"});
          } else if( difference < 0 ) {
            input.css({color: "#a63603"});
          } else {
            input.css({color: ""});
          }
        }
      }

      var trajectories = data.trajectorySets[trajectoriesID].trajectories;
      var statistics = data.computeStatistics(trajectories);
      MDPVis.render.compare(trajectories, statistics);
      MDPVis.charts.updateAllBrushPositions();

      // Update the affix distance since its position shifted
      var countElement = $(".affix-panel");
      countElement.data('bs.affix').options.offset.top = countElement.offset().top;
    }
  },

  /**
   * Functions associated with plotting data
   */
  render: {

    /**
     * Render the newly returned trajectories to the visualization.
     * @param {boolean} rescale optional parameter indicating whether temporal charts should be rescaled.
     */
    renderTrajectories: function(rescale) {

      // Default to rescaling axes
      if( typeof rescale !== "boolean" ) {
        rescale = true;
      }

      $(".brush").show();

      // If we have charts to update, else create all the things
      if ( Object.keys(MDPVis.charts.sliceCharts).length > 0 ) {
        for( var variableName in MDPVis.charts.sliceCharts ) {
          var accessor = MDPVis.render._createInitialStateAccessor(variableName, data.filters.filteredTimePeriod);
          MDPVis.charts.sliceCharts[variableName].updateData(data.eligiblePrimaryTrajectories, accessor);
          MDPVis.charts.sliceCharts[variableName].brushCounts();
        }
        MDPVis.render.renderTemporalCharts(
          data.filteredPrimaryTrajectories,
          data.primaryStatistics,
          rescale);
      } else {
        for( var variableName in data.eligiblePrimaryTrajectories[0][0] ){
          var barChart = new BarChart(
            variableName,
            "units",
            data.filteredPrimaryTrajectories,
            MDPVis.render._createInitialStateAccessor(variableName, 0));
          MDPVis.charts.sliceCharts[variableName] = barChart;
          $(".initial-states").append(barChart.getDOMNode());

          var fanChart = new FanChart(
            data.primaryStatistics.percentiles[variableName],
            variableName,
            data.filteredPrimaryTrajectories);
          MDPVis.charts.temporalCharts[variableName] = fanChart;
          $(".line-charts").append(fanChart.getDOMNode());
        };
      }

      MDPVis.charts.updateAllBrushPositions();
      $(".trajectories-are-current-button").show();
    },

    /**
     * Update the fan charts with new data.
     * @param {object} trajectories The trajectories object.
     * @param {object} statistics The statistics computed for the selected trajectories.
     * @param {boolean} rescale Rescale the axis on update.
     */
    renderTemporalCharts: function(trajectories, statistics, rescale) {
      for( var variableName in MDPVis.charts.temporalCharts ) {
        MDPVis.charts.temporalCharts[variableName].updateData(statistics.percentiles[variableName], rescale);
      }
    },

    /**
     * Put all the plots into comparison mode with the currently displayed trajectories and the
     * trajectories given as an argument.
     * @param {object} trajectories the trajectories we are wanting to compare the current set to.
     * @param {object} statistics the stats for the set of trajectories we are comparing to.
     */
    compare: function(trajectories, statistics) {
      $(".brush").hide();
      data.filters.clearFilters();
      MDPVis.charts.updateAll();
      for( var variableName in MDPVis.charts.sliceCharts ) {
        MDPVis.charts.sliceCharts[variableName].intersectWithSecondTrajectorySet(trajectories);
      }
      var baseStatistics = data.computeStatistics(data.filteredPrimaryTrajectories);
      for( var variableName in MDPVis.charts.temporalCharts ) {
        MDPVis.charts.temporalCharts[variableName].intersectWithSecondTrajectorySet(baseStatistics.percentiles[variableName], statistics.percentiles[variableName]);
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
    var data = [];

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
      data.push(current);
    });

    params.initialization = data;
    params.dataSource = MDPVis.server.dataEndpoint;
    var newHash = encodeURIComponent(JSON.stringify(params));
    window.location.hash = "#" + newHash;
  },

  /**
   * Initialize the visualization.
   * Checks the hash text for pre-initialization and other options.
   */
  initialize: function() {

    // Create the tooltip element
    learningTooltip.startTooltip();

    $( ".generate-trajectories-button" ).click(function() {
      $(".generate-trajectories-button").hide();
      $(".optimize-policy-button").prop("disabled", true);
      $(".policy-is-optimized-button").hide();
      $(".trajectories-are-current-button").hide();
      $(".policy-is-optimizing-button").hide();
      $(".trajectories-are-generating-button").show();
      MDPVis.server.getTrajectories();
    });

    $( ".optimize-policy-button" ).click(function() {
      $(".generate-trajectories-button").hide();
      $(".optimize-policy-button")
        .prop("disabled", false)
        .hide();
      $(".trajectories-are-current-button").hide();
      $(".policy-is-optimizing-button").show();
      $(".trajectories-are-generating-button").show();
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
    if( params.initialization ) {
      MDPVis.server._createButtons(params.initialization);
      MDPVis.server.getTrajectories();
      $(".policy-is-optimized-button").hide();
      $(".optimize-policy-button")
        .prop("disabled", true)
        .show();
    } else {
      MDPVis.server.getInitialize();
    }
  },

  /**
   * Select a simulator from a list of CORS supporting simulators
   * in a modal window.
   */
  selectSimulator: function() {
    var hash = window.location.hash.substring(1);
    if( hash.length > 0 ) {
      var params = JSON.parse(decodeURIComponent(hash));
      if( params.dataSource ) {
        MDPVis.server.dataEndpoint = params.dataSource;
        $(".post-modal-show").show();
        MDPVis.initialize();
        return;
      }
    }
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
    $("#customServerSubmit").click(function(elem){
      $(".post-modal-show").show();
      MDPVis.server.dataEndpoint = $("#customServer").val();
      MDPVis.initialize();
    });
    $('#serverSelectionModal').modal();
  }

}

document.addEventListener('DOMContentLoaded', MDPVis.selectSimulator);
