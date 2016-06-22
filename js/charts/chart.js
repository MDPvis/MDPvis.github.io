/**
 * Superclass for all charts.
 */
function Chart() {

  var that = this;

  // The icon that will be displayed to add the chart.
  this.chartIconClasses = "glyphicon glyphicon-plus";

  var DOMDiv = document.createElement("div");
  DOMDiv.style.float = "left";
  DOMDiv.setAttribute("class", "chart");

  this.getDOMNode = function() {
    return DOMDiv;
  };
}
