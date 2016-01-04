
var functions = {};

functions.waitForAngular = function(rootSelector, callback) {
  var MAX_RETRY_ATTEMPTS = 10;

  try {
    if (!window.sap) {
      callback('SAPUI5 could not be found on the window');
    }

    var fnDefineTestCooperation = function() {

      jQuery.sap.declare('sap.ui.core.TestCooperation');

      sap.ui.define(['jquery.sap.global', 'sap/ui/base/Metadata'],
        function(jQuery, Metadata) {
        'use strict';

        var TestCooperation = Metadata.createClass('sap.ui.core.TestCooperation', {

          constructor : function(oCore) {

            this._bSameTick = false;
            this.iPendingXHRs = 0;
            this.iPendingTimeouts = 0;
            this.oPendingTimeoutIDs = {};
            this.oTimeoutInfo = {};
            this.aDoNotTrack = [];
            this.aPendingCallbacks = [];
            this.oCore = oCore;

            this._wrapSetTimeout();
            this._wrapClearTimeout();
            this._wrapXHR();

            this.oCore.attachUIUpdated(this._tryToExecuteCallbacks);
          }
        });

        // Constants for TestCooperation class
        TestCooperation.SCHEDULE_CALLBACKS_REG_EXP = /_scheduleCallbackExecution/;
        TestCooperation.MAX_TIMEOUT_DELAY = 5000;
        TestCooperation.MAX_INTERVAL_STEP = 2000;

        TestCooperation.prototype.notifyWhenStable = function(fnCallback) {

          if (this.iPendingTimeouts === 0 && this.iPendingXHRs === 0 && !this.oCore.getUIDirty() && this.aPendingCallbacks.length === 0) {
            fnCallback();
            this._logDebugMessage('Callback executed immediately:\n' + fnCallback.toString());
          } else {
            this.aPendingCallbacks.push(fnCallback);
            this._logDebugMessage('Callback scheduled for later:\n' + fnCallback.toString() + '\nPending callbacks: ' + this.aPendingCallbacks.length);
          }
        };

        TestCooperation.prototype._wrapSetTimeout = function() {
          var that = this,
            fnOriginalTimeout = window.setTimeout;
          window.setTimeout = function(func, delay) {
            var id;
            function wrapper() {
              func.apply();
              that._handleTimeoutFinished(id);
            }
            id = fnOriginalTimeout.call(this, wrapper, delay);
            that._handleTimeoutScheduled(id, func, delay);
            return id;
          };
        };

        TestCooperation.prototype._wrapClearTimeout = function() {
          var that = this,
            fnOriginalTimeout = window.clearTimeout;
          window.clearTimeout = function(id) {
            fnOriginalTimeout.call(this, id);
            that._handleTimeoutFinished(id);
          };
        };

        TestCooperation.prototype._wrapXHR = function() {
          var that = this,
            fnOriginalSend = window.XMLHttpRequest.prototype.send;
          window.XMLHttpRequest.prototype.send = function() {
            this.addEventListener('readystatechange', function() {
              if (this.readyState == 4 && this.isTracked) {
                that.iPendingXHRs--;
                that._logDebugMessage('XHR finished. Pending XHRs: ' + that.iPendingXHRs);
                that._tryToExecuteCallbacks();
              }
            });
            this.isTracked = true;
            that.iPendingXHRs++;
            that._logDebugMessage('XHR started. Pending XHRs: ' + that.iPendingXHRs);
            fnOriginalSend.apply(this, arguments);
          };
        };

        TestCooperation.prototype._handleTimeoutScheduled = function(id, func, delay) {
          delay = typeof delay == 'number' ? delay : 0;

          if (this._isTimeoutTracked(id, func, delay)) {
            this.oPendingTimeoutIDs[id] = 1;
            this.iPendingTimeouts++;
            this._logDebugMessage('Timeout scheduled. Pending timeouts: ' + this.iPendingTimeouts + ' Timer ID: ' + id + ' Delay: ' + delay + ' Callback: ' + func.toString());
          }
        };

        TestCooperation.prototype._handleTimeoutFinished = function(id) {
          if (this.aDoNotTrack.indexOf(id) == -1) {
            if (this.oPendingTimeoutIDs.hasOwnProperty(id)) {
              delete this.oPendingTimeoutIDs[id];
              this.iPendingTimeouts--;
              this._logDebugMessage('Timeout finished. Pending timeouts: ' + this.iPendingTimeouts + ' Timer ID: ' + id);
              this._tryToExecuteCallbacks();
            }
          }
        };

        TestCooperation.prototype._isTimeoutTracked = function(id, func, delay) {
          if ((delay === 0 && TestCooperation.SCHEDULE_CALLBACKS_REG_EXP.test(_getFunctionName(func))) || delay > TestCooperation.MAX_TIMEOUT_DELAY) {
            this.aDoNotTrack.push(id);
            return false;
          } else {
            var funcStr = func.toString();
            var delayStr = delay.toString();
            var bAddNewEntry = !this.oTimeoutInfo.hasOwnProperty(funcStr) || !this.oTimeoutInfo[funcStr].hasOwnProperty(delayStr) ||
                Date.now() - this.oTimeoutInfo[funcStr][delayStr]['lastCallTime'] > TestCooperation.MAX_INTERVAL_STEP;
            if (bAddNewEntry) {
              this.oTimeoutInfo[funcStr] = this.oTimeoutInfo[funcStr] || {};
              this.oTimeoutInfo[funcStr][delayStr] = {'callCount': 1, 'lastCallTime': Date.now()};
              return true;
            } else {
              this.oTimeoutInfo[funcStr][delayStr]['callCount']++;
              this.oTimeoutInfo[funcStr][delayStr]['lastCallTime'] = Date.now();
              if (this.oTimeoutInfo[funcStr][delayStr]['callCount'] <= 5) {
                return true;
              } else {
                this.aDoNotTrack.push(id);
                return false;
              }
            }
          }
        };

        TestCooperation.prototype._tryToExecuteCallbacks = function() {
          if (!this._bSameTick) {
            var that = this;
            this._bSameTick = true;
            window.setTimeout(function _scheduleCallbackExecution() {
              that._logDebugMessage('Scheduling callback execution with timeout 0, Pending callbacks: ' + that.aPendingCallbacks.length);
              if (that.iPendingTimeouts === 0 && that.iPendingXHRs === 0 && !that.oCore.getUIDirty() && that.aPendingCallbacks.length > 0) {
                do {
                  var fnCallback = that.aPendingCallbacks.shift();
                  fnCallback();
                  that._logDebugMessage('Pending callback executed: ' + fnCallback.toString() + '\nPending callbacks: ' + that.aPendingCallbacks.length);
                } while (that.iPendingTimeouts === 0 && that.iPendingXHRs === 0 && !that.oCore.getUIDirty() && that.aPendingCallbacks.length > 0)
              }
              that._bSameTick = false;
            }, 0);
          }
        };

        TestCooperation.prototype._logDebugMessage = function(message) {
          if (window.debug === true) {
            console.debug(message);
          }
        };

        function _getFunctionName(func) {
          var result;
          if (func.name && typeof func.name == 'string') {
            result = func.name;
          } else {
            var result = func.toString();
            result = result.substr('function'.length);
            result = result.substr(0, result.indexOf('('));
          }
          return result.trim();
        }

        return TestCooperation;

      }, /* bExport= */ true);
    };

    var tryToNotifyCallback = function(attempts) {
      if (sap.ui.TestCooperation) {
        try {
          sap.ui.TestCooperation.notifyWhenStable(callback);
        } catch (e) {
          callback('Unable to notify callback.\nError: ' + e.message);
        }
      } else if (sap.ui.core.TestCooperation) {
        try {
          sap.ui.getCore().registerPlugin({
            startPlugin: function(oCore) {
              sap.ui.TestCooperation = new sap.ui.core.TestCooperation({
                getUIDirty: oCore.getUIDirty.bind(oCore),
                attachUIUpdated: oCore.attachUIUpdated.bind(oCore)
              });
            }
          });
        } catch (e) {
          callback('Unable to instantiate TestCooperation.\nError: ' + e.message);
        }

        if(attempts < 1) {
          if (!sap.ui) {
            callback('SAPUI5 is not present');
          } else {
            callback('retries for notify callback exceeded');
          }
        } else {
          window.setTimeout(function() {tryToNotifyCallback(attempts - 1);}, 1000);
        }
      } else {
        try {
          if (sap.ui) {
            fnDefineTestCooperation();
          } else {
            window.setTimeout(function() {tryToNotifyCallback(attempts - 1);}, 1000);
          }
        } catch (e) {
          callback('Unable to inject TestCooperation.\nError: ' + e.message);
        }

        if(attempts < 1) {
          if (!sap.ui) {
            callback('SAPUI5 is not present');
          } else {
            callback('retries for notify callback exceeded');
          }
        } else {
          window.setTimeout(function() {tryToNotifyCallback(attempts - 1);}, 1000);
        }
      }
    };
    tryToNotifyCallback(MAX_RETRY_ATTEMPTS);
  } catch (err) {
    callback(err.message);
  }
};

/* Publish all the functions as strings to pass to WebDriver's
 * exec[Async]Script.  In addition, also include a script that will
 * install all the functions on window (for debugging.)
 *
 * We also wrap any exceptions thrown by a clientSideScripts function
 * that is not an instance of the Error type into an Error type.  If we
 * don't do so, then the resulting stack trace is completely unhelpful
 * and the exception message is just 'unknown error.'  These types of
 * exceptins are the common case for dart2js code.  This wrapping gives
 * us the Dart stack trace and exception message.
 */
var util = require('util');
var scriptsList = [];
var scriptFmt = (
'try { return (%s).apply(this, arguments); }\n' +
'catch(e) { throw (e instanceof Error) ? e : new Error(e); }');
for (var fnName in functions) {
  if (functions.hasOwnProperty(fnName)) {
    exports[fnName] = util.format(scriptFmt, functions[fnName]);
    scriptsList.push(util.format('%s: %s', fnName, functions[fnName]));
  }
}

exports.installInBrowser = (util.format(
  'window.clientSideScripts = {%s};', scriptsList.join(', ')));
