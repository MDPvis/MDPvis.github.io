/**
 * @namespace for storing and filtering trajectories.
 */
var data = {

  /**
   * Each set of trajectories are stored here so that they can be re-loaded
   * or compared to later. The trajectories are stored with their computed statistics
   * [{trajectory:[], statistics:{percentiles: {VARIABLE:[{percentile0:0, ..., percentile100:999},...]}}},...]
   */
  trajectorySets: [],

  /**
   * All the trajectories that would be displayed if no filters are applied.
   */
  eligiblePrimaryTrajectories: [],

  /**
   * All the trajectories that would be compared to if no filters are applied.
   */
  eligibleSecondaryTrajectories: [],

  /**
   * A list of trajectories in eligiblePrimaryTrajectories not filtered by the current brushes.
   */
  filteredPrimaryTrajectories: [],

  /**
   * A list of trajectories in eligibleSecondaryTrajectories not filtered by the current brushes.
   */
  filteredSecondaryTrajectories: [],

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

    /**
     * Array of objects containing the filters currently applied to the data.
     * [{name: "string", timePeriod: 0, extent: [0,1]},...]
     */
    activeFilters: [],

    /**
     * Update a filter and update the data and statistics.
     * @param {object} chart The chart we are filtering.
     * @param {object} extent A pair giving the extent of the filter.
     */
    addFilter: function(chart, extent) {
      var name = chart.name;
      var timePeriod = chart.timePeriod;
      var newFilter = {
        name: name,
        timePeriod: timePeriod,
        extent: extent
      };
      var notReplaced = true;
      for( var i = 0; i < data.filters.activeFilters.length; i++ ) {
        var f = data.filters.activeFilters[i];
        if(f.name === name && f.timePeriod === timePeriod) {
          f.extent = extent;
          notReplaced = false;
        }
      }
      if( notReplaced ) {
        data.filters.activeFilters.push(newFilter);
      }
      data.filters.updateActiveAndStats();
      $(".no-filters").hide();
      $(".remove-all-filters").show();
    },

    /**
     * Remove a filter and update the data and statistics.
     * @param {string} name The name of the variable whose filter
     * we are removing.
     */
    removeFilter: function(name, timePeriod) {
      for( var i = 0; i < data.filters.activeFilters.length; i++ ) {
        if( data.filters.activeFilters[i].name === name && data.filters.activeFilters[i].timePeriod === timePeriod) {
          data.filters.activeFilters.splice(i, 1);
          break;
        }
      }
      $("[data-remove-filter-button-name='" + name + "']").remove(); // todo: update this for multiple filters
      if ( data.filters.activeFilters.length === 0 ) {
        $(".no-filters").show();
        $(".remove-all-filters").hide();
      }
      data.filters.updateActiveAndStats();
    },

    /**
     * Remove all filters.
     */
    clearFilters: function() {
      data.filters.activeFilters = [];
      $("[data-remove-filter-button-name]").remove();
      $(".remove-all-filters").hide();
      $(".no-filters").show();
      data.filters.updateActiveAndStats();
      MDPVis.charts.updateAll();
    },

    /**
     * Filter a set of trajectories to those not filtered.
     * @param {object} trajectories a set of trajectories that may be filtered.
     * @return {Array} The set of unfiltered trajectories.
     */
    getActiveTrajectories: function(trajectories) {
      var activeTrajectories = [];
      trajectories.forEach(function(trajectory) {
        if( data.filters.isActiveTrajectory(trajectory) ) {
          activeTrajectories.push(trajectory);
        }
      });
      return activeTrajectories;
    },

    /**
     * Determines whether the current trajectory is brushed by the active filters.
     * @param {object} trajectory The trajectory that we want to know the state of.
     * @return {boolean} Indicates (true) that the trajectory is not brushed.
     */
    isActiveTrajectory: function(trajectory) {
      for( var i = 0; i < data.filters.activeFilters.length; i++ ) {
        var name = data.filters.activeFilters[i].name;
        var timePeriod = data.filters.activeFilters[i].timePeriod;
        var extent = data.filters.activeFilters[i].extent;
        if( trajectory.length <= timePeriod ) {
          return false; // Don't include shorter trajectories than the current filter
        } else if(trajectory[timePeriod][name] < extent[0]){
          return false;
        } else if(trajectory[timePeriod][name] > extent[1]){
          return false;
        }
      }
      return true;
    },

    /**
     * Update all the data following a change in a filter.
     * Filter the active trajectories and recompute the statistics.
     */
    updateActiveAndStats: function() {
      data.filteredPrimaryTrajectories = data.filters.getActiveTrajectories(data.eligiblePrimaryTrajectories);
      data.primaryStatistics = data.computeStatistics(data.filteredPrimaryTrajectories);
      if( ! $.isEmptyObject(data.eligibleSecondaryTrajectories) ) {
        data.filteredSecondaryTrajectories = data.filters.getActiveTrajectories(data.eligibleSecondaryTrajectories);
        data.secondaryStatistics = data.computeStatistics(data.filteredSecondaryTrajectories);
      }
      data.updateAffix();
    }
  },

  /**
   * Update the affixed message panel.
   */
  updateAffix: function() {
    $(".displayed-state-count").text(data.filteredPrimaryTrajectories.length);
    $(".total-state-count").text(data.eligiblePrimaryTrajectories.length);
  },

  /**
   * Compute the derived statistics for the trajectories.
   * @param {object} activeTrajectories The trajectories object we compute stats on.
   * @return {object} The statistics object we compute.
   */
  computeStatistics: function(activeTrajectories) {
    if(activeTrajectories.length > 1000 ) {
      console.warn("todo: implement sampling since this will be costly computationally");
    } else if( activeTrajectories.length < 1 ) {
      $('.no-data-warning').show();
      return;
    }
    $('.no-data-warning').hide();

    var statistics = {};
    statistics.percentiles = {};

    var maxTrajectoryDepth = d3.max(data.eligiblePrimaryTrajectories, function(d){return d.length;});
    for( var variableName in activeTrajectories[0][0] ){
      if( variableName === "image row" ) {
        continue;
      }
      statistics.percentiles[variableName] = []; // [{percentile0:0,...,percentile100:999}]
      for( var eventIndex = 0; eventIndex < maxTrajectoryDepth; eventIndex++ ) {
        var accessor = function(d) {
          if( eventIndex >= d.length ) {
            return false;
          } else {
            return d[eventIndex][variableName];
          }
        };
        var stat = percentiles.getPercentiles(activeTrajectories, accessor, eventIndex);
        statistics.percentiles[variableName].push(stat);
      }
    }
    return statistics;
  }
};

$(".remove-all-filters").click(data.filters.clearFilters);
