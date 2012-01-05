/*
 * Perfherder 0.2
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

;(function(document, window, start_time){

	'use strict';

	window._gaq = window._gaq || [];

	var start_time = start_time || (new Date()).getTime(),
		browserDetect;

	/* @group browser detect */
	
		browserDetect = {
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

		browserDetect.init();
	
	/* @end */

	/* @group perf ga */

		window.Perfherder = window.Perfherder || function(settings){
			for(var key in settings){
				this.log('Setting ' + key + ' to ' + settings[key]);
				this[key] = settings[key];
			}
			this.init();
		};
		
		Perfherder.prototype = {

			/* @group utility */
			
				init : function(){
					this.bindErrorTracking();
					setTimeout(this.proxy('window'), 500);
				},

				track_errors : true,

				track_window : true,

				debug : false,

				sample_rate : 1,

				marks : {},

				uri : window.location.href.replace(window.location.protocol + '//' + document.domain, ''),

				log : function(message){
					this.debug && window.console && console.log && console.log('PERFHERDER -- ' + message.toLowerCase());
				},

				proxy : function(method_name){
					var self = this;
					return function(argument){
						self[method_name].call(self, argument);
					}
				},

			/* @end */
			
			/* @group sending to GA */
			
				sendToGa : function(category, action, opt_label, opt_value){
					var parsed_args = this.parseArguments(arguments),
						should_send = Math.random() < this.sample_rate;
					 should_send || this.log('(skipping - sample rate is ' + this.sample_rate + ')');
					 should_send && _gaq.push(parsed_args);
				},

				parseArguments : function(args){
					var sliced_args = Array.prototype.slice.call(args);
					for(var i = 0; i < sliced_args.length; i++){
						sliced_args[i] = this.replaceBadCharacters(sliced_args[i]);
					}
					sliced_args.unshift('_trackEvent');
					return sliced_args;
				},

				replaceBadCharacters : function(string){
					if(string.replace){
						string = string.replace(/,/g, '\\,').
							replace(/"/g, '\\\"').
							replace(/'/g, '\\\'');
					}
					return string;
			},

			/* @end */
			
			/* @group perf */
			
				record : function(label, since){
					var current_time = new Date().getTime(),
						elapsed_time = current_time - (this.marks[since] || start_time),
						message = label + '" at ' + this.round(elapsed_time) + 's';
					if(since){
						message += ' since "' + since +'"';
					}
					this.sendToGa('Perf', label, 'All', elapsed_time);
					this.sendToGa('Perf By URI', label, this.uri, elapsed_time);
					this.sendToGa('Perf By Browser', label, this.getBrowser(), elapsed_time);
					this.log(message);
				},

				round : function(int){
					return Math.floor(int) / 1000;
				},

				mark : function(name){
					this.marks[name] = new Date().getTime();
					var message = 'Marking "' + name + '" at ' + this.round(this.marks[name] - start_time) + 's';
					this.log(message);
				},
			
			/* @end */
			
			/* @group errors */
			
				bindErrorTracking : function(){
					if(this.track_errors){
						this.log('Tracking errors');
						window.onerror = this.proxy('windowError');
					}
				},

				windowError : function(message, url, lineNumber){
					this.track_errors && this.error({
						message : message,
						lineNumber : lineNumber
					});
				},

				getErrorMessage : function(error){
					return error.message || error.description || '?';
				},

				error : function(error){
					window.console && console.log && console.log(error);
					var lineNumber = error.lineNumber || 0,
						fileName = (error.fileName) ? '\, ' + error.fileName : '';
					this.sendToGa('Error By Type', this.getErrorMessage(error), this.uri + fileName, lineNumber);
					this.sendToGa('Error By Browser', this.getBrowser(), this.uri + fileName, lineNumber);
					this.log('error: "' + this.getErrorMessage(error) + '" in ' + this.getBrowser() + ' on ' + this.uri + fileName + ' at line ' + lineNumber);
				},
			
			/* @end */

			/* @group browser */

				getBrowser : function(){
					return browserDetect.browser + ' ' + browserDetect.version;
				},

				window : function(){
					if(this.track_window){
						this.log('Tracking window dimensions...');
						this.trackWindowDimensions();
					} else {
						this.log('NOT tracking window dimensions');
					}
				},

				trackWindowDimensions : function(){
					var height = this.getIndividualDimension('Height'),
						width = this.getIndividualDimension('Width'),
						total = width * height;
					this.trackIndividualDimension('Total Pixels', total);
					this.trackIndividualDimension('Height', height);
					this.trackIndividualDimension('Width', width);
				},

				trackIndividualDimension : function(name, amount){
					this.log('window ' + name + ': ' + amount);
					this.sendToGa('Window', 'Dimension', name, amount);
				},

				getIndividualDimension : function(name){
					var dimensionKey = 'inner' + name,
						object = window;
					if(!(dimensionKey in window)){
						dimensionKey = 'client' + name;
						object = document.documentElement || document.body;
					}
					return object[dimensionKey];
				}
			
			/* @end */
			
		};

	/* @end */

})(document, window, _prf_start);
