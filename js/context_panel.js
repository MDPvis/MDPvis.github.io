/**
 * @fileOverview Shows a panel above SVG elements with controls for the
 * hovered element. A single panel moves to the location of the currently
 * hovered chart. The panel can be minimized to be a single symbol.
 */

/**
 * @namespace
 */
var contextPanel = {

  /**
   * The chart this panel is currently associated with.
   */
  currentChart: null,

  /**
   * The width of the panel when expanded (usually the width of the chart).
   */
  expandedWidth: null,

  /**
   * Indicates whether the user has minimized the context panel.
   */
  isMinimized: false,

  /**
   * Show the panel.
   * @param {object} chart the chart object.
   */
  showPanel: function(chart) {
    var target = $(chart.getDOMNode());
    var position = target.offset();
    var outerWidth = target.outerWidth();
    contextPanel.currentChart = chart;
    contextPanel.expandedWidth = outerWidth;

    // Set the panel's content dimensions
    var cpp = $(".context-panel-panel");
    var width;
    if( contextPanel.isMinimized ) {
      width = 40;
    } else {
      width = contextPanel.expandedWidth;
    }
    cpp.css({width: width});

    // Set the position of the surrounding element.
    // These two are separated to accomodate a
    // "landing area" that is larger than the actual
    // element. Otherwise it will be difficult to click.
    var height = cpp.height();
    var newCSS = {
      top: position.top - height,
      left: position.left
    };
    var cp = $(".context-panel");
    cp.css(newCSS);
    cp.show();
  },

  /**
   * Minimize the current context panel by fading the contents
   * and shrinking the dimensions.
   */
  minimizePanel: function() {
    contextPanel.isMinimized = true;
    $(".minimized-context-panel").fadeIn(800);
    $(".maximized-context-panel").fadeOut(800);
    var cp = $(".context-panel-panel");
    cp.animate({width: 40}, 1200);
  },

  /**
   * Maximize the current context panel.
   */
  maximizePanel: function() {
    contextPanel.isMinimized = false;
    $(".minimized-context-panel").fadeOut(800);
    $(".maximized-context-panel").fadeIn(800);
    var cp = $(".context-panel-panel");
    cp.animate({width: contextPanel.expandedWidth}, 1200);
  },

  /**
   * Hide the current chart and add the ability to re-display the chart
   * from the affix panel.
   */
  hideChart: function() {
    $(".context-panel").hide();
    var chart = contextPanel.currentChart;
    var node = chart.getDOMNode();
    $(node).fadeOut(400, function(){
      var button = $("<button/>", {
        "class": "btn btn-default show-chart-button",
        "style": "display:none;"
      });
      button.append($("<span/>",
        {"class": chart.chartIconClasses}
      ));
      button.append("Show Chart: " + chart.name);
      $(".show-chart-buttons").append(button);
      button.fadeIn();
      button.click(function(){
        button.fadeOut(400, function(){
          button.remove();
        });
        $(node).fadeIn();
      });
    });
  },

  /**
   * Remove the brush from the chart the context panel is currently
   * associated with.
   */
  removeBrush: function() {
    contextPanel.currentChart.removeBrush();
  },

  /**
   * Add longform sentences to the context panel.
   * @param {string} text The text we want to display in the panel.
   */
  updatePanelText: function(text) {
    $(".context-panel-text").text(text);
  },

  /**
   * Replace the current statistics with a new set of statistics.
   * @param {object} pairs an array of arrays containing pairs of
   * labels and values.
   */
  updatePanelStats: function(pairs) {
    console.error("Error: Not Implemented!");
  },

  /**
   * Resize the width of the landing panel as the width of the page
   * changes. This ensures the panel won't dissapear as the user changes the window size.
   */
  onScreenResize: function() {
    var windowWidth = $(document).width();
    $(".context-panel").width(windowWidth);
  },

  /**
   * Change the representation of the data within the chart.
   */
  contextPanelChangeChartType: function() {
    contextPanel.currentChart.changeChartType();
  }
};

// Register the button handlers.
$(".minimize-context-panel").click(contextPanel.minimizePanel);
$(".maximize-context-panel").click(contextPanel.maximizePanel);
$(".remove-brush").click(contextPanel.removeBrush);
$(".hide-chart").click(contextPanel.hideChart);
$(".change-chart-type").click(contextPanel.contextPanelChangeChartType);

// Handle window resizes
$( window ).resize(contextPanel.onScreenResize);
contextPanel.onScreenResize();
