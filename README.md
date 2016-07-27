# About

MDPvis is a visualization designed to assist in the MDP simulation and optimization process. See "[Facilitating Testing and Debugging of Markov Decision Processes with Interactive Visualization](http://ieeexplore.ieee.org/xpl/login.jsp?tp=&arnumber=7357198&url=http%3A%2F%2Fieeexplore.ieee.org%2Fxpls%2Fabs_all.jsp%3Farnumber%3D7357198)." To play with a live version of the visualization, visit [mdpvis.github.io/](http://mdpvis.github.io/).

We built MDPvis as a web-based visualization so it would be:

* Easy to integrate with your domain using standard web server libraries
* Easy to share with other people by sharing links to the visualization
* Easy to extend with additional visualization components

The remainder of this document is a guide for interfacing MDPvis with your MDP simulator and optimizer. If you don't want to serve your own instance of MDPvis, you can visit [mdpvis.github.io/](http://mdpvis.github.io/) and skip to the "Bridging MDPvis and Your Domain" section below.

![MDPvis Screen Capture](images/cover.png "MDPvis Screen Capture")

# Serving MDPvis to Your Browser

If you plan on making changes to MDPvis, then you should host MDPvis yourself. Otherwise, we recommend visiting [mdpvis.github.io/](http://mdpvis.github.io/).

If you don't use our hosted version of the MDPvis web application, you will need to serve MDPvis. The simplest way to accomplish this is to follow these steps:

1. [Install Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
2. Clone MDPvis into your MDP simulator code base, `cd YOUR_SIMULATOR;git clone git@github.com:MDPvis/MDPvis.github.io.git`. You can use a [Git Submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules) for this if you don't mind figuring out how they work. If you are going to contribute back to MDPvis, you should probably clone your fork of MDPvis.
3. Install [Python 2.7](https://www.python.org/downloads/release/python-279/)
4. Install a few Python libraries with `pip install -U flask-cors`.
5. Navigate into the MDPvis directory and start the server with `./serve.sh`
6. Visit http://localhost:8000
7. Select one of the pre-existing simulation and optimization servers, or bridge MDPvis to your domain

# Bridging MDPvis and Your Domain

MDPvis interfaces with any MDP simulator+optimizer that is callable by a web server. We have a few read-to-go

Your domain web server is responsible for serving four HTTP requests from the visualization, transforms the query parameters to those expected by the simulator or optimizer, invokes the simulator or optimizer, then returns the results to MDPvis. There are four distinct requests that the bridge should support. We detail these requests below

The visualization expects your code to support the following requests. If your domain is written in Python, we recommend porting one of the example `domain_bridge.py` files to your domain.

## /initialize

The `/initialize` endpoint provides a set of parameters that will be sent to the simulator or optimizer on future requests. Here your responsibility is to return a [JSON](http://www.copterlabs.com/blog/json-what-it-is-how-it-works-how-to-use-it/) object listing the:

* Name
* Description
* Current Value
* Minimum Value
* Maximum Value
* Step (How fast the value changes when pressing a button)
* Units

of each parameter. An example of this data structure in Python is:

    return {

             # The control panels that appear at the top of the screen
             "parameter_collections": [
                 {
                     "panel_title": "Sampling Effort",
                     "panel_icon": "glyphicon-retweet",
                     "panel_description": "Define how many trajectories you want to generate, and to what time horizon.",
                     "quantitative": [  # Real valued parameters
                                        {
                                            "name": "Sample Count",
                                            "description": "Specify how many trajectories to generate",
                                            "current_value": 10,
                                            "max": 1000,
                                            "min": 1,
                                            "step": 10,
                                            "units": "#"
                                        },
                                        {
                                            "name": "Horizon",
                                            "description": "The time step at which simulation terminates",
                                            "current_value": 10,
                                            "max": 10000,
                                            "min": 1,
                                            "step": 10,
                                            "units": "Time Steps"
                                        },
                                        {
                                            "name": "Seed",
                                            "description": "The random seed used for simulations",
                                            "current_value": 0,
                                            "max": 100000,
                                            "min": 1,
                                            "step": 1,
                                            "units": "NA"
                                        }
                     ]
                 }
             ]
           }

In the MDPvis user interface, each control will be grouped into panels under the `panel_title`.

## /trajectories?QUERY

When requesting Monte Carlo trajectories, MDPvis will send the current set of parameters as defined in the initialization and assigned in the user interface. The job of the web server is to map the parameters of the user interface into parameters to invoke the simulator. After simulations have completed, the data should be JSON serialized. An example of the data in Python is:

    return [
        [
          {"Burn Time": 4.261, "Timber Harvested": 251}, {"Burn Time": 40.261, "Timber Harvested": 0}
        ],
        [
          {"Burn Time": 0.0, "Timber Harvested": 342}, {"Burn Time": 45.261, "Timber Harvested": 20}
        ]
    ]

These data are two trajectories of two states each. An additional special state variable, `image row`, gives
an array of images or videos that should be displayed when selecting a trajectory. For example:

    return [
        [
          {"Burn Time": 4.261, "Timber Harvested": 251, "image row": ["traj1-1.png"]}, {"Burn Time": 40.261, "Timber Harvested": 0, , "image row": ["traj1-2.png"]}
        ],
        [
          {"Burn Time": 0.0, "Timber Harvested": 342, "image row": ["traj2-1.mp4"]}, {"Burn Time": 45.261, "Timber Harvested": 20, "image row": ["traj2-1.mp4"]}
        ]
    ]

will attempt to display the images `traj1-1.png` and `traj1-1.png` when the user clicks the associated trajectory.

## /optimize?QUERY

MDPvis does not require you to integrate `/optimize` and `/state`, but it is very useful for exploring most problems. Here all the same parameters as are sent to `/trajectories` are sent to `/optimize`, but this query only returns an updated policy. Here is a python example for a logistic regression based policy:

    return {"Constant": 10,
            "Fuel Load 8": 3,
            "Fuel Load 24": -1}

Here is an example where the policy parameters represent versions of a neural network. This would allow for comparing between the performances of different neural networks and
asking for additional training of an existing network.

    return [
            {"network version": 5}
          ]

## /STATE_DETAIL

This query will be issued when a user clicks an individual trajectory in the visualization and the state detail area populates with the images and videos specified by the trajectory's "image row" variable. The expectation is you will use the file name to re-generate the trajectory and use the simulator to generate descriptive statistics, videos, and/or images for the states.

## Implementing a New Visualization

If you are interested in implementing a new visualization within MDPvis, we encourage you to make contact by opening an issue in this visualization. The code base is under active development and will be changing substantially to be more easily extensible.

You've been warned. Here are the steps:

1. Select a visualization aspect (Single Time Step Distributions, Temporal Distributions, Single Trajectory)
1. Copy an existing visualization's script that has the chosen aspect
1. Add the script to index.html
1. Update the index.js script to call your visualization and add it to the DOM.

# Credits and Contact

If you are having trouble integrating MDPvis, please open an issue on the repository or use one of the contacts found below.

Maintainer: [Sean McGregor](http://seanbmcgregor.com)  
Email: MDPvisGitHubReadme --the at sign-- seanbmcgregor.com  
Maintainer Mailing Address: PO Box 79, Corvallis, OR 97339, United States of America  

Implementation by: Sean McGregor  
With: Hailey Buckingham, Thomas G. Dietterich, Rachel Houtman, Claire Montgomery, and Ronald Metoyer

