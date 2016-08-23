/**
 * An implementation of the Electric Car domain.
 * This domain will return trajectories to the user interface using either the true transition model, the transition
 * model of MFMC, or MFMCi.
 * @type {{returnIntitialize: Function, returnTrajectories: Function, returnOptimize: Function, returnStateDetail: Function}}
 */
var domain = {

  /**
   * The parameters controlling the domain. We do not typically expose these in the UI.
   */
  parameters: {
    distanceBetweenSuperchargers: 200,
    distanceAcrossContent: 3000,
    depletionPenalty: -1000,
    distanceBetweenChargers: 200,
    chargingFixedCost: -100,
    numberTransitions: 15
  },

  /**
   * Return the initialization object for the user interface.
   * @returns {object}
   */
  returnIntitialize: function(){
    var initObject = {
      "parameter_collections": [
        {
          "panel_title": "Sampling Effort",
          "panel_icon": "glyphicon-retweet",
          "panel_description": "Define how many trajectories you want to generate, and to what time horizon.",
          "quantitative": [
            {
              "name": "Sample Count",
              "description": "Specify how many trajectories to generate",
              "current_value": 40,
              "max": 200,
              "min": 1,
              "step": 10,
              "units": "#"
            },
            {
              "name": "Seed",
              "description": "The random seed used for simulations",
              "current_value": 0,
              "max": 100,
              "min": 1,
              "step": 1,
              "units": "NA"
            }
          ]
        },
        {
          "panel_title": "Transition Model",
          "panel_icon": "glyphicon-retweet",
          "panel_description": "Select which transition model is used.",
          "quantitative": [
            {
              "name": "Use MFMC",
              "description": "Specify how many trajectories to generate",
              "current_value": 0,
              "max": 1,
              "min": 0,
              "step": 1,
              "units": "NA"
            },
            {
              "name": "Include Exogenous Variables in Metric",
              "description": "A setting of zero will include none of the exogenous variables in the distance metric. This will be ignored if 'User MFMC' is not 1.",
              "current_value": 0,
              "max": 1,
              "min": 0,
              "step": 1,
              "units": "NA"
            },
            {
              "name": "Include Actions in Metric",
              "description": "A setting of zero will include none of the actions in the distance metric. This will be ignored if 'User MFMC' is not 1.",
              "current_value": 0,
              "max": 1,
              "min": 0,
              "step": 1,
              "units": "NA"
            },
            {
              "name": "Require Matching Action",
              "description": "When the bias correction is off, you can either accept the nearest transition regardless of action, or search until you find the nearest state with a shared action.",
              "current_value": 0,
              "max": 1,
              "min": 0,
              "step": 1,
              "units": "NA"
            },
            {
              "name": "Exogenous Variable Count",
              "description": "How many exogenous variables determine the distribution of fuel economy?",
              "current_value": 3,
              "max": 7,
              "min": 0,
              "step": 1,
              "units": "NA"
            }
          ]
        },
        {
          "panel_title": "Database",
          "panel_icon": "glyphicon-retweet",
          "panel_description": "If MFMC is used, you should select the parameters of the database.",
          "quantitative": [
            {
              "name": "Database Trajectory Count",
              "description": "Specify how many trajectories to sample into the database",
              "current_value": 40,
              "max": 200,
              "min": 1,
              "step": 10,
              "units": "NA"
            },
            {
              "name": "Include Bias Correction Sample",
              "description": "Should all off-policy actions be sampled into transition sets?",
              "current_value": 1,
              "max": 1,
              "min": 0,
              "step": 1,
              "units": "NA"
            },
            {
              "name": "Database Policy",
              "description": "Probabilities for charging: (0) distance_remaining/starting_distance, (1) opposite of policy 1, (2) if charge < .5, (3) opposite of policy 2, (4) if exogenous1 > .5, (5) opposite of policy 4.",
              "current_value": 0,
              "max": 5,
              "min": 0,
              "step": 1,
              "units": "NA"
            },
            {
              "name": "Sample with Replacement",
              "description": "Can we re-use trajectories within the same sample set.",
              "current_value": 0,
              "max": 1,
              "min": 0,
              "step": 1,
              "units": "NA"
            }
          ]
        },
        {
          "panel_title": "Evaluation Policy",
          "panel_icon": "glyphicon-retweet",
          "panel_description": "The policy we are generating trajectories for.",
          "quantitative": [
            {
              "name": "Evaluation Policy",
              "description": "Probabilities for charging: (0) distance_remaining/starting_distance, (1) opposite of policy 1, (2) if charge < .5, (3) opposite of policy 2, (4) if exogenous 1 > .5, (5) opposite of policy 4.",
              "current_value": 0,
              "max": 5,
              "min": 0,
              "step": 1,
              "units": "NA"
            }
          ]
        }
      ]
    };
    return initObject;
  },

  /**
   * Return an initial state for the given random number generator.
   * @private
   */
  _initialState: function(prng) {
    return {
      "reward": 0,
      "charge level": prng(),
      "total distance remaining": domain.parameters.distanceAcrossContent,
      "Stitched Distance": 0
    };
  },

  /**
   * Return an initial state from the database.
   * @private
   */
  _initialStateFromDatabase: function(database, sampleWithReplacement) {
    for( var i = 0; i < database.length; i++ ) {
      if( sampleWithReplacement || database[i][0]["additionalData"].lastAccessed === -1 ) {
        return database[i][0];
      }
    }
    goToFail();
  },

  /**
   * Return a function mapping states to actions
   * @param policyIdentifier The policy ID to select.
   * @param prng The pseudo random number generator to use in the policy.
   * @private
   */
  _policyFactory: function(policyIdentifier, seed) {
    var prng = new Math.seedrandom("Trajectory CONSTANT"+seed);
    var policyFunction;
    if( policyIdentifier === 0 ) {
      policyFunction = function(state) {
        var rn = prng();
        if( rn > state["total distance remaining"]/domain.parameters.distanceAcrossContent) {
          return 0;
        } else {
          return 1;
        }
      }
    } else if( policyIdentifier === 1 ) {
      policyFunction = function(state) {
        var rn = prng();
        if( rn > state["total distance remaining"]/domain.parameters.distanceAcrossContent) {
          return 1;
        } else {
          return 0;
        }
      }
    } else if( policyIdentifier === 2 ) {
      policyFunction = function(state) {
        if( state["charge level"] < 0.5 ) {
          return 1;
        } else {
          return 0;
        }
      }
    } else if( policyIdentifier === 3 ) {
      policyFunction = function(state) {
        if( state["charge level"] < 0.5 ) {
          return 0;
        } else {
          return 1;
        }
      }
    } else if( policyIdentifier === 4 ) {
      policyFunction = function(state) {
        if( state["exogenous 1"] > .5 ) {
          return 1;
        } else {
          return 0;
        }
      }
    } else if( policyIdentifier === 5 ) {
      if( state["exogenous 1"] > .5 ) {
        return 0;
      } else {
        return 1;
      }
    } else {
      alert("you selected an invalid policy");
    }
    return policyFunction;
  },

  /**
   * Sample the count of exogenous variables, then assign all the surplus exogenous variables to 0.
   * This will ensure MDPvis renders all the required dimensions.
   * @param prng
   * @param exogenousCount
   * @private
   */
  _sampleExogenousState: function(prng, exogenousCount) {
    var ex = [];
    for( var i=0; i < exogenousCount; i++ ) {
      ex.push(prng());
    }
    for( var i=exogenousCount; i < 7; i++ ) {
      ex.push(0);
    }
    return ex;
  },

  /**
   * Add the exogenous state to the state vector.
   * @param state
   * @private
   */
  _addExogenousState: function(prng, exogenousCount, state) {
    var ex = domain._sampleExogenousState(prng, exogenousCount);
    for( var i=0; i < ex.length; i++ ) {
      state["exogenous " + i] = ex[i];
    }
  },

  /**
   * Sample a trajectory from the simulator.
   * @private
   */
  _sampleTrajectoryFromSimulator: function(seed, exogenousCount, policyID, includeBiasCorrectionSample){
    var trajectory = [];
    var prng = new Math.seedrandom(seed);
    var policy = domain._policyFactory(policyID, seed);

    function getResultState(currentState, action) {
      if( currentState["total distance remaining"] <= 0 ) {
        goToFail();
      }
      var resultState = {};
      var rnTotal = 0;
      for( var i = 0; i < 7; i++ ) {
        rnTotal += currentState["exogenous " + i];
      }
      if( exogenousCount !== 0) {
        var rn = rnTotal/exogenousCount;
      } else {
        rn = .5;
      }
      var chargeAtStart = currentState["charge level"];
      var chargingCost = 0;
      if ( action === 1 ) {
        chargeAtStart = 1;
        chargingCost = domain.parameters.chargingFixedCost;
      }
      var chargeDepletion = rn;
      if( chargeDepletion > chargeAtStart ) {
        resultState["reward"] = domain.parameters.depletionPenalty + chargingCost;
        resultState["charge level"] = 0;
      } else {
        resultState["reward"] = chargingCost;
        resultState["charge level"] = chargeAtStart - chargeDepletion;
      }
      resultState["total distance remaining"] = currentState["total distance remaining"] - domain.parameters.distanceBetweenChargers;
      resultState["Stitched Distance"] = 0;
      domain._addExogenousState(prng, exogenousCount, resultState);
      return resultState;
    }

    var currentState = domain._initialState(prng);
    domain._addExogenousState(prng, exogenousCount, currentState);
    for( var i = 0; i < domain.parameters.numberTransitions; i++ ) {
      var action = policy(currentState);
      currentState["action"] = action;
      var onPolicyResult = getResultState(currentState, currentState["action"]);
      if( includeBiasCorrectionSample ) {
        if( currentState["action"] === 1 ) {
          var offPolicyResult = getResultState(currentState, 0);
        } else {
          offPolicyResult = getResultState(currentState, 1);
        }
        for( var j=0; j < 7; j++ ) {
          offPolicyResult["exogenous " + j] = onPolicyResult["exogenous " + j];
        }
      }
      currentState.additionalData = {offPolicyResult: offPolicyResult, lastAccessed: -1};
      trajectory.push(currentState);
      currentState = onPolicyResult;
    }
    currentState["action"] = 0; // place holder for rendering
    trajectory.push(currentState);
    return trajectory;
  },

  /**
   * Get the distance between the two states
   * @param state1
   * @param state2
   * @param includeAction
   * @param includeExogenous
   * @private
   */
  _getDistance: function(state1, state2, action, includeAction, includeExogenous) {
    var totalDistance = 0;
    totalDistance += Math.abs(state1["charge level"] - state2["charge level"])/(1/12);
    totalDistance += Math.abs(state1["total distance remaining"] - state2["total distance remaining"])/850000;
    if( includeAction ) {
      totalDistance += Math.abs(action - state2["action"])/0.25;
    }
    if( includeExogenous ) {
      for(var i = 0; i < 7; i++) {
        totalDistance += Math.abs(state1["exogenous " + i] - state2["exogenous " + i])/(1/12);
      }
    }
    return totalDistance;
  },

  /**
   * Get the closest state to stitch to.
   * @param state
   * @param database
   * @private
   */
  _getClosestResult: function(state, action, database, includeAction, includeExogenous, sampleWithReplacement, includeBiasCorrectionSample, requireExactActionMatch) {
    var ret, stitched;
    var minimalDistance = Infinity;
    // For each trajectory
    for( var i = 0; i < database.length; i++ ) {
      // For each transition
      for( var j = 0; j < database[i].length - 1; j++ ) {
        var compareState = database[i][j];
        if( ! sampleWithReplacement && compareState.additionalData.lastAccessed === 1) {
          continue;
        }
        if( state["total distance remaining"] !== 3000 && compareState["total distance remaining"] === 3000 ) {
          continue;
        }
        if( requireExactActionMatch && action !== compareState["action"] ) {
          continue;
        }
        var currentDistance = domain._getDistance(state, compareState, action, includeAction, includeExogenous);
        if( currentDistance < minimalDistance ) {
          stitched = database[i][j];

          if( action === compareState["action"] || ! includeBiasCorrectionSample) {
            ret = database[i][j+1];
          } else {
            ret = database[i][j]["additionalData"]["offPolicyResult"];
          }
          minimalDistance = currentDistance;
        }
      }
    }
    stitched.additionalData.lastAccessed = 1;
    ret["Stitched Distance"] = minimalDistance;
    return ret;
  },

  /**
   * Return a cloned state object.
   * @param state
   * @private
   */
  _cloneState: function(state) {
    var clone = {};
    for( var key in state ) {
      clone[key] = state[key];
    }
    return clone;
  },

  /**
   * Sample a trajectory from the database.
   * @private
   */
  _sampleTrajectoryFromDatabase: function(seed, exogenousCount, policyID, database, includeAction, includeExogenous, sampleWithReplacement, includeBiasCorrectionSample, requireExactActionMatch){
    var trajectory = [];
    var currentState = domain._initialStateFromDatabase(database, sampleWithReplacement);
    var policy = domain._policyFactory(policyID, seed);
    var clone = domain._cloneState(currentState);
    var action = policy(clone);
    clone["action"] = action;
    trajectory.push(clone);
    for( var j = 0; j < domain.parameters.numberTransitions; j++ ) {
      currentState = domain._getClosestResult(currentState, action, database, includeAction, includeExogenous, sampleWithReplacement, includeBiasCorrectionSample, requireExactActionMatch);
      clone = domain._cloneState(currentState);
      action = policy(currentState);
      clone["action"] = action;
      if( j === domain.parameters.numberTransitions - 1 ) {
        clone["action"] = 0;
      }
      trajectory.push(clone);
    }
    return trajectory;
  },

  /**
   * Return trajectories for the current set of parameters.
   * @returns {object}
   */
  returnTrajectories: function(query){
    var seed = parseInt(query["Seed"]);
    var exogenousCount = parseInt(query["Exogenous Variable Count"]);
    var policyID = parseInt(query["Evaluation Policy"]);
    var trajectoryCount = parseInt(query["Sample Count"]);

    var useMFMC = parseInt(query["Use MFMC"]) === 1;
    var databasePolicyID = parseInt(query["Database Policy"]);
    var includeBiasCorrectionSample = parseInt(query["Include Bias Correction Sample"]) === 1;
    var requireExactActionMatch = parseInt(query["Require Matching Action"]) === 1;
    var includeActionsInMetric = parseInt(query["Include Actions in Metric"]) === 1;
    var includeExogenousInMetric = parseInt(query["Include Exogenous Variables in Metric"]) === 1;
    var sampleWithReplacement = parseInt(query["Sample with Replacement"]) === 1;
    var databaseTrajectoryCount = parseInt(query["Database Trajectory Count"]);
    var database = [];

    if( ! useMFMC ) {
      databasePolicyID = policyID;
      databaseTrajectoryCount = trajectoryCount;
    }

    for ( var i = 0; i < databaseTrajectoryCount; i++ ) {
      var trajectory = domain._sampleTrajectoryFromSimulator(i+seed, exogenousCount, databasePolicyID, true);
      database.push(trajectory);
    }

    var trajectories = [];
    if( useMFMC ) {
      for ( var i = 0; i < trajectoryCount; i++ ) {
        trajectory = domain._sampleTrajectoryFromDatabase(i+seed, exogenousCount, policyID, database, includeActionsInMetric, includeExogenousInMetric, sampleWithReplacement, includeBiasCorrectionSample, requireExactActionMatch);
        trajectories.push(trajectory);
      }
    } else {
      trajectories = database;
    }
    return {"trajectories": trajectories};
  },

  /**
   * Return the parameters known (apriori) to be optimal.
   */
  returnOptimize: function(){
    return "todo"
  },

  /**
   *
   * @returns {object}
   */
  returnStateDetail: function(){
    return "todo"
  }
};

/**
 * Hack the AJAX function in jquery to never make an AJAX request. Instead, the
 * domain defined in Javascript will be called.
 * @param dict The query dictionary called by the AJAX function.
 * @returns {retObject}
 */
function newDomainAjax(dict) {
  function retObject() {}
  retObject.fail = function(handler){
    return retObject;
  };
  if( dict.url.indexOf("/initialize") === 0 ) {
    retObject.done = function(handler){
      handler(domain.returnIntitialize());
      return retObject;
    };
    return retObject;
  } else if( dict.url.indexOf("/trajectories") === 0 ) {
    retObject.done = function(handler){
      handler(domain.returnTrajectories(dict["data"]));
      return retObject;
    };
    return retObject;
  } else if( dict.url.indexOf("/optimize") === 0 ) {
    retObject.done = function(handler){
      handler(domain.returnOptimize());
      return retObject;
    };
    return retObject;
  }
}
$.ajax = newDomainAjax;
MDPVis.initialize();
