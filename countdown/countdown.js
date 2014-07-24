/** 
 *  VUI's `countdown` class
 *  
 *  Usage: 
 * 	$(selector).countdown(options)
 *  
 *  Event:
 *  countdownstart(Global Event), coundownover, countdownstop(Global Event)
 *
 *  Copyright(c) 2014 vip.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@vip.com>
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
			// Reference date, is a timestamp
			refererDate: null, 
			// HTML attr name where the target date is stored to
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
				cls.timer[options.interval] = setInterval(function() {
					$.each(cls.instance[options.interval], function() {
						var timestamp = this.element.attr(this.options.attrName) - this.options.refererDate;
						if (!timestamp) {
							delete cls.instance[options.interval][this._uuid];
							this._trigger('over');
							if ($.isEmptyObject(cls.instance[options.interval])) {
								clearInterval(cls.timer[options.interval]);
								cls.timer[options.interval] = undefined;
								this._trigger('stop');
							}
						}						
						this.element.html(this.show(this.getDate(timestamp)));
					});
				}, options.interval);
			}		
		}
		/**
		 *  Get a timestamp's components
		 *  
		 *  function getDate(timestamp) {
		 *      var 
		 *       date = new Date(timestamp * 1000), // From the date of January 1, 1970
		 *       day = parseInt(timestamp / (24 * 3600)), 
		 *       hour = date.getHours(), 
		 *       minute = date.getMinutes(), 
		 *       second = date.getSeconds(), 
		 *       timezoneoffset = new Date().getTimezoneOffset() / 60;
		 *       
		 *       hour = hour + timezoneoffset;
		 *       if (hour < 0) hour += 24;
		 *
		 *       return {
		 *           day: day, 
		 *           hour: hour, 
		 *           minute: minute, 
		 *           second: second
		 *       };
		 *   }
		 *  
		 *  @param {Int} timestamp - in seconds
		 *  @return {Object} - {day: 12, hour: 12, minute: 12, second: 12}
		 */		
		getDate: function(timestamp) { 
			var 
			options = this.options, 
			clock = {
				day: 24 * 3600, 
				hour: 3600, 
				minute: 60, 
				second: 1
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
			time += clock.day + LANG.DAY;
			time += clock.hour + LANG.HOUR;
			time += clock.minute + LANG.MINUTE;
			time += clock.second + LAGN.SECONDS;
			return time;		
		}
	});
	// Timer
	$.vui.countdown.timer = {};
	// Instances
	$.vui.countdown.instance = {};
});