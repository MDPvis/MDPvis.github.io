/**
 * Plot the starting charts.
 * @param {object} stats is the percentile statistics.
 * @param {string} name is the name of the variable.
 * @param {object} rollouts The rollouts whose percentiles will be plotted.
 */
function FanChart(stats, name, rollouts) {

  this.name = name;
  TemporalChart.call(this);

  // Which Percentiles should be plotted.
  var percentilesToPlot = [100, 90, 80, 70, 60];

  // Reference for closures
  var that = this;

  // Indicates whether the vis is currently displaying two
  // datasets in the comparison mode.
  this.intersected = false;

  // Set the height and width from the style of the div element
  var divWidth = 10/12 * $(window).width();
  var divHeight = 250;

  var margin = {top: 30, right: 90, bottom: 30, left: 10},
      width = divWidth - margin.left - margin.right,
      height = divHeight - margin.top - margin.bottom;

  var x = d3.scale.linear()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("right");

  // Create all the areas
  var areas = [];
  percentilesToPlot.forEach(function(percentile) {
    var accessorStringTop = "percentile" + percentile;
    var accessorStringBottom = "percentile" + (100 - percentile);
    var currentArea = d3.svg.area()
        .x(function(d) {return x(d.eventNumber); })
        .y0(function(d) {
          if(d[accessorStringTop] === d[accessorStringBottom]) {
            return y(d[accessorStringTop]) + 2;
          }
          return y(d[accessorStringTop]); })
        .y1(function(d) {return y(d[accessorStringBottom]); });
    areas.push(currentArea);
  });

  // Create the Bootstrap columns
  var DOMDiv = this.getDOMNode();
  var DOMRow = document.createElement("div");
  DOMRow.setAttribute("class", "row center-vertically");
  var DOMCol = document.createElement("div");
  DOMCol.setAttribute("class", "col-xs-10");
  DOMRow.appendChild(DOMCol);

  // Append the title
  var DOMCol2 = document.createElement("div");
  DOMCol2.setAttribute("class", "col-xs-2");
  DOMCol2.style["font-size"] = "x-large";
  DOMCol2.textContent = name;
  DOMRow.appendChild(DOMCol2);

  DOMDiv.appendChild(DOMRow);

  var svg = d3.select(DOMCol).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "fan-chart")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  x.domain([0, stats.length]);
  var domainMax = d3.max(stats, function(d){return d["percentile100"]});
  var domainMin = d3.min(stats, function(d){return d["percentile0"]});
  domainMax = Math.ceil(domainMax);
  domainMin = Math.floor(domainMin);
  y.domain([domainMin, domainMax]);

  var paths = [];
  percentilesToPlot.forEach(function(percentile, idx){
    var currentPath = svg.append("path")
        .datum(stats)
        .attr("class", "area fan_percentile" + percentile)
        .attr("d", areas[idx])
        .style("display", "none");
    paths.push(currentPath);
  });

  var xAxisG = svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  var yAxisG = svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (divWidth - margin.right - margin.left) + "," + 0 + ")")
      .call(yAxis);

  var lineColor = d3.scale.category20();

  // Centerline for when in comparison mode
  var centerLine = svg.append("line")
    .attr("x1", 0)
    .attr("y1", y(0))
    .attr("x2", width)
    .attr("y2", y(0))
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5, 20")
    .attr("stroke", "black")
    .style("display", "none");

  /**
   * Set the scale of the y axis to the proper extent.
   * @param {int} scaleMin The minimum of the y axis scale.
   * @param {int} scaleMax The maximum of the y axis scale.
   */
  function rescaleYAxis(scaleMin, scaleMax) {
    y.domain([scaleMin, scaleMax]);
    yAxis.scale(y);
    yAxisG.transition().duration(1000).call(yAxis);
  }

  /**
   * Update the path when the statistics change.
   * @param {object} percentiles The stats object containing the
   * percentiles.
   * @param {array} rollouts The rollouts that will be rendered.
   * @param {boolean} isNewData indicates whether the data is new
   * or it was just filtered.
   */
  this.updateData = function(percentiles, rollouts, isNewData) {

    // Hide the centerline from comparison mode
    centerLine.style("display", "none");

    var newDomainMax = d3.max(percentiles, function(d){return d["percentile100"]});
    var newDomainMin = d3.min(percentiles, function(d){return d["percentile0"]});
    var rescale = x.domain()[1] !== percentiles.length;

    if ( rescale || that.intersected || isNewData ) {
      that.intersected = false;
      domainMax = newDomainMax;
      domainMin = newDomainMin;
      rescaleYAxis(newDomainMin, newDomainMax);
      x.domain([0, percentiles.length]);
      xAxis.scale(x);

      xAxisG.transition().duration(1000).call(xAxis);

      // Update the brushes for the new scale
      if( data.filters.activeFilters[name] === undefined ) {
        defaultExtent[0][1] = domainMax;
        defaultExtent[1][1] = domainMin;
      }
    }

    // Show lines instead of percentiles if there are not many lines
    if( rollouts.length < 20 ) {
      this.renderLines(rollouts);
      return;
    }
    $("[data-line-name='" + name + "']").remove();
    $(".area").show();

    paths.forEach(function(path, idx){
      path.datum(percentiles)
          .transition().duration(1000)
          .attr("d", areas[idx]);
    });
  }

  /**
   * Intersects data with a second dataset.
   * @param {object} cRollouts The rollouts we are intersecting with.
   */
  this.intersectWithSecondRolloutSet = function(basePercentiles, comparatorPercentiles) {

    that.intersected = true;

    $("[data-line-name='" + name + "']").remove();
    $(".area").show();

    var newDomainMax = d3.max(basePercentiles, function(d){return d["percentile100"]});
    newDomainMax = Math.max(newDomainMax, d3.max(comparatorPercentiles, function(d){return d["percentile100"]}));
    var newDomainMin = d3.min(basePercentiles, function(d){return d["percentile0"]});
    newDomainMin = Math.min(newDomainMin, d3.min(comparatorPercentiles, function(d){return d["percentile0"]}));
    var newScale = Math.max(basePercentiles.length, comparatorPercentiles.length);
    var rescale = x.domain()[1] !== newScale;

    if( rescale ) {
      x.domain([0, newScale]);
      xAxis.scale(x);
      xAxisG.transition().duration(1000).call(xAxis);
    }
    domainMax = newDomainMax;
    domainMin = newDomainMin;
    var spread = newDomainMax - newDomainMin;
    rescaleYAxis(-2*spread, 2*spread);

    var diffsInPercentiles = [];
    for( var i = 0; i < basePercentiles.length; i++ ) {
      var cur = {eventNumber: i};
      for ( var j = 0; j < percentilesToPlot.length ; j++ ) {
        var upper = "percentile" + percentilesToPlot[j];
        var lower = "percentile" + (100 - percentilesToPlot[j]);
        cur[upper] = basePercentiles[i][upper] - comparatorPercentiles[i][upper];
        cur[lower] = basePercentiles[i][lower] - comparatorPercentiles[i][lower];
      }
      diffsInPercentiles.push(cur);
    }

    paths.forEach(function(path, idx){
      path.datum(diffsInPercentiles)
          .transition().duration(1000)
          .attr("d", areas[idx]);
    });

    // Show the line
    centerLine.style("display", "")
      .transition().duration(1000)
      .attr("y1", y(0))
      .attr("y2", y(0));

  };

  //
  // Section for brushes
  //

  /**
   * Tell MDPVis that a brushing event has ended in the chart.
   * This will result in (1) the initial histogram's brush being updated,
   * (2) other fan chart brushes being update if the depth changed, (3) the
   * data being filtered and re-plotted across both chart types, and
   * (4) updating the scale and domain of the histograms if the depth changed.
   */
  var brushEnd = function() {
    if (d3.event && !d3.event.sourceEvent) return; // only transition after input
    if( that.brush.empty() ) {
      that.removeBrush();
      return;
    }
    var extent = that.brush.extent();
    var eventNumber = Math.floor(extent[0][0]);
    var eventNumberChange = data.filters.filteredTimePeriod !==  eventNumber &&
      extent[0][0] !== extent[1][0];
    if ( eventNumberChange ) {
      data.filters.changeFilteredTimePeriod(eventNumber);
      MDPVis.render.renderRollouts(data.filters.currentRollouts, data.filters.statistics, false);
    } else {
      var name = that.name;
      var newMax = extent[1][1];
      var newMin = extent[0][1];
      data.filters.addFilter(name, [newMin, newMax]);
      MDPVis.charts.updateAll();
    }
    that.updateContextPanel();
  }
  this.removeBrush = function() {
    that.brush.clear();
    data.filters.removeFilter(that.name);
    MDPVis.charts.updateAll();
    that.updateContextPanel();
  }

  var defaultExtent = [[0, domainMin], [.5, domainMax]];//[[x0,y0],[x1,y1]]
  that.brush = d3.svg.brush()
      .x(x)
      .y(y)
      .extent(defaultExtent)
      .on("brushend", brushEnd)
      .on("brush", this.updateContextPanel);

  // Overload the "empty" function since we display a full
  // brush even when it isn't filtering.
  var nativeEmpty = that.brush.empty;
  that.brush.empty = function() {
    var extent = that.brush.extent();
    return nativeEmpty() || (
      extent[0][0] === defaultExtent[0][0] &&
      extent[0][1] === defaultExtent[0][1] &&
      extent[1][0] === defaultExtent[1][0] &&
      extent[1][1] === defaultExtent[1][1]
      );
  }

  var brushG = svg.append("g")
      .attr("class", "brush")
      .call(that.brush)
      .call(that.brush.event);

  /**
   * Update the initial state brush as it is rendered on the fan chart.
   * @param {array} extent A pair of the [low, high] values for the brush.
   */
  this.updateBrush = function(extent) {

    // Don't overshoot the top or bottom
    var top = Math.min(extent[1][1], domainMax);
    var bottom = Math.max(extent[0][1], domainMin);

    // If the brush was not deselected the y values will be different
    if ( extent[0][1] === extent[1][1] ) {
      top = domainMax;
      bottom = domainMin;
    }

    var left, right;
    if(extent[0][0] !== extent[1][0] ) {
      left = Math.floor(extent[0][0]);
      right = left + 0.5;
      defaultExtent[0][0] = left;
      defaultExtent[1][0] = right;
    } else {
      left = defaultExtent[0][0];
      right = defaultExtent[1][0];
    }

    var newExtent = [[left, bottom], [right, top]];
    that.brush.extent(newExtent);

    that.brush(brushG.transition().duration(1000));
    //brushG.call(brush.event);
  }

  // Hover behaviors for time series lines
  var lineMouseOver = function() {
    d3.select(this)
        .style("stroke-width", "15px");
  }
  var lineMouseOut = function() {
    d3.select(this)
        .style("stroke-width", "2px");
  }

  // Event handler for making requests for the state detail on clicking a line
  var lineClick = function(d, index) {
    if (d3.event.defaultPrevented) return;
    MDPVis.server.getState(
      d[0]["Pathway Number"],
      Math.floor(x.invert(d3.mouse(this)[0])));
  }


  /**
   * Render lines for the active rollouts instead of the percentiles.
   *
   * When the number of active rollouts is small enough we can render the rollouts
   * instead of the percentiles.
   * @param {object} activeRollouts The rollouts we want to render as lines.
   */
  this.renderLines = function(activeRollouts) {
    $("[data-line-name='" + name + "']").remove();
    $(".area").hide();
    var line = d3.svg.line()
        .x(function(d, idx) { return x(idx); })
        .y(function(d) { return y(d[name]); });

    for(var i = 0; i < activeRollouts.length; i++) {
      svg.append("path")
            .datum(activeRollouts[i])
            .attr("class", "line state-detail")
            .attr("data-line-name", name)
            .attr("d", line)
            .on("mouseover", lineMouseOver)
            .on("mouseout", lineMouseOut)
            .style("stroke", function(d) {
              return lineColor(d[0]["Pathway Number"]); })
            .on("click", lineClick);
    }
  }

  // Show lines if there are few enough, else unhide the fans
  if( rollouts.length < 20 ) {
    this.renderLines(rollouts);
  } else {
    for( var i = 0; i < paths.length; i++ ) {
      paths[i].style("display","");
    }
  }

  return this;

}
