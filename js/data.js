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
  eligiblePrimaryRollouts: {},

  /**
   * All the rollouts that would be compared to if no filters are applied.
   */
  eligibleSecondaryRollouts: {},

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
      data.filters._updateActiveAndStats();
      data.updateAffix();
    },

    /**
     * Update a filter and update the data and statistics.
     * @param {string} name The name of the variable whose filter
     * we are updating.
     * @param {object} extent A pair giving the extent of the filter.
     */
    addFilter: function(name, extent) {
      data.filters.activeFilters[name] = [extent[0], extent[1]];
      data.filters._updateActiveAndStats();
      data.updateAffix();
    },

    /**
     * Remove a filter and update the data and statistics.
     * @param {string} name The name of the variable whose filter
     * we are removing.
     */
    removeFilter: function(name) {
      delete data.filters.activeFilters[name];
      data.filters._updateActiveAndStats();
      data.updateAffix();
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
    _updateActiveAndStats: function() {
      data.filteredPrimaryRollouts = data.filters.getActiveRollouts(data.eligiblePrimaryRollouts);
      data.primaryStatistics = data.computeStatistics(data.filteredPrimaryRollouts);
      if( ! $.isEmptyObject(data.eligibleSecondaryRollouts) ) {
        data.filteredSecondaryRollouts = data.filters.getActiveRollouts(data.eligibleSecondaryRollouts);
        data.secondaryStatistics = data.computeStatistics(data.filteredPrimaryRollouts);
      }
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
  },

}