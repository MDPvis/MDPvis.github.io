/**
 * Superclass for temporal charts.
 */
function TemporalChart() {
  Chart.call(this);
  this.getDOMNode().style.float = "";
  var that = this;

  // The icon that will be displayed to add the chart.
  this.chartIconClasses = "glyphicon glyphicon-indent-left";

  /**
   * Show the context panel for this element, including the brush
   * state.
   */
  this.updateContextPanel = function(){
    $(".highlight").removeClass("highlight");
    $(that.getDOMNode()).addClass("highlight");
    contextPanel.showPanel(that);
  };
  $(this.getDOMNode()).mouseenter(this.updateContextPanel);
}
