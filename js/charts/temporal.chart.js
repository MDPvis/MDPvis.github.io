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
    if( that.intersected ) {
      contextPanel.dissableBrushButton();
      contextPanel.updatePanelText(
        "Brushing dissabled.");
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
