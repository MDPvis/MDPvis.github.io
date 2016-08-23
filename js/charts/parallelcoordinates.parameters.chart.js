/**
 * Plot the parameters that have been sampled and allow for selecting previously sampled parameters.
 *
 * The currently viewed line in the visualization area has the class "viewed-parameter-line".
 * The currently selected line has the class "selected-parameter-line"
 * The currently compared line in the visualization area has the class "compared-parameter-line"
 * All lines also have the class "parameter-line"
 *
 * @param {object} initializationObject The initialization object returned by the server.
 */
function ParallelCoordinatesChart(initializationObject) {

  // Reference for closures
  var that = this;

  this.name = name;
  ParametersChart.call(this);

  // Set the height and width from the style of the div element
  var divWidth = $(window).width();
  var divHeight = 250;

  var margin = {top: 30, right: 10, bottom: 10, left: 10};
  var width = divWidth - margin.left - margin.right;
  var height = divHeight - margin.top - margin.bottom;

  // The request number identifier
  var setNumber = 0;

  // Make the line green to indicate it is currently the primary dataset
  this.viewSelectedLine = function(trajectoryID) {
    svg.selectAll(".viewed-parameter-line,.compared-parameter-line")
      .attr("class", "parameter-line hover_line");
    $("[data-parameters-trajectories-ID=" + trajectoryID + "]")
      .attr("class", "viewed-parameter-line parameter-line hover_line");
  };

  // Make the line red to indicate it is being compared against
  this.compareSelectedLine = function(trajectoryID) {
    svg.selectAll(".compared-parameter-line")
      .attr("class", "parameter-line hover_line");
    $("[data-parameters-trajectories-ID=" + trajectoryID + "]")
      .attr("class", "compared-parameter-line parameter-line");
  };

  /**
   * Get a function for clicking a newly added line.
   * @param query The address of the query.
   * @param trajectoryID The integer identifier of the trajectory set to return from storage.
   * @returns {Function} The function that will be called onClick.
   */
  function selectLineFunction(query, trajectoryID){
    return function(d) {
      MDPVis.server.updateInputs(query);
      $("#view-parameters-button, #compare-parameters-button")
        .attr("data-trajectory-number", trajectoryID)
        .attr("data-query-string", query)
        .prop("disabled", false)
        .show();
      $(".selected_line")
        .removeClass("selected_line")
        .removeClass("color-cycle");
      var currentTarget = $(d3.event.currentTarget);
      if( ! currentTarget.hasClass("viewed-parameter-line") ) {
        currentTarget
          .addClass("selected_line")
          .addClass("color-cycle");
      }
    }
  }

  /**
   * Add a line to the parallel coordinates plot.
   */
  this.newSample = function(query) {
    var trajectoriesID = data.trajectorySets.length;
    var newData = {};
    $(".button_value").each(function(idx, v){
      newData[v.getAttribute("name")] = Number(v.value);
    });
    newData["set number"] = setNumber;
    newData["varied dimensions will be added here"] = setNumber;
    setNumber += 1;
    storedParameters.push(newData);

    // Find which dimensions vary
    var current = {};
    for( var k in storedParameters[0] ) {
      current[k] = [storedParameters[0][k], storedParameters[0][k]]
    }
    for( k in storedParameters[0] ) {
      for( var i = 1; i < storedParameters.length; i++ ) {
        current[k][0] = Math.min(storedParameters[i][k], current[k][0]);
        current[k][1] = Math.max(storedParameters[i][k], current[k][1]);
      }
    }
    dimensions = [];
    hiddenDimensions = [];
    for( k in current ) {
      if( current[k][0] !== current[k][1] && k !== "varied dimensions will be added here") {
        y[k] = d3.scale.linear()
          .domain([current[k][0], current[k][1]])
          .range([height, 0]);
        dimensions.push(k);
      } else {
        hiddenDimensions.push(k);
      }
    }
    if( dimensions.length === 0 ) {
      dimensions.push("set number");
    }
    if( dimensions.length === 1 ) {
      dimensions.push("varied dimensions will be added here");
    }
    x.domain(dimensions);

    function dragstartFunction(d) {
      dragging[d] = x(d);
    }
    function dragFunction(d) {
      dragging[d] = Math.min(width, Math.max(0, d3.event.x));
      that.foreground.attr("d", path);
      dimensions.sort(function(a, b) { return position(a) - position(b); });
      x.domain(dimensions);
      g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
    }
    function dragendFunction(d) {
      delete dragging[d];
      transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
      transition(that.foreground).attr("d", path);
    }

    // Create the axes
    var g = svg.selectAll(".dimension")
      .data(dimensions);
      g.attr("transform", function(d) { return "translate(" + x(d) + ")"; })
      .call(d3.behavior.drag()
        .origin(function(d) { return {x: x(d)}; })
        .on("dragstart", dragstartFunction)
        .on("drag", dragFunction)
        .on("dragend", dragendFunction))
      .enter()
      .append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
      .call(d3.behavior.drag()
        .origin(function(d) { return {x: x(d)}; })
        .on("dragstart", dragstartFunction)
        .on("drag", dragFunction)
        .on("dragend", dragendFunction));

    svg.selectAll(".parallel-coordinates-parameter-axis")
      .remove();

    // Add the axes text
    g.append("g")
      .attr("class", "axis parallel-coordinates-parameter-axis")
      .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
      .append("text")
      .attr("class", "parallel-coordinates-parameter-text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(function(d) { return d; });

    // Add the sample lines
    svg.selectAll(".parameter-line")
      .data(storedParameters)
      .attr("d", path)
      .enter().append("path")
      .attr("class", "all-samples-line parameter-line hover_line")
      .attr("data-parameters-trajectories-ID", trajectoriesID)
      .attr("d", path)
      .on("click", selectLineFunction(query, trajectoriesID));
    that.foreground = svg.selectAll(".parameter-line");

    that.viewSelectedLine(trajectoriesID);
  };

  var x = d3.scale.ordinal().rangePoints([0, width], 1),
    y = {},
    dragging = {};

  var line = d3.svg.line(),
    axis = d3.svg.axis().orient("left");

  var svg = d3.select(that.getDOMNode()).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  // note: when there is one data point on an axis, the whole range will be used from the initialization object.
  // When a second parameter value is introduced, the range of the parameters will be used
  var dimensions = [];
  var hiddenDimensions = [];

  for( var i = 0; i < initializationObject.parameter_collections.length; i++ ) {
    var parameterCollection = initializationObject.parameter_collections[i];
    for( var j = 0; j < parameterCollection.quantitative.length; j++ ) {
      var quantitativeParameter = parameterCollection.quantitative[j];
      var parameterName = quantitativeParameter.name;
      var units = quantitativeParameter.units;
      var parameterMax = quantitativeParameter.max;
      var parameterMin = quantitativeParameter.min;
      y[parameterName] = d3.scale.linear()
        .domain([parameterMin, parameterMax])
        .range([height, 0]);
      hiddenDimensions.push(parameterName);
    }
  }

  // Add the request counter
  y["varied dimensions will be added here"] = d3.scale.linear()
    .domain([0, 10])
    .range([height, 0]);
  dimensions.push("varied dimensions will be added here");
  y["set number"] = d3.scale.linear()
    .domain([0, 10])
    .range([height, 0]);
  dimensions.push("set number");

  var storedParameters = [];

  function position(d) {
    var v = dragging[d];
    return v == null ? x(d) : v;
  }

  function transition(g) {
    return g.transition().duration(500);
  }

  // Returns the path for a given data point.
  function path(d) {
    return line(dimensions.map(function(p) {
      return [position(p), y[p](d[p])]; }));
  }

  return that;

}
