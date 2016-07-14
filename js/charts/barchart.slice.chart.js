/**
 * The chart is constructed but not placed into the dom since the caller has that responsibility
 */
function BarChart (name, trajectories, eventNumber) {

  // Reference for closures
  var that = this;
  that.name = name;
  that.timePeriod = eventNumber;

  SliceChart.call(this);

  // Function to grab the proper data
  var accessor = function(d) {
    return d[Math.min(eventNumber, d.length - 1)][that.name];
  };

  // The number of bins in the histogram
  var numBins = 15;

  // Set the margins if they have not been assigned
  var margin = {top: 10, right: 30, bottom: 50, left: 60};

  // Set the height and width from the style of the div element
  var divWidth = 700;
  var divHeight = 250;

  // A formatter for counts.
  var formatCount = d3.format(",.0f");

  var width = divWidth - margin.left - margin.right,
      height = divHeight - margin.top - margin.bottom;

  var domain = d3.extent(trajectories, accessor);

  // Render the zero
  if(domain[0] === domain[1]) {
    domain[1] = domain[1] + 1;
  }

  var binStep = (domain[1] - domain[0])/(numBins-1);

  var x = d3.scale.linear()
      .domain(domain)
      .nice()
      .range([0, width]);

  // Bin the data for the histogram
  function binData(accessor, domain, binStep, trajectories, skipFilter) {
    var bins = [];
    for( var i = 0 ; i < numBins ; i++ ) {
      bins.push(0);
    }
    var binIndex = function(d) {
      var bindex = Math.floor((accessor(d) - domain[0])/binStep);
      return bindex;
    };
    trajectories.forEach(function(trajectory) {
      if ( skipFilter || data.filters.isActiveTrajectory(trajectory) ) {
        bins[binIndex(trajectory)] += 1;
      }
    });
    return bins;
  }
  var bins = binData(accessor, domain, binStep, trajectories, true);

  // Create the axes
  var y = d3.scale.linear()
      .domain([0, trajectories.length])
      .range([height, 0]);

  var tickFormat = this.chartTickFormat(x.domain());
  var tickCount = this.chartTickCount(x.domain(), tickFormat);
  var xAxis = d3.svg.axis()
      .tickFormat(tickFormat)
      .ticks(tickCount)
      .scale(x)
      .orient("bottom");

  var DOMDiv = this.getDOMNode();

  // Create the svg element, this should not change in response to changing data.
  var svg = d3.select(DOMDiv).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Start, data entry section

  // Add the data
  var bar = svg.selectAll(".bar")
      .data(bins)
    .enter().append("g")
      .attr("class", "bar")
      .attr("transform", function(d, idx) { 
        return "translate(" + x(domain[0] + binStep*idx) + "," + y(d) + ")"; });

  // Plot the bar rectangles
  var rect = bar.append("rect")
      .attr("x", 1)
      .attr("width", width / numBins - 1)
      .attr("height", function(d) { return height - y(d); });

  var barExtent = svg.selectAll(".bar_extent")
      .data(bins)
    .enter().append("g")
      .attr("class", "bar-extent")
      .attr("transform", function(d, idx) { 
        return "translate(" + x(domain[0] + binStep*idx) + "," + y(d) + ")"; });
  var rectExtent = barExtent.append("rect")
      .attr("x", 1)
      .attr("width", width / numBins - 1)
      .attr("height", function(d) { return height - y(d); });
  // END, data entry section


  // Put the X-axis in place
  var xAxisG = svg.append("g")
      .attr("class", "x axis show")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
  xAxisG.append("text")
      .style("text-anchor", "middle")
      .style("font-weight","bold")
      .attr("transform", "translate(" + (divWidth/2 - margin.left) + "," + 35 + ")")
      .text(name + " at time step " + that.timePeriod);

  // Brush applied to top histograms
  var brushEnd = function() {
    if ( that.intersected ) {
      d3.selectAll(".brush").remove();
      return;
    }
    var extent = that.brush.extent();
    if( extent[0] === extent[1] ) {
      that.removeBrush();
    } else {
      data.filters.addFilter(that, extent);
      MDPVis.charts.updateAll();
    }
  };
  this.removeBrush = function() {
    that.brush.clear();
    data.filters.removeFilter(that.name, that.timePeriod);
    MDPVis.charts.updateAll();
  };

  // Brush controls
  that.brush = d3.svg.brush()
      .x(x)
      .on("brushend", brushEnd);
  var gBrush = svg.append("g")
      .attr("class", "brush")
      .call(that.brush);
  gBrush.selectAll("rect")
      .attr("height", height);

  // Centerline for when in comparison mode
  var centerLine = svg.append("line")
    .attr("x1", 0)
    .attr("y1", y(0))
    .attr("x2", width)
    .attr("y2", y(0))
    .attr("stroke-width", 1)
    .attr("stroke", "black")
    .style("display", "none");

  // a set of functions for supporting brushing
  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");
  that.intersected = false;
  var comparedBinStep, domainUnion, yAxisG;

  /**
   * Updates the displayed counts on the chart
   */
  this.brushCounts = function() {

    bins = binData(accessor, domain, binStep, data.filteredPrimaryTrajectories, false); // Update the counts

    // Move existing bars.
    bar.data(bins).transition().duration(1000).attr("transform", function(d, idx) {
        return "translate(" + x(domain[0] + binStep*idx) + "," + y(d) + ")";});

    // Plot the bar rectangles
    rect.data(bins).transition().duration(1000).attr("height", function(d,idx) { 
        return height - y(d); });
  };

  /**
   * Intersects data with a second dataset.
   * @param {object} cTrajectories The trajectories we are intersecting with.
   */
  this.intersectWithSecondTrajectorySet = function(cTrajectories) {
    that.intersected = true;
    var comparatorDomain = d3.extent(cTrajectories, accessor);
    domainUnion = [
      Math.min(comparatorDomain[0], domain[0]),
      Math.max(comparatorDomain[1], domain[1])
    ];

    // Render the zero
    if(domainUnion[0] === domainUnion[1]) {
      domainUnion[1] = domainUnion[1] + 1;
    }

    comparedBinStep = (domainUnion[1] - domainUnion[0])/(numBins-1);

    var tickFormat = this.chartTickFormat(domainUnion);
    var tickCount = this.chartTickCount(domainUnion, tickFormat);
    x.domain(domainUnion)
      .nice();
    xAxis
      .scale(x)
      .tickFormat(tickFormat)
      .ticks(tickCount);

    y.domain([-1 * trajectories.length, 1 * trajectories.length]).range([height, 0]);

    if( yAxisG ) {
      yAxisG.call(yAxis);
    } else {
      yAxisG = svg.append("g")
         .attr("class", "y axis")
         .call(yAxis);
    }

    var originalInNewBins = binData(accessor, domainUnion, comparedBinStep, trajectories, true);
    var comparatorBins = binData(accessor, domainUnion, comparedBinStep, cTrajectories, true);

    var binDifferences = [];
    for( var i = 0; i < originalInNewBins.length; i++ ) {
      binDifferences.push(originalInNewBins[i] - comparatorBins[i]);
    }

    barExtent.data(binDifferences)
      .transition().duration(1000).attr("transform", function(d, idx) {
        return "translate(" + x(domainUnion[0] + comparedBinStep*idx) + "," + Math.min(y(d), y(0)) + ")";});

    rectExtent.data(binDifferences).transition().duration(1000).attr("height", function(d,idx) {
            return Math.abs(y(d) - height/2); });

    // Move existing bars.
    bar.data(binDifferences).transition().duration(1000).attr("transform", function(d, idx) {
      return "translate(" + x(domainUnion[0] + comparedBinStep*idx) + "," + Math.min(y(d), y(0)) + ")";
    });

    // Plot the bar rectangles
    rect.data(binDifferences).transition().duration(1000).attr("height", function(d,idx) {
      return Math.abs(y(d) - height/2); });

    xAxisG.transition().duration(1000).call(xAxis);

    // Show the line
    centerLine.style("display", "")
      .transition().duration(1000)
      .attr("y1", y(0))
      .attr("y2", y(0));

    // todo: this will iterate over the data twice to get the bin count for the unfiltered
    // then for the filtered data. Both could be computed simultanously and returned as a
    // compound object.
    //this.brushCounts(trajectories);
  };

  /**
   * Drops current data and plots new data. This will update the domain and scale to
   * match the new data. It will render two versions of every bar. One version of the
   * bar will be static and is just an outline that is visible when the solid bar gets
   * filtered.
   */
  this.updateData = function(newTrajectories, eventNumber) {

    accessor = function(d) {
      return d[Math.min(eventNumber, d.length - 1)][that.name];
    };

    trajectories = newTrajectories;
    domain = d3.extent(trajectories, accessor);

    // Turn off comparisons (if it was on to begin with)
    that.intersected = false;
    if ( yAxisG ) {
      yAxisG.remove();
      yAxisG = false;
    }

    // Hide the centerline from comparison mode
    centerLine.style("display", "none");

    // Render the zero
    if(domain[0] === domain[1]) {
      domain[1] = domain[1] + 1;
    }

    binStep = (domain[1] - domain[0])/(numBins-1);

    x.domain(domain)
      .nice();
    tickFormat = this.chartTickFormat(x.domain());
    tickCount = this.chartTickCount(x.domain(), tickFormat);
    xAxis
      .scale(x)
      .tickFormat(tickFormat)
      .ticks(tickCount);

    y.domain([0, trajectories.length]);

    bins = binData(accessor, domain, binStep, trajectories, true); // Update the counts

    // Move existing bars.
    bar.data(bins).transition().duration(1000).attr("transform", function(d, idx) {
        return "translate(" + x(domain[0] + binStep*idx) + "," + y(d) + ")";});

    // Plot the bar rectangles
    rect.data(bins).transition().duration(1000).attr("height", function(d,idx) {
        return height - y(d); });

    barExtent.data(bins)
      .transition().duration(1000).attr("transform", function(d, idx) {
        return "translate(" + x(domain[0] + binStep*idx) + "," + y(d) + ")";});

    rectExtent.data(bins).transition().duration(1000).attr("height", function(d,idx) {
            return height - y(d); });

    xAxisG.transition().duration(1000).call(xAxis);

    // todo: this will iterate over the data twice to get the bin count for the unfiltered
    // then for the filtered data. Both could be computed simultanously and returned as a
    // compound object.
    this.brushCounts(trajectories);
  };

  /**
   * Update the displayed extent of a brush.
   * @param {array} newExtent The extent the brush should be changed to.
   */
  this.updateBrush = function(newExtent) {

    var newMax = newExtent[1];
    var newMin = newExtent[0];

    var notEmpty = (newMax !== newMin);
    if(notEmpty) {
      that.brush.extent(newExtent);
      that.brush(gBrush.transition().duration(1000));
    } else {
      that.brush.clear();
      that.brush(gBrush.transition().duration(1000));
    }
  };

  return this;
}
