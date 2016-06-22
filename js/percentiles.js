/**
 * Utility functions for recalculating the percentiles of trajectories.
 */
var percentiles = {
  
  /**
   * Comparator used to sort trajectories.
   * @param {int} year The years we are comparing.
   * @param {function} accessor The function we are using to get the compared attributes.
   * @return {function} The comparator used in the sort function.
   */
  compareFunction: function(accessor) {
    var comparator = function(a, b) {
      return accessor(a) - accessor(b);
    }
    return comparator;
  },

  /**
   * Gives the indices that form the median value.
   * There are two values if the cardinality is even,
   * else there is one value.
   * @param {array} targets An array of the percentiles to collect.
   * @param {array of arrays} trajectories The trajectories to get percentiles from.
   * @param {int} Year The year that we want the percentiles from.
   * @return {array} The percentile values requested.
   */
  percentiles: function(targets, trajectories, accessor, year) {
    trajectories.sort(percentiles.compareFunction(accessor));
    var values = [];
    targets.forEach(function(current){
      var idx = Math.floor(((trajectories.length - 1) / 100) * current);
      values.push(accessor(trajectories[idx]));
    })
    
    return values;
  },

  /**
   * Get the percentiles defined for the current set of trajectories on
   * a particular event and attribute.
   * @param {array} filteredTrajectories The currently active trajectories.
   * @param {function} accessor A function to access the trajectory.
   * @param {int} eventNumber The identifier for the current event.
   */
  getPercentiles: function(filteredTrajectories, accessor, eventNumber) {
    var current = percentiles.percentiles(
      [100, 0, 90, 10, 80, 20, 70, 30, 60, 40],
      filteredTrajectories, accessor, eventNumber);
    var stat = {
      eventNumber: eventNumber,
      percentile100: current[0],
      percentile0: current[1],
      percentile90: current[2],
      percentile10: current[3],
      percentile80: current[4],
      percentile20: current[5],
      percentile70: current[6],
      percentile30: current[7],
      percentile60: current[8],
      percentile40: current[9]
    };
    return stat;
  }
}