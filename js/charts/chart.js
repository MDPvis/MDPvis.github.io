function Chart() {

  var that = this;

  var DOMDiv = document.createElement("div");
  DOMDiv.style.float = "left";

  this.getDOMNode = function() {
    return DOMDiv;
  };

  this.updateContextPanel = function(){
    if(that.brush.empty()) {
      contextPanel.updatePanelText("No active brushes.");
      contextPanel.dissableBrushButton();
    } else {
      var extent = that.brush.extent();
      if( typeof extent[0] === "object" ) {
        extent[1][0] = extent[1][0].toFixed(2);
        extent[1][1] = extent[1][1].toFixed(2);
        var eventNumber = Math.floor(extent[0][0]);
        contextPanel.updatePanelText("Event: " + eventNumber + ", [" + extent[1][0] + ", " + extent[1][1] + "]");
      } else {
        extent[0] = extent[0].toFixed(2);
        extent[1] = extent[1].toFixed(2);
        contextPanel.updatePanelText("Brush: [" + extent[0] + ", " + extent[1] + "]");
      }
      contextPanel.enableBrushButton();
    }
    contextPanel.showPanel(that);
  }

  // Show the context panel when this is hovered
  $(this.getDOMNode()).mouseenter(this.updateContextPanel);
}

function DistributionChart() {
  Chart.call(this);
}
function TemporalChart() {
  Chart.call(this);
}
function RolloutChart() {
  Chart.call(this);
}
