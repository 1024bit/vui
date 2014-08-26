/**
 *  VUI's `watcher` class
 *
 *  Usage:
 * 	$(selector).watcher(options)
 *
 *  Event:
 *  watchactive watchdeactive
 *
 *  Copyright(c) 2014 xx.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@xx.com>
 *  MIT Licensed
 */
define(function(require, exports) {
	var
	$ = require('jquery');
	require('jquery.ui.widget');
	require('../vui.widget');
	require('jquery.fn.orientation');

	$.widget('vui.watcher', $.vui.widget, {
		options: {
			prefix: 'watch', 
			// The jQuery object is watched when scrolling
			watchlist: null, 
			// Default `ttb` for vertical scroll, set `ltr` for horizontal scroll
			dir: 'ttb', 
			// The scroll top offset for element to trigger watch event
			offset: 0
		},
		widgetEventPrefix: 'watch', 
		_createWidget: function(options, element) {
			this._super.apply(this, arguments);
			if (!this.options.offset) {
				this.options.offset = this.element.height() 
				+ parseFloat(this.element.css('paddingTop')) + parseFloat(this.element.css('paddingBottom'));
			}
		},
		_attachEvent: function () {
			var self = this, options = this.options, evtmap = {}, timer = 0;
			// High frequency events such as scroll can fire dozens of times per second, 
			// we can use setTimeout to rate-limiting the number of actual page updates
			evtmap['scroll'] = function (e) {
				if (timer) {
					clearTimeout(timer);
					timer = 0;
				}
				timer = setTimeout(function () {
					var cntr = self.element, offset;
					self.$watchlist.each(function () {
						var $this = $(this), attrname = options.classPrefix + '-active';
						if (!$this.aboveTheTop(cntr) || (this === self.element && ($this.scrollTop() >= options.offset))) {
							if (!$this.attr(attrname)) {
								$this.attr(attrname, 'active');
								self._trigger($.Event('active', {target: this}));
							}
						} else {
							if ($this.attr(attrname)) {
								$this.attr(attrname, '');
								self._trigger($.Event('deactive', {target: this}));
							}					
						}
					});
				}, 0);
			};

			this.on(evtmap);
		},
		_draw: function () {
			this.$watchlist = $(this.options.watchlist).add(this.element[0]);
		}
	});
});