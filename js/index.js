/**
 * @namespace for coordinating the various visualization scripts into a
 * coherent web application.
 */
var MDPVis = {

  /**
   * Each of the chart objects. These are the callable objects when things need to update.
   */
  charts: {
    parametersCharts: {},
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
        MDPVis.charts.temporalCharts[variableName].updateData(data.primaryStatistics, false);
      }
      MDPVis.charts.updateAllBrushPositions();
    },

    /**
     * Update the position of all the brushes for their currently defined filter
     * positions. This does not change any data or filter values, it only changes
     * where brushes are rendered on the charts.
     */
    updateAllBrushPositions: function(){
      var keys = Object.keys(MDPVis.charts.sliceCharts);
      data.filters.activeFilters.forEach(function(elem){
        var variableName = elem.name;
        var extent = elem.extent;
        var timePeriod = elem.timePeriod;
        if( MDPVis.charts.sliceCharts[variableName].timePeriod === timePeriod ) {
          keys.splice(keys.indexOf(variableName), 1);
          MDPVis.charts.sliceCharts[variableName].updateBrush(extent);
        }
      });
      keys.forEach(function(elem){
        MDPVis.charts.sliceCharts[elem].updateBrush([0,0]);
      });
      for( var variableName in MDPVis.charts.temporalCharts ){
        MDPVis.charts.temporalCharts[variableName].updateBrushes();
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
        MDPVis.server._displayParameters(data);
        if( window.location.hash ) {
          /**
           * initialization:
           *   {
           *       [{name: NAME, current_value: 999}, ...]
           *   }
           * dataSource: "http://CORS_ENABLED_DOMAIN.com"
           * }
           */
          var hash = window.location.hash.substring(1);
          var params = JSON.parse(decodeURIComponent(hash));
          if( params.initialization ) {
            for( var i = 0; i < params.initialization.length; i++ ) {
              var currentName = params.initialization[i].name;
              $("input[name='" + currentName + "']").val(params.initialization[i].current_value);
            }
          }
        }
        $("input").keyup(); // Grow/shrink the input for the contents
        MDPVis.server.getTrajectories();
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
        for( var policyVariable in data ) {
          $("input[name='" + policyVariable + "']")
            .val(data[policyVariable])
            .trigger( "input" ); // Forces resize
        }
        MDPVis.server.getTrajectories();
        $(".policy-is-optimizing-button").hide();
      })
      .fail(function(data) {
        alert("Failed to fetch initialization. Try reloading.");
        console.error("Failed to fetch initialization object.");
        console.error(data.responseText);
      });
    },

    /**
     * Display the images associated with the trajectory.
     * @param {object} trajectory The trajectory object
     */
    getState: function(trajectory) {
      var imagesArea = $(".images-row");
      $(".image-column").remove();
      var columnSize = Math.max(Math.floor(12/trajectory[0]["image row"].length), 1);
      for( var timeStep = 0; timeStep <  trajectory.length ; timeStep++ ) {
        var imageRow = $("<div class='row'></div>");
        if( typeof(trajectory[timeStep]["image row"]) === "undefined" ) continue;
        for ( var i = 0; i < trajectory[timeStep]["image row"].length; i++ ) {
          var imageColumn = $("<div class='col-xs-" + columnSize + " image-column'></div>");
          var imageName = trajectory[timeStep]["image row"][i];
          if ( imageName.indexOf("mp4") > 0 ) {
            var imageTag = $('<video/>', {
              "controls":"controls"
            });
            imageTag.append($('<source/>', {
              src: MDPVis.server.dataEndpoint + "/state?image=" + imageName,
              "type": "video/mp4",
              "width": "1200px" // max width since it is responsive
            }));
          } else {
            imageTag = $('<img/>', {
              src: MDPVis.server.dataEndpoint + "/state?image=" + imageName,
              "class": "img-responsive",
              "width": "1200px" // max width since it is responsive
            });
          }
          imageColumn
            .append($('<p>' + imageName + '</p>'))
            .append(imageTag);
          imageRow.append(imageColumn);
        }
        imagesArea.append(imageRow);
      }
    },


    /**
     * Create the buttons with the current values as specified by the init object.
     * The current buttons will first be cleared.
     * @param {object} init the initialization object as returned by the server.
     * @private
     */
    _displayParameters: function(init) {

      MDPVis.charts.parametersCharts["parallelCoordinates"] = ParallelCoordinatesChart(init);
      $("#parameter-visualization-area").append(
        MDPVis.charts.parametersCharts["parallelCoordinates"].getDOMNode());

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
      };

      $(".parameter-panel:visible").remove();
      for( var paramSetIndex in init["parameter_collections"] ) {
        createButtonSection(init["parameter_collections"][paramSetIndex]);
      }

      function showServerRequestButtons() {
        MDPVis.updateHash();
        $(".generate-trajectories-button").show();
        $(".optimize-policy-button").show();
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

      MDPVis.charts.parametersCharts["parallelCoordinates"].newSample(query);

      // Save the trajectory set and the statistics
      data.trajectorySets.push({trajectories: trajectories, statistics: statistics});
      learningTooltip.addHoverListeners();
    },

    /**
     * The string query that will be used to populate the inputs at the top of the page.
     * @param queryString
     */
    updateInputs: function(queryString) {
      var queryObject = $.deparam(queryString);
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
    },

    /**
     * Render a trajectory set that was returned previously.
     * @param {event} ev The event that the button triggered.
     */
    _viewStoredTrajectories: function(ev) {
      var trajectoriesID = ev.currentTarget.getAttribute("data-trajectory-number");
      var queryString = ev.currentTarget.getAttribute("data-query-string");

      for( var chart in MDPVis.charts.parametersCharts) {
        MDPVis.charts.parametersCharts[chart].viewSelectedLine(trajectoriesID);
      }

      // Enable changing the input buttons
      $("input")
        .prop('disabled', false)
        .css({color:""});

      // Allow optimization from the stored trajectories' parameters
      $(".optimize-policy-button").prop("disabled", false);

      // Hide comparison warning
      $(".comparison-warning").hide();

      MDPVis.server.updateInputs(queryString);
      var trajectories = data.trajectorySets[trajectoriesID].trajectories;
      var statistics = data.trajectorySets[trajectoriesID].statistics;
      $(".generate-trajectories-button").hide();
      data.eligiblePrimaryTrajectories = trajectories;
      data.filters.updateActiveAndStats();
      MDPVis.render.renderTrajectories();
      MDPVis.charts.updateAllBrushPositions();
      $(".trajectories-are-current-button, .optimize-policy-button").show();
      $("#compare-parameters-button, #view-parameters-button").prop("disabled", true);
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
      for( var chart in MDPVis.charts.parametersCharts ) {
        MDPVis.charts.parametersCharts[chart].compareSelectedLine(trajectoriesID);
      }

      $("#compare-parameters-button").prop("disabled", true);
      learningTooltip.mouseLeave(); // Since the line above breaks the mouse enter/leave events

      $(".generate-trajectories-button").hide();
      $(".optimize-policy-button").prop("disabled", true);
      $(".trajectories-are-current-button").show();
      $(".policy-is-optimizing-button").hide();
      $(".trajectories-are-generating-button").hide();

      // Show comparison warning
      $(".comparison-warning").show();

      // Dissable the input buttons
      $("input").prop('disabled', true);

      // Assign the buttons to the difference of their values
      var primaryElement = $("#view-parameters-button");
      var primaryQueryString = primaryElement.attr("data-query-string");
      var primaryQueryObject = $.deparam(primaryQueryString);
      var comparatorQueryString = ev.currentTarget.getAttribute("data-query-string");
      var comparatorQueryObject = $.deparam(comparatorQueryString);
      for ( var section in comparatorQueryObject ) {
        for ( var button in comparatorQueryObject[section] ) {
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
      MDPVis.render.compare(trajectories);
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
      if ( Object.keys(MDPVis.charts.temporalCharts).length > 0 ) {
        for( var variableName in MDPVis.charts.sliceCharts ) {
          MDPVis.charts.sliceCharts[variableName].updateData(
              data.eligiblePrimaryTrajectories,
              0);
          MDPVis.charts.sliceCharts[variableName].brushCounts();
        }
        MDPVis.render.renderTemporalCharts(
          data.filteredPrimaryTrajectories,
          data.primaryStatistics,
          rescale);
      } else {
        for( var variableName in data.eligiblePrimaryTrajectories[0][0] ){
          if( variableName === "image row" || variableName === "additionalData") {
            continue;
          }
          var fanChart = new FanChart(
            data.primaryStatistics.percentiles[variableName],
            variableName,
            data.filteredPrimaryTrajectories);
          MDPVis.charts.temporalCharts[variableName] = fanChart;
          $(".line-charts").append(fanChart.getDOMNode());
        }
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
        MDPVis.charts.temporalCharts[variableName].updateData(statistics, rescale);
      }
    },

    /**
     * Put all the plots into comparison mode with the currently displayed trajectories and the
     * trajectories given as an argument.
     * @param {object} trajectories the trajectories we are wanting to compare the current set to.
     */
    compare: function(trajectories) {
      data.eligibleSecondaryTrajectories = trajectories;
      $(".brush").hide();
      data.filters.clearFilters();
      data.filters.updateActiveAndStats();
      MDPVis.charts.updateAll();
      for( var variableName in MDPVis.charts.sliceCharts ) {
        MDPVis.charts.sliceCharts[variableName].intersectWithSecondTrajectorySet(trajectories);
      }
      data.secondaryStatistics = data.computeStatistics(trajectories);
      for( var variableName in MDPVis.charts.temporalCharts ) {
        MDPVis.charts.temporalCharts[variableName].intersectWithSecondTrajectorySet(data.secondaryStatistics);
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
      var current = {
        name: v.name,
        current_value: v.value
      };
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

    $("#view-parameters-button").click(MDPVis.server._viewStoredTrajectories);
    $("#compare-parameters-button").click(MDPVis.server._compareTrajectories);

    $( ".generate-trajectories-button" ).click(function() {
      $(".generate-trajectories-button").hide();
      $(".optimize-policy-button").prop("disabled", true);
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
    MDPVis.server.getInitialize();
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
    $("button[data-local-domain-name]").click(function(elem){
      $(".post-modal-show").show();
      var simulatorName = elem.currentTarget.getAttribute("data-local-domain-name");
      var head = document.getElementsByTagName('head')[0];
      var js = document.createElement("script");
      js.type = "text/javascript";
      js.src = "js/domains/" + simulatorName + ".js";
      head.appendChild(js);
    });
    $("#customServerSubmit").click(function(elem){
      $(".post-modal-show").show();
      MDPVis.server.dataEndpoint = $("#customServer").val();
      MDPVis.initialize();
    });
    $('#serverSelectionModal').modal();
  }

};

document.addEventListener('DOMContentLoaded', MDPVis.selectSimulator);
