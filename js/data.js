/**
 * @namespace for storing and filtering rollouts.
 */
var data = {

  /**
   * Each set of rollouts are stored here so that they can be re-loaded
   * or compared to later. The rollouts are stored with their computed statistics
   * [{rollout:[], statistics:{percentiles: {VARIABLE:[{percentile0:0, ..., percentile100:999},...]}}},...]
   */
  rolloutSets: [],

  /**
   * All the rollouts that would be displayed if no filters are applied.
   */
  eligiblePrimaryRollouts: [],

  /**
   * All the rollouts that would be compared to if no filters are applied.
   */
  eligibleSecondaryRollouts: [],

  /**
   * A list of rollouts in eligiblePrimaryRollouts not filtered by the current brushes.
   */
  filteredPrimaryRollouts: [],

  /**
   * A list of rollouts in eligibleSecondaryRollouts not filtered by the current brushes.
   */
  filteredSecondaryRollouts: [],

  /**
   * The statistics as computed for the filtered primary data.
   */
  primaryStatistics: {},

  /**
   * The statistics as computed for the filtered primary data.
   */
  secondaryStatistics: {},

  /**
   * Gives the attributes that are currently being filtered and what their
   * active range is. This object is assigned by the brushes defined by the
   * histograms.
   */
  filters: {
    activeFilters: {}, // The set of filters on the initial state
    filteredTimePeriod: 0, // The event numbers the filters are applied to

    /**
     * Update the event number filters are applied to and update the data and statistics.
     * @param {int} eventNumber The event number we are going to filter.
     */
    changeFilteredTimePeriod: function(eventNumber) {
      data.filters.filteredTimePeriod = eventNumber;
      $(".current-event-number").text(eventNumber);
      data.filters.updateActiveAndStats();
    },

    /**
     * Update a filter and update the data and statistics.
     * @param {object} chart The chart we are filtering.
     * @param {object} extent A pair giving the extent of the filter.
     */
    addFilter: function(chart, extent) {
      var name = chart.name;
      data.filters.activeFilters[name] = [extent[0], extent[1]];
      data.filters.updateActiveAndStats();
      $(".no-filters").hide();
      $(".remove-all-filters").show();

      var button = $("[data-remove-filter-button-name='" + name + "']");
      if( button.length > 0 ) {
        button.empty();
      } else {
        button = $("<button/>", {
          "class": "btn btn-default show-chart-button",
          "style": "display:none;",
          "data-remove-filter-button-name": name
        });
        $(".remove-filter-buttons").append(button);
        button.fadeIn();
        button.click(function(){
          button.fadeOut(400, function(){
            button.remove();
          });
          chart.removeBrush();
        });
      }
      button.append($("<span/>",
        {"class": "glyphicon glyphicon-minus"}
      ));
      var displayExtent = [extent[0].toFixed(2), extent[1].toFixed(2)];
      button.append(name + ", [" + displayExtent + "]");
    },

    /**
     * Remove a filter and update the data and statistics.
     * @param {string} name The name of the variable whose filter
     * we are removing.
     */
    removeFilter: function(name) {
      delete data.filters.activeFilters[name];
      $("[data-remove-filter-button-name='" + name + "']").remove();
      if ( Object.keys( data.filters.activeFilters ).length === 0 ) {
        $(".no-filters").show();
        $(".remove-all-filters").hide();
      }
      data.filters.updateActiveAndStats();
    },

    /**
     * Remove all filters.
     */
    clearFilters: function() {
      for( filter in data.filters.activeFilters ) {
        delete data.filters.activeFilters[filter];
        $("[data-remove-filter-button-name='" + filter + "']").remove();
      }
      $(".remove-all-filters").hide();
      $(".no-filters").show();
      data.filters.updateActiveAndStats();
      MDPVis.charts.updateAll();
    },

    /**
     * Filter a set of rollouts to those not filtered.
     * @param {object} rollouts a set of rollouts that may be filtered.
     * @return {array} The set of unfiltered rollouts.
     */
    getActiveRollouts: function(rollouts) {
      var activeRollouts = [];
      rollouts.forEach(function(rollout) {
        if( data.filters.isActiveRollout(rollout) ) {
          activeRollouts.push(rollout);
        }
      });
      return activeRollouts;
    },

    /**
     * Determines whether the current rollout is brushed by the active filters.
     * @param {object} rollout The rollout that we want to know the state of.
     * @return {boolean} Indicates (true) that the rollout is not brushed.
     */
    isActiveRollout: function(rollout) {
      // Don't include shorter rollouts than the current filter
      var timePeriod = data.filters.filteredTimePeriod;
      if( rollout.length - 1 < timePeriod ) {
        return false;
      }
      for( var variable in data.filters.activeFilters ) {
        if(rollout[timePeriod][variable] < data.filters.activeFilters[variable][0]){
          return false;
        } else if(rollout[timePeriod][variable] > data.filters.activeFilters[variable][1]){
          return false;
        }
      }
      return true;
    },

    /**
     * Update all the data following a change in a filter.
     * Filter the active rollouts and recompute the statistics.
     */
    updateActiveAndStats: function() {
      data.filteredPrimaryRollouts = data.filters.getActiveRollouts(data.eligiblePrimaryRollouts);
      data.primaryStatistics = data.computeStatistics(data.filteredPrimaryRollouts);
      if( ! $.isEmptyObject(data.eligibleSecondaryRollouts) ) {
        data.filteredSecondaryRollouts = data.filters.getActiveRollouts(data.eligibleSecondaryRollouts);
        data.secondaryStatistics = data.computeStatistics(data.filteredPrimaryRollouts);
      }
      data.updateAffix();
    }
  },

  /**
   * Update the affixed message panel.
   */
  updateAffix: function() {
    $(".displayed-state-count").text(data.filteredPrimaryRollouts.length);
    $(".total-state-count").text(data.eligiblePrimaryRollouts.length);
  },

  /**
   * Compute the derived statistics for the rollouts.
   * @param {object} rollouts The rollouts object we compute stats on.
   * @return {object} The statistics object we compute.
   */
  computeStatistics: function(activeRollouts) {
    if(activeRollouts.length > 1000 ) {
      console.warn("todo: implement sampling since this will be costly computationally");
    } else if( activeRollouts.length < 1 ) {
      $('.no-data-warning').show();
      return;
    }
    $('.no-data-warning').hide();

    var statistics = {};
    statistics.percentiles = {};

    var maxRolloutDepth = d3.max(data.eligiblePrimaryRollouts, function(d){return d.length;});
    for( var variableName in activeRollouts[0][0] ){
      statistics.percentiles[variableName] = []; // [{percentile0:0,...,percentile100:999}]
      for( var eventIndex = 0; eventIndex < maxRolloutDepth; eventIndex++ ) {
        var accessor = function(d) {
          if( eventIndex >= d.length ) {
            return d[d.length - 1][variableName];
          } else {
            return d[eventIndex][variableName];
          }
        }
        var stat = percentiles.getPercentiles(activeRollouts, accessor, eventIndex);
        statistics.percentiles[variableName].push(stat);
      }
    }
    var totalReward = 0;
    for ( var rolloutNumber = 0; rolloutNumber < activeRollouts.length; rolloutNumber++ ) {
      for( var eventIndex = 0; eventIndex < activeRollouts[rolloutNumber].length; eventIndex++ ) {
        totalReward += activeRollouts[rolloutNumber][eventIndex]["Discounted Reward"];
      }
    }
    statistics.expectedValue = totalReward/activeRollouts.length;

    return statistics;
  }
}

$(".remove-all-filters").click(data.filters.clearFilters);
