/** 
 *  VUI's `button` class
 *  
 *  Usage: 
 * 	$(selector).button(options)
 *  
 *  Event:
 *  buttonclick
 *
 *  Copyright(c) 2014 vip.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@vip.com>
 *  MIT Licensed 
 */
define(function(require, exports) {
	var 
	$ = require('jquery');
	require('jquery.ui.widget');
	require('../vui.widget');
	require('jquery.fn.dimension');
	
	$.widget('vui.button', $.vui.widget, {
		options: {
			themes: {
				'default': {
					style: {
						// Button
						button: '', 
						btnDisabled: '', 
						btnHover: '', 
						btnActive: '', 
						btnLoading: ''
					}
				}
			}, 
			// Button's disabled state
			disabled: false, 
			// Latency less than this value will not show loading state
			loadMsgDelay: 10, 
			// Click listener
			click: $.noop
		},  
		_createWidget: function(options, element) {
			// options.element must be jQuery object
			if (!$.nodeName((options && options.element && options.element[0]) || element, 'button')) {
				return $.error("Only can initialize on button element");
			}	
			this._super.apply(this, arguments)
		},
		_attachEvent: function() {
			var 
			options = this.options, 
			style = options.themes[options.theme].style, 
			clsbtn = options.classPrefix + '-button', 
			btnevtmap = {}, timer;
			
			btnevtmap['click'] = function(e) {
				if (e.target === e.target.button) { return; }
				var $el = $(e.target), evt;
				// Trigger events were bound at the raw btn
				evt = $.Event('click');
				$(e.target.button).trigger(evt);
				// Prevent the repeat click in `loadMsgDelay` ms
				options.disabled = true;
				timer = setTimeout(function() {
					$el.attr('aria-disabled', true);
					$el.addClass(style.btnLoading);
					$el.addClass(style.btnDisabled);
				}, options.loadMsgDelay);
				// Track simulated button and raw button's tasks
				$.when(evt.result, options.click.call(this, e)).always(function() {
					if (timer) {
						clearTimeout(timer);
						timer = undefined;
					}
					options.disabled = false;
					$el.removeAttr('aria-disabled');
					$el.removeClass(style.btnDisabled);
					$el.removeClass(style.btnLoading);						
				});

			};
			this._on(this.$button, btnevtmap);
		},
		_draw: function(models) {
			var 
            options = this.options, 
            style = options.themes[options.theme].style, 
			clspfx = options.classPrefix, 
			clsbtn = clspfx + '-button',			
			$btn = this.element, 
			css = {};
			
			this.$button = $btn.parent();
			options = $.extend({}, {disabled: $btn.prop('disabled')}, options);
		
			if (!$btn.attr('vui-enhanced')) {
				// New created button
				this.$button = $('<a class="' + clsbtn + ' ' + style.button + '">' + $btn.text() + '</a>');
				css = $btn.css([
					'position', 'display', 'float', 'top', 'left', 
					'margin-top', 'margin-right', 'margin-bottom', 'margin-left'
				]);
				this.$button.insertAfter($btn).append($btn.hide());
				css.width = this.$button.dimWidth($btn.outerWidth());
				css.height = this.$button.dimHeight($btn.outerHeight());
				this.$button.css(css);
				this.$button.css('line-height', this.$button.height() + 'px');
			
				$btn.attr('vui-enhanced', 'vui-enhanced');
				this.$button[0].button = $btn[0];
			} 

			this.$button.toggleClass(style.btnDisabled, options.disabled);
			$btn.prop('disabled', options.disabled);				
		}
	});		
});		