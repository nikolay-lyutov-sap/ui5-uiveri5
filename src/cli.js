'use strict';

var argv = require('yargs').
    usage('Usage: visualtest [options] [confFile]\n' +
          'confFile defaults to conf.js if presented in current working directory.').
    string('libFilter').
    describe('libFilter', 'Comma separated list of lib suites to execute, defaults to all').
    string('specFilter').
    describe('specFilter', 'Comma separated list of specs to execute, defaults to all').
    string('baseUrl').
    describe('baseUrl', 'Base url to execute the spec against, defaults to http://localhost:8080').
    string('seleniumAddress').
    describe('seleniumAddress','Address of remote Selenium server, if missing will start local selenium server').
    string('browsers').
    describe('browsers', 'Comma separated list of browsers to execute tests, defaults to chrome').
    describe('params', 'Param object to be passed to the tests').
    count('verbose').
    alias('v', 'verbose').
    describe('verbose', 'Print debug logs').
    string('specs').
    describe('specs', 'Specs to execute, blob pattern used by localSpecResolver only').
    //string('take').
    boolean('take').default('take',undefined).
    //alias('t','take').
    describe('take', 'Take screenshots, default: true').
    //string('compare').
    boolean('compare').default('compare',undefined).
    //alias('c','compare').
    describe('compare', 'Compare actual to reference screenshots, default: true').
    //string('update').
    boolean('update').default('update',undefined).
    //alias('u','update').
    describe('update', 'Update reference screenshots with actual screenshots if differ, default false').
    strict().
    argv;
    //TODO profile argument
    //TODO params

var cliParser = require('./cliParser')();
var config = cliParser.parse(argv);

/*
// copy argv properties, no func, no prototype, no special members
var config = {};
for (var name in argv) {
  if (_.has(argv,name) && !_.isFunction(name) && !name.indexOf('$0')==0 && name!=='_') {
    config[name] = argv[name];
  }
}

// pass provided *.conf.js file
config.conf = argv._[0];

// conf file is not provided on command line => try loading conf.js from current dir
if (!config.conf) {
  var localConf = './conf.js';
  if (fs.existsSync(localConf)) {
    config.conf = localConf;
  }
}

// current dir conf is resolved against cwd()
if (config.conf){
  config.conf = path.resolve(config.conf);
}

// TODO research how dot notation works with duplicates ?
// resolve browsers argument
if (config.browsers){
  if(_.isString(config.browsers)){
    var browsers = config.browsers.split(',');
    config.browsers = [];
    browsers.forEach(function(browser){
      var confBrowser;
      if (browser.indexOf('{') !== -1){
        // JSON formatting found => parse it
        confBrowser = JSON.parse(browser);
      } else if (browser.indexOf(':') !== -1){
        // : separator found => split on them
        var browserParams = browser.split(':');
        confBrowser = {
          browserName: browserParams[0], // at least browser name should be available
          browserVersion: browserParams[1],
          platformName: browserParams[2],
          platformVersion: browserParams[3],
          platformResolution: browserParams[4],
          ui5: {
            theme: browserParams[5],
            direction: browserParams[6],
            mode: browserParams[7]
          }
          // capabilities could not be given in this notation
        }
      } else {
        // no formatting found => only browser name
        confBrowser = {
          browserName: browser
        };
      }
      config.browsers.push(confBrowser);
    });
  }
}
*/

// run the visualtest
require('./visualtest').run(config);
