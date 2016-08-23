/**
 * Superclass for Slice charts.
 */
function SliceChart() {
  Chart.call(this);
  var that = this;

  // The icon that will be displayed to add the chart.
  this.chartIconClasses = "glyphicon glyphicon-equalizer";

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
    } else {
      return 6;
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
}
