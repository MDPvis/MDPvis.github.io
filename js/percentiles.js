/**
 * Utility functions for recalculating the percentiles of trajectories.
 */
var percentiles = {
  
  /**
   * Comparator used to sort an array.
   * @param {float} a The first value being compared.
   * @param {float} b The second value being compared.
   * @return {float} The difference in the values.
   */
  compare: function(a, b) {
    return a - b;
  },

  /**
   * Gives the indices that form the median value.
   * There are two values if the cardinality is even,
   * else there is one value.
   * @param {Array} targets An array of the percentiles to collect.
   * @param {Array of Arrays} trajectories The trajectories to get percentiles from.
   * @param {function} accessor The function we are using to get the compared attributes.
   * @return {Array} The percentile values requested.
   */
  percentiles: function(targets, trajectories, accessor) {
    var sufficientLength = [];
    for ( var i = 0; i < trajectories.length; i++ ) {
      var val = accessor(trajectories[i]);
      if ( typeof(val) !== "boolean" ) {
        sufficientLength.push(val);
      }
    }
    sufficientLength.sort(percentiles.compare);
    var values = [];
    if( sufficientLength.length === 0 ) {
      return values;
    }
    targets.forEach(function(current){
      var idx = Math.floor(((sufficientLength.length - 1) / 100) * current);
      values.push(sufficientLength[idx]);
    });

    return values;
  },

  /**
   * Get the percentiles defined for the current set of trajectories on
   * a particular event and attribute.
   * @param {Array} filteredTrajectories The currently active trajectories.
   * @param {function} accessor A function to access the trajectory.
   * @param {int} eventNumber The identifier for the current event.
   */
  getPercentiles: function(filteredTrajectories, accessor, eventNumber) {
    var current = percentiles.percentiles(
      [100, 0, 90, 10, 80, 20, 70, 30, 60, 40],
      filteredTrajectories, accessor);
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