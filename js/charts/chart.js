/**
 * Superclass for all charts.
 */
function Chart() {

  var that = this;

  var DOMDiv = document.createElement("div");
  DOMDiv.style.float = "left";
  DOMDiv.setAttribute("class", "chart");

  this.getDOMNode = function() {
    return DOMDiv;
  };
}

/**
 * Superclass for distribution charts.
 */
function DistributionChart() {
  Chart.call(this);
  var that = this;

  /**
   * Determine the number of ticks on the x axis.
   * @param {object} extent The max and min value of the labels on the x axis.
   * @param {object} tickFormat The d3 formatter used on the axis labels.
   * @return {int} The number of ticks.
   */
  this.chartTickCount = function(extent, tickFormat) {
    var minString = tickFormat(extent[0]);
    var maxString = tickFormat(extent[1]);
    var maxLength = Math.max(minString.length, maxString.length);
    if( maxLength < 3 ) {
      return 10;
    } else if( maxLength < 4 ) {
      return 8;
    } else if( maxLength < 7 ) {
      return 6;
    } else {
      return 4;
    }
  };

  /**
   * Determine the number of ticks on the x axis.
   * @param {object} extent The max and min value of the labels on the x axis.
   * @return {object} The d3 formatter used on the axis labels.
   */
  this.chartTickFormat = function(extent) {
    var defaultFormat = d3.format("1r");
    var minString = defaultFormat(extent[0]);
    var maxString = defaultFormat(extent[1]);
    var maxLength = Math.max(minString.length, maxString.length);
    if( maxLength > 6 ) {
      return d3.format("e");
    } else {
      return defaultFormat;
    }
  };

  /**
   * Show the context panel for this element, including the brush
   * state.
   */
  this.updateContextPanel = function(){
    if( ! data.filters.activeFilters[that.name] ) {
      contextPanel.updatePanelText("No active filters.");
      contextPanel.dissableBrushButton();
    } else {
      var extent = that.brush.extent();
      extent[0] = extent[0].toFixed(2);
      extent[1] = extent[1].toFixed(2);
      contextPanel.updatePanelText("Brush: [" + extent[0] + ", " + extent[1] + "]");
      contextPanel.enableBrushButton();
    }
    $(".highlight").removeClass("highlight");
    $(that.getDOMNode()).addClass("highlight");
    contextPanel.showPanel(that);
  };
  $(this.getDOMNode()).mouseenter(this.updateContextPanel);

}

/**
 * Superclass for temporal charts.
 */
function TemporalChart() {
  Chart.call(this);
  this.getDOMNode().style.float = "";
  var that = this;

  /**
   * Show the context panel for this element, including the brush
   * state.
   */
  this.updateContextPanel = function(){
    if( that.intersected ) {
      contextPanel.dissableBrushButton();
      contextPanel.updatePanelText(
        "You can only update the event " +
        "number from the fan chart when comparing. " +
        "You can brush the rollouts from the state " +
        "distributions at a particular time step");
    } else if( ! data.filters.activeFilters[that.name] ) {
      contextPanel.updatePanelText("No active filters.");
      contextPanel.dissableBrushButton();
    } else {
      var extent = that.brush.extent();
      extent[1][0] = extent[1][0].toFixed(2);
      extent[1][1] = extent[1][1].toFixed(2);
      var eventNumber = Math.floor(extent[0][0]);
      contextPanel.updatePanelText("Event: " + eventNumber + ", [" + extent[1][0] + ", " + extent[1][1] + "]");
      contextPanel.enableBrushButton();
    }
    $(".highlight").removeClass("highlight");
    $(that.getDOMNode()).addClass("highlight");
    contextPanel.showPanel(that);
  };
  $(this.getDOMNode()).mouseenter(this.updateContextPanel);

}

/**
 * Superclass for rollout charts.
 */
function RolloutChart() {
  Chart.call(this);
}
