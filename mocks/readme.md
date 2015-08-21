This directory contains various data structures that are expected to be returned by the content server. I document them by the URL endpoint that the server will be answering in the sections below. All of these requests are made with an HTTP GET request, which means the server should not carry any state. This implies the server will be "dumb" and never remember requests, sessions, or prior optimization results.

# Gets Initial Configuration

Returns the configuration for the visualization as JSON, including the starting reward values, policy values, and transition function values.

**Path**

`/initialize`

**Parameters:**

none

**Returns:**

    {
      "reward": [{"name": "NAME", "current_value": 11111, "max": 999999, "min": 0, "units": "$"},...]
      "transition": [{"name": "NAME", "current_value": 11111, "max": 999999, "min": 0, "units": "$"},...]
      "policy": [{"name": "NAME", "current_value": 11111, "max": 999999, "min": 0, "units": "$"},...]
    }

The name is both the display name for the parameter and the identifier when sent in subsequent requests to the web server.

The description is the long form description of the parameter value.

The current value is the value the parameter should be initialized to in the interface.

The max and the min values are the maximum and minimum values the visualization should allow for that parameter.

# Gets rollouts for the policy defined on the client

The visualization sends the policy it wants rollouts from along with any specifiable transition function parameters.

**Path**

`/rollouts?policy[POLICY_PARAM1]=X&...&transition[TRANSITION_FUNCTION_PARAM1]=I&...`

**Parameters**

policy[PARAM]: a list of policy parameters and their values.  
transition[PARAM]: a list of transition parameters and their values.

**Returns**

Gives the rollout object.

    [
      [{"variable name":"variable value", ...}, {"variable name":"variable value", ...}],
      [{"variable name":"variable value", ...}, {"variable name":"variable value", ...}],
      ...
    ]

# Get a Specific State

The visualization requests all the hidden state variables for a particular state. For wildfire this is the complete landscape object.

**Path**

`/state?event=ID`

**Parameters**

event: an identifier for the particular event to be shown. This identifier should be included in the rollouts and it could include any of the elements required to re-generate the hidden state variables.

**Returns**

TODO: specify this.

# Optimize Policy

Optimize a new policy from the currently specified policy

**Path**

`/optimize?policy[POLICY_PARAM1]=X&...&transition[TRANSITION_FUNCTION_PARAM1]=I&...&reward[PARAM]`

(post current rewards, transition function, and current policy return same object as get rollouts)

**Parameters**

policy[PARAM]: a list of policy parameters and their values.  
transition[PARAM]: a list of transition parameters and their values.
reward[PARAM]: a list of reward parameters and their values.

**Returns:**

    {
      "reward": [{"name": "NAME", "current_value": 11111, "max": 999999, "min": 0, "units": "$"},...]
      "transition": [{"name": "NAME", "current_value": 11111, "max": 999999, "min": 0, "units": "$"},...]
      "policy": [{"name": "NAME", "current_value": 11111, "max": 999999, "min": 0, "units": "$"},...]
    }

The visualization should then request rollouts from the returned policy.


