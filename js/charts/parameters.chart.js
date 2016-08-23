/**
 * Superclass for parameter charts.
 */
function ParametersChart() {
  Chart.call(this);
  var that = this;

  // The icon that will be displayed to add the chart.
  that.chartIconClasses = "glyphicon glyphicon-equalizer";
}
