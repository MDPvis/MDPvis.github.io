/**
 * Plot the parameters that have been sampled and allow for selecting previously sampled parameters.
 * @param {object} initializationObject The initialization object returned by the server.
 */
function ParallelCoordinatesChart(initializationObject) {

  this.name = name;
  ParametersChart.call(this);

  // Reference for closures
  var that = this;

  // Set the height and width from the style of the div element
  var divWidth = $(window).width();
  var divHeight = 250;

  var margin = {top: 30, right: 10, bottom: 10, left: 10};
  var width = divWidth - margin.left - margin.right;
  var height = divHeight - margin.top - margin.bottom;

  // Add a green line to indicate it is currently the primary dataset
  this.viewSelectedLine = function(trajectoryID) {
    $(".compared-line, .viewed-line").remove(); // todo: figure out why this was not working the normal way
    var viewedLine = svg.selectAll(".viewed-line")
      .data([storedParameters[trajectoryID]]);
    viewedLine
      .enter().append("path")
      .attr("class", "viewed-line parameter-line")
      .attr("d", path);
    that.foreground = svg
      .selectAll(".parameter-line");
  };

  // Add a red line to indicate it is being compared against
  this.compareSelectedLine = function(trajectoryID) {
    $(".compared-line").remove(); // todo: figure out why this was not working the normal way
    var comparedLine = svg
      .selectAll(".compared-line")
      .data([storedParameters[trajectoryID]]);
    comparedLine
      .enter().append("path")
      .attr("class", "compared-line parameter-line")
      .attr("d", path);
    that.foreground = svg
      .selectAll(".parameter-line");
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
      $("#compare-parameters-button, #view-parameters-button").prop("disabled", false);
      $(".selected_line")
        .removeClass("selected_line")
        .removeClass("color-cycle");
      $(d3.event.currentTarget)
        .addClass("selected_line")
        .addClass("color-cycle");
      $("#view-parameters-button, #compare-parameters-button")
        .show()
        .attr("data-trajectory-number", trajectoryID)
        .attr("data-query-string", query)
        .prop("disabled", false);
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
    storedParameters.push(newData);
    svg
      .attr("class", "foreground")
      .selectAll(".all-samples-line")
      .data(storedParameters)
      .enter().append("path")
      .attr("class", "all-samples-line parameter-line hover_line")
      .attr("d", path)
      .on("click", selectLineFunction(query, trajectoriesID));
    that.foreground = svg
      .selectAll(".parameter-line");
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
      dimensions.push(parameterName);
    }
  }
  var storedParameters = [];

  // Extract the list of dimensions and create a scale for each.
  x.domain(dimensions);

  // Add blue foreground lines for focus.
  that.foreground = svg.append("g")
    .attr("class", "foreground")
    .selectAll("path")
    .data(storedParameters)
    .enter().append("path")
    .attr("class", "parameter-line hover_line")
    .attr("d", path);

  // Add a group element for each dimension.
  var g = svg.selectAll(".dimension")
    .data(dimensions)
    .enter().append("g")
    .attr("class", "dimension")
    .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
    .call(d3.behavior.drag()
      .origin(function(d) { return {x: x(d)}; })
      .on("dragstart", function(d) {
        dragging[d] = x(d);
      })
      .on("drag", function(d) {
        dragging[d] = Math.min(width, Math.max(0, d3.event.x));
        that.foreground.attr("d", path);
        dimensions.sort(function(a, b) { return position(a) - position(b); });
        x.domain(dimensions);
        g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
      })
      .on("dragend", function(d) {
        delete dragging[d];
        transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
        transition(that.foreground).attr("d", path);
      }));

  // Add an axis and title.
  g.append("g")
    .attr("class", "axis")
    .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
    .append("text")
    .style("text-anchor", "middle")
    .attr("y", -9)
    .text(function(d) { return d; });


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



  return this;

}
