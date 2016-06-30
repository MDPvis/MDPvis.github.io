/**
 * Superclass for all charts.
 */
function Chart() {

  var that = this;

  // The icon that will be displayed to add the chart.
  that.chartIconClasses = "glyphicon glyphicon-plus";

  var DOMDiv = document.createElement("div");
  DOMDiv.style.float = "left";
  DOMDiv.setAttribute("class", "chart");

  /**
   * Get the DOM node of the chart for rendering on the page.
   * @returns {Element}
   */
  that.getDOMNode = function() {
    return DOMDiv;
  };

  /**
   * Destroy the chart object by removing it from the DOM.
   */
  that.destroyChart = function() {
    $(DOMDiv).remove();
  };
}
