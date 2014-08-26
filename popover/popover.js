/** 
 *  VUI's `popover` class
 * 
 *  Usage: 
 *  $(selector).popover(options)
 *  
 *  Event:
 *  popready, popclose
 *
 *  Copyright(c) 2014 vip.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@vip.com>
 *  MIT Licensed 
 */
define(function(require, exports) {
	var 
	$ = require('jquery'), 
	util = require('../vui.util');
	require('jquery.ui.widget');
	require('../vui.widget');

	$.widget('vui.popover', $.vui.widget, {
		options: {
			event: 'click', //  click | hover | focus | manual
			themes: {
				'default': {
					style: {
						popOver: '',
						popTitle: '', 
						popContent: '', 
						popTop: '',
						popLeft: '',
						popBottom: '',
						popRight: '', 
						popArrow: '', 
						popTopArrow: '',
						popLeftArrow: '',
						popBottomArrow: '',
						popRightArrow: '',						
						popClose: ''
					}
				}
			}, 	
			placement: 'right', 
			title: '', 
			content: '', 
			// Delay disappear, ms
			delay: 0, 
			// Can close manully
			closable: false,
			// Whether only one instance can be show at the same time
			xor: false, 
			// Popover type, value is provided by the third party
			type: ''
			
		},  
		widgetEventPrefix: 'pop', 
		_create: function() {
			this._super.apply(this, arguments);
			this.show();
		}, 
		option: function() {
			if (this.options.optionChange) {
				this.$popover.remove();
			}			
			this._super.apply(this, arguments);
			return this;
		}, 		
		_attachEvent: function() {
			var self = this, 
				options = this.options, 	
				clsclose = this.options.classPrefix + '-close', 
				evtmap = {}, popevtmap = {};
			// Consider those:
			// 1. Window's size is changeable
			// 2. In Responsive Layout or Flow Layout, the element's size is changeable
			// So, the Position-Location is more stable than Ofsset-Location
			evtmap[options.event] = function(e) {
				this.show();
			};
			
			popevtmap['click .' + clsclose] = function(e) {
				if (this._trigger('close')) {
					this.hide();
				}
			}
			$.extend(popevtmap, {
				'mouseenter': function(e) {
					if (this.timer) {
						clearTimeout(this.timer);
						this.timer = null;
					}
				}, 
				'mouseleave': function(e) {
					options.delay && (this.timer = this._delay('hide', options.delay));
				}			
			});
			this._on(evtmap);
			this._on(this.$popover, popevtmap);
		}, 
		_draw: function(models) {
			var 
			options = this.options, 
			style = options.themes[options.theme].style, 
			clspfx = this.options.classPrefix,
			clsover = clspfx + '-over',
			clsarrow = clspfx + '-arrow', 
			clstitle = clspfx + '-title', 
			clscontent = clspfx + '-content', 
			clsclose = clspfx + '-close', 
			html = '<div class="' + clsover + ' ' + style.popOver + ' ' + options.type + ' ' + style['pop' + util.capitalize(options.placement)] + '">' 
			+ '<div class="' + clsarrow + ' ' + style.popArrow + ' ' + style['pop' + util.capitalize(options.placement) + 'Arrow'] + '"></div>' 
			+ (options.title ? '<h3 class="' + clstitle + ' ' + style.popTitle + '">' + options.title + '</h3>' : '') 
			+ '<div class="' + clscontent + ' ' + style.popContent + '">' + options.content + '</div>'
			+ (options.closable ? '<button type="button" class="' + clsclose + ' ' + style.popClose + '" aria-hidden="true">&times;</button>' : '') 
			+ '</div>';
			this.$popover = $(html).css({'position': 'absolute'}).hide().appendTo(this.element.parent());
		}, 
		show: function() {
			var 
			self = this, 
			options = this.options, 	
			clsarrow = this.options.classPrefix + '-arrow', 				
			$arrow, arwsz, docsz, tgtsz, popsz, arwofs, docofs, tgtofs, 
			margin, top, left, bottom, right, dist, popofs;
			
			// For hidden, free-size element
			this.$popover.show();
			if (options.xor) {
				$.each($[this.namespace][this.widgetName + 's'], function(k) {
					if (k !== self.id) 
						this.hide();
				});
			}	

			$arrow = this.$popover.find('.' + clsarrow);
			arwsz = {w: $arrow.outerWidth(), h: $arrow.outerHeight()};
			docsz = {w: this.document.width(), h: this.document.height()};
			tgtsz = {w: this.element.outerWidth(), h: this.element.outerHeight()};
			popsz = {w: this.$popover.outerWidth(), h: this.$popover.outerHeight()};
			arwofs = $arrow.position(); 
			docofs = {top: this.document.scrollTop(), left: this.document.scrollLeft()};		
			tgtofs = this.element.position();
			margin = {top: $arrow.outerHeight(true) - arwsz.h, left: $arrow.outerWidth(true) - arwsz.w};			
			
			switch (options.placement) {
				case 'top': 
					top = true;
				case 'bottom':
					bottom = true;
					left = tgtofs.left + (tgtsz.w / 2) - (popsz.w / 2);
					dist = arwofs.left + (arwsz.w / 2) + margin.left - (popsz.w / 2);
					popofs = {top: top ? (tgtofs.top - popsz.h) : (tgtofs.top + tgtsz.h), left: left - dist};
					break;
				case 'left':
					left = true;
				case 'right':
					right = true;
					top = tgtofs.top + (tgtsz.h / 2) - (popsz.h / 2);
					dist = arwofs.top + (arwsz.h / 2) + margin.top - (popsz.h / 2);
					popofs = {left: left ? (tgtofs.left - popsz.w) : (tgtofs.left + tgtsz.w), top: top - dist};
					break;
			}
			// Out of viewport
			//top && (popofs.top < docofs.top) && (popofs.top = tgtofs.top + tgtsz.h);
			//left && (popofs.left < docofs.left) && (popofs.left = tgtofs.left + $tgtsz.w);
			//right && (popofs.left + popsz.w > docofs.left + docsz.w) && (popofs.left = tgtofs.left - popsz.w);
			//bottom && (popofs.top + popsz.h > docofs.top + docsz.h) && (popofs.top = tgtofs.top - popsz.h);
			this.$popover.css(popofs);
			options.delay && (this.timer = this._delay('hide', options.delay));
			return this;
		},
		hide: function() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			this.$popover.remove();
			this.destroy();
			return this;
		}
	});
});