/*
 * Perfherder 0.1
 * JS perf and error catching with GA.
 * https://github.com/averyvery/perfherder
 *
 * Copyright 2011, Doug Avery
 * Dual licensed under the MIT and GPL licenses.
 * Uses the same license as jQuery, see:
 * http://jquery.org/license
 *
 * Uses parts from https://github.com/rsyring/browser-detect/blob/master/browser-detect.js
 */

;(function(document, window, perf_start_time){

	'use strict';

	/* @group browser detect */
	
		var BrowserDetect = {
			init: function () {
				this.browser = this.searchString(this.dataBrowser) || 'An unknown browser';
				this.version = this.searchVersion(navigator.userAgent)
					|| this.searchVersion(navigator.appVersion)
					|| 'an unknown version';
			},
			searchString: function (data) {
				for (var i=0;i<data.length;i++)	{
					var dataString = data[i].string;
					var dataProp = data[i].prop;
					this.versionSearchString = data[i].versionSearch || data[i].identity;
					if (dataString) {
						if (dataString.indexOf(data[i].subString) != -1)
							return data[i].identity;
					}
					else if (dataProp)
						return data[i].identity;
				}
			},
			searchVersion: function (dataString) {
				var index = dataString.indexOf(this.versionSearchString);
				if (index == -1) return;
				return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
			},
			dataBrowser: [
				{
					string: navigator.userAgent,
					subString: 'Chrome',
					identity: 'Chrome'
				},
				{
					string: navigator.vendor,
					subString: 'Apple',
					identity: 'Safari',
					versionSearch: 'Version'
				},
				{
					prop: window.opera,
					identity: 'Opera'
				},
				{
					string: navigator.userAgent,
					subString: 'Firefox',
					identity: 'Firefox'
				},
				{
					string: navigator.userAgent,
					subString: 'MSIE',
					identity: 'Explorer',
					versionSearch: 'MSIE'
				},
				{
					string: navigator.userAgent,
					subString: 'Gecko',
					identity: 'Mozilla',
					versionSearch: 'rv'
				}
			]
		};
		BrowserDetect.init();
	
	/* @end */

	/* @group perf ga */
		
		window._gaq = window._gaq || [];
		var perf_start_time = perf_start_time || (new Date()).getTime();

		var _p = {
			marks : {},
			uri : window.location.href.replace(window.location.protocol + '//' + document.domain, ''),
			log : function(message){
				window.console && console.log && console.log(' . ' + message);
			},
			round : function(int){
				return Math.floor(int) / 1000;
			
			},
			track : function(name, since){
				var current_time = new Date().getTime(),
					elapsed_time = current_time - (_p.marks[since] || perf_start_time),
					message = 'Tracking "' + name + '" at ' + _p.round(elapsed_time) + 's';
				if(since){
					message += ' since "' + since +'"';
				}
				_p.sendToGa(['_trackEvent', 'Perf By URI', name, _p.uri, elapsed_time])
				_p.sendToGa(['_trackEvent', 'Perf By Browser', name, _p.getBrowser(), elapsed_time])
				_p.log(message);
			},
			mark : function(name){
				_p.marks[name] = new Date().getTime();
				var message = 'Marking "' + name + '" at ' + _p.round(_p.marks[name] - perf_start_time) + 's';
				_p.log(message);
			},
			windowError : function(message, url, lineNumber){
				_p.error({
					message : message,
					lineNumber : lineNumber
				});
			},
			getBrowser : function(){
				return BrowserDetect.browser + ' ' + BrowserDetect.version;
			},
			getMessage : function(error){
				return error.message || error.description || '?';
			},
			error : function(error){
				window.console && console.log && console.log(error);
				var lineNumber = error.lineNumber || 0,
					fileName = (error.fileName) ? '\, ' + error.fileName : '';
				_p.sendToGa(['_trackEvent', 'Error By Type', _p.getMessage(error), _p.uri + fileName, lineNumber]);
				_p.sendToGa(['_trackEvent', 'Error By Browser', _p.getBrowser(), _p.uri + fileName, lineNumber]);
				_p.log('Tracking error: "' + _p.getMessage(error) + '" in ' + _p.getBrowser() + ' on ' + _p.uri + fileName + ' at line ' + lineNumber);
			},
			sendToGa : function(array){
				for(var i = 0; i < array.length; i++){
					array[i] = _p.replaceBadCharacters(array[i]);
				}
				_gaq.push(array);
			},
			replaceBadCharacters : function(string){
				if(string.replace){
					string = string.replace(/,/g, '\\,');
					string = string.replace(/"/g, '\\\"');
					string = string.replace(/'/g, '\\\'');
				}
				return string;
			},
			toggleErrorTracking : function(value){
				if(value === false){
					window.onerror = undefined;
					_p.log('No longer tracking errors');
				} else {
					window.onerror = _p.windowError;
					_p.log('Tracking errors');
				}
			},

		};

		// expose to window
		window._prf = _p.track;
		window._prf_mark = _p.mark;
		window._prf_error = _p.error;
		window._prf_trackerrors = _p.toggleErrorTracking;

	/* @end */

})(document, window, _prf_st);
