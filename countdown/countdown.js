/** 
 *  VUI's `countdown` class
 *  
 *  Usage: 
 * 	$(selector).countdown(options)
 *  
 *  Event:
 *  countstart(Global Event), countshow, countover, countstop(Global Event)
 *
 *  Copyright(c) 2014 xx.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@xx.com>
 *  MIT Licensed 
 */
define(function(require, exports) {
	var 
	$ = require('jquery'), 
	LANG = require('./i18n/{lang}');
	require('jquery.ui.widget');
	require('../vui.widget');

	$.widget('vui.countdown', $.vui.widget, {
		options: {
			prefix: 'count', 
			// Start date, is a timestamp
			startDate: undefined, 
			// End date, is a timestamp
			endDate: undefined, 
			// HTML attr name where the end date is stored to, is backup of `endDate`
			attrName: 'data-countdown', 
			// Show day or not
			showDay: true,
			// 0 -> 00
			leadingZero: false,
			// For customizing show format
			show: null, 
			// Default interval(ms)
			interval: 1000
		},  
		widgetEventPrefix: 'count',
		_create: function() {
			this._super.apply(this, arguments);
			
			// Initialize
			this._uuid = this.widgetName + '-' + this.uuid;
			this.countdown = 0;
			this.run();
		}, 
		run: function() {
			var 
			options = this.options, 
			cls = this.constructor;		
			
			if (!cls.instance[options.interval]) 
				cls.instance[options.interval] = {};
			cls.instance[options.interval][this._uuid] = this;
			
			if (!cls.timer[options.interval]) {
				this._trigger('start');
				_run();
				cls.timer[options.interval] = setInterval(_run, options.interval);
			}
			function _run() {
				$.each(cls.instance[options.interval], function() {
					this.countdown = this.countdown || ((this.options.endDate === undefined ? this.element.attr(this.options.attrName) : this.options.endDate) - this.options.startDate);
					this.countdown -= (options.interval / 1000);
					if (this.countdown < 0) this.countdown = 0;
					if (!this.countdown) {
						this.stop();
					}	
					this.element.html(this.show(this.getDate(this.countdown)));
					this._trigger('show');
				});
			}			
		},
		/**
		 *  Get a timestamp's components
		 *  
		 *  function getDate(timestamp) {
		 *      var 
		 *       date = new Date(timestamp * 1000), // From the date of January 1, 1970
		 *       day = parseInt(timestamp / (24 * 3600)), 
		 *       hour = date.getHours(), 
		 *       minute = date.getMinutes(), 
		 *       seconds = date.getSeconds(), 
		 *       timezoneoffset = new Date().getTimezoneOffset() / 60;
		 *       
		 *       hour = hour + timezoneoffset;
		 *       if (hour < 0) hour += 24;
		 *
		 *       return {
		 *           day: day, 
		 *           hour: hour, 
		 *           minute: minute, 
		 *           seconds: seconds
		 *       };
		 *   }
		 *  
		 *  @param {Int} timestamp - in seconds
		 *  @return {Object} - {day: 12, hour: 12, minute: 12, seconds: 12}
		 */		
		getDate: function(timestamp) { 
			var 
			options = this.options, 
			clock = {
				day: 24 * 3600, 
				hour: 3600, 
				minute: 60, 
				seconds: 1
			}, 
			unit, size;
			
			for (unit in clock) {
				size = clock[unit];
				clock[unit] = parseInt(timestamp / size);
				if (clock[unit] <= 9 && options.leadingZero) clock[unit] = '0' + clock[unit]; // leading zero
				timestamp -= clock[unit] * size;
			}
			//clock.day *= 1; // Ignore leading zero for day
			if (!options.showDay) delete clock.day;
			return clock;
		}, 
		show: function(clock) {
			var options = this.options;
			return $.isFunction(options.show) ? 
				options.show.call(this, clock) : 
				this._show(clock);
		}, 
		_show: function(clock) {
			var time = '';
			for (unit in clock) {
				time += clock[unit] + LANG[unit.toUpperCase()];
			}
			return time;		
		}, 
		stop: function() {
			var 
			options = this.options, 
			cls = this.constructor;
			
			delete cls.instance[options.interval][this._uuid];
			this._trigger('over');
			if ($.isEmptyObject(cls.instance[options.interval])) {
				clearInterval(cls.timer[options.interval]);
				delete cls.timer[options.interval];
				this._trigger('stop');
			}
		}, 
		resume: function() {
			this.constructor.instance[this.options.interval][this._uuid] = this;
		}, 
		destroy: function() {
			this.stop();
			this._super.apply(this, arguments);
		}
	});
	// Timer
	$.vui.countdown.timer = {};
	// Instances
	$.vui.countdown.instance = {};
});