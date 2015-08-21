// Karma configuration
// Generated on Thu Mar 13 2014 14:12:04 GMT-0700 (PDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      "../../js/tests.js",
      "../../js/vendor/seedrandom.js",
      "../../js/vendor/jquery.min.js",
      "../../js/vendor/d3.v3.min.js",
      "../../js/policy.js",
      "../../js/generate.js",
      "../../js/charts/fan_chart.js",
      "../../js/charts/initial_histogram.js",
      "../../js/charts/developmental_histogram.js",
      "../../js/charts/scatter_plot.js",
      "../../js/charts/landscape_plotter.js",
      "../../js/optimize.js",
      "../../js/data.js",
      "../../js/index.js",
      "../../bootstrap/js/bootstrap.min.js",
      'spec/policy.js',
      'spec/scatter_plot.js',
      'spec/landscape_plotter.js',
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
