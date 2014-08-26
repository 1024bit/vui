/**
 *  VUI's `validator` class
 *  
 *  Inspiration:
 *  Validator is not responsible for form submit
 *  Flexible and performance are some kind of paradox
 *  
 *  Discussion: 
 *  What's the merits and faults of all or only one error message is shown at a time?
 *  
 *  Usage: 
 *  Script >
 *  $(selector).validator({
 * 		fields: {
 *			field:  {
 *				name: '', placeholder: '', okMsg: '', ignore: '', 
 *				rule: [[/regexp/, 'Please input correct message'], 'match[lt, money]', 'length[6~16]', ['qq', '']]
 *			}
 *		}
 *  });
 *  HTML attribute >
 *  data-rule="{rule: [[/regexp/, 'Please input correct message'], 'match[lt, money]', 'length[6~16]', ['qq', '']]}"
 *   
 *  Event: validatesuccess, validateok, validateerror
 *
 *  Copyright(c) 2014 vip.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@vipshop.com>
 *  MIT Licensed
 */
define(function(require, exports) {
	var 
	$ = require('jquery'), 
	LANG = require('./i18n/{lang}');
	require('jquery.ui.widget');
	require('../vui.widget');
	
	$.widget('vui.validator', $.vui.widget, {
		options: {
			themes: {
				'default': {
					style: {
						errorMsg: '',
						placeholderMsg: '', 
						okMsg: '', 
						okInput: '',
						errorInput: ''
					}
				}
			}, 			
			rules: {}, 
			fields: {}, 
			pauseOnError: false, 
			defaultErrorMsg: LANG.DEFAULT_ERROR_MSG, 
			defaultOkMsg: ' ✔', 
			// `showTipsAsPlaceholer` and `showTips` are always exclusive
			// By default, tips is shown as placeholder
			showTipsAsPlaceholer: true, 
			// Show tips after the form elment
			showTips: false, 
			// Customize message's show-style, return a message object(jQuery or Other object)
			showMsg: undefined
		},  
		widgetEventPrefix: 'validate',
		// Add rule
		addRule: function() {},
		// Update rule
		setRule: function() {}, 
		delimiter: {
			eq: /\w+/,
			rg: /\d+\~\d+/,
			gt: /\w+\~/,
			lt: /\~\w+/,
			"2_eq": /\w+\s*\,\s*true/,
			"2_rg": /\d+\~\d+\s*\,\s*true/,
			"2_gt": /\w+\~\s*\,\s*true/, 
			"2_lt": /\~\w+\s*\,\s*true/
		}, 
		_createWidget: function(options, element) {
			if (!$.nodeName(element, 'form')) {
				return $.error("Only can initialize on form element");
			}		
			
			this._super.apply(this, arguments);
			
			var self = this, 
				// Retrieves a collection, in source order, of all controls in a given form			
				$elements = $(this.element.get(0).elements);
			
			this.element.attr('novalidate', 'novalidate');
			// Ignore disabled and hidden element
			$elements.not(':hidden').not(':disabled').each(function() {
				self.parseRule($(this));
			});		
		}, 
		_attachEvent: function() {
			var 
			self = this, 
			options = this.options, 
			which, shiftKey, evtmap = {};
			
			// When capture functional keys, the keyup event won't return the actual keycode
			evtmap['keydown'] = function(e) {
				which = e.which;
				shiftKey = e.shiftKey;
			};
			evtmap['validate'] 
			= evtmap['change input'] 
			= evtmap['change select'] 
			= evtmap['change textarea']
			= function(e) {
                var $target = $(e.target), rtr;
                this._exec($target);
                rtr = $target.metadata('rule').valid
                if (rtr === false) {
                    this.element.attr('validate', '');
                }
                return rtr;
			};
			evtmap['focusout input'] 
			= evtmap['focusout select'] 
			= evtmap['focusout textarea']
			= function(e) {
				var $elements, idx;
				if (which === 9) {
					which = undefined;
					$elements = $(this.element.get(0).elements).not(':hidden').not(':disabled').not(':button');
					idx = $.inArray(e.target, $elements);
					// Support shift+tab
					$elements.eq(shiftKey ? (idx - 1) : (idx + 1)).focus();
					shiftKey = undefined;
				}				
			};

			evtmap[this.widgetEventPrefix + 'error'] = function(e) {
				this.isDefaultPrevented = true;
			};			
			evtmap['submit'] = this.validate;
			evtmap['focusin input'] = function(e) {
				var $target = $(e.target), metadata = $target.metadata('rule');
				($target.val() === '' && (metadata.valid === undefined)) && this.showMsg(e, {type: 'placeholder', msg: ''});
			};
			
			this._on(true, evtmap);
		}, 
		validate: function() {
			this.element.attr('validate', '');
			this.isDefaultPrevented = false;
			var self = this, $elements = $(this.element.get(0).elements), 
					$elem, metadata, rtr;
			
			$elements.not(':hidden').not(':disabled').each(function() {
				$elem = $(this);
				// if (metadata.valid === true) return;
				return self._exec($elem);
				
			});
			rtr = !this.isDefaultPrevented;
			if (rtr === true) {
				if (!this._trigger('success')) {
					return !rtr; 
				}
				// Identify the form has been validated
				this.element.attr('validate', 'validate');
			}
			return rtr;			
		},
		parseRule: function($elem) {
			// Disable some browser's default validate
			$elem.attr('novalidate', 'novalidate');
			var self = this, name = $elem.attr('name'), 
				options = this.options, 
				option = options.fields[name], 
				metadata;
			
			// Pre-Process
			metadata = $elem.metadata('rule');
			
			if (option) {
				/*
				if ($.type(option.rule === 'function')) {
					fn = option.rule;
					option.rule = [];
					option.rule.push(function() {
						return fn.apply(self, [].slice.call(arguments, 0));
					});
				} 
				*/
				$.extend(metadata, option);
			}
			if (metadata.rule) {
				($.type(metadata.rule) === 'array') 
					? $.each(metadata.rule, function() { return self._parseRule.apply(self, $.makeArray(arguments).concat(metadata)); }) 
					: this._parseRule(null, metadata.rule, metadata);
				metadata.parsed = true;
			}		
		}, 
		_parseRule: function(idx, rule, metadata) {
			var self = this, error, args = [], fn, name, 
				options = this.options;

			if ($.type(rule) === 'array') {
				error = rule[1];
				rule = rule[0];
			}  
			if ($.type(rule) === 'string') {
				if (rule.search(/(\w+?)\[(.+?)\]/) !== -1) {
					// Get params
					$.each(RegExp.$2.split(','), function() {
						var subargs = String(this).split('~');
						if (subargs.length !== 1) {
							(subargs[0] === '') ? (subargs[0] = MIN_VALUE) : (subargs[1] = MAX_VALUE);
						}
						args = args.concat(subargs);
					});
					// Get
					$.each(self.delimiter, function(key) {
						name = RegExp.$1;
						if (this.test(RegExp.$2)) {
							// Function, Array and RegExp
							rule = options.rules[name][key] || options.rules[name];
							return false;
						}
					});

				} else {
					// Function, Array and RegExp
					rule = options.rules[rule];
				}					
			}
			
			if ($.type(rule) !== 'array') {
				// Function and RegExp
				rule = [rule];
			}
			// Copy, prevent from influncing all values
			rule = [].concat(rule);
			fn = rule[0];
			if ($.type(fn) === 'function') {
				rule[0] = function() {
					return fn.apply(self, [].slice.call(arguments, 0).concat(args));
				};
				rule[2] = args;
			}
			error && (rule[1] = error);
			// Two dimensional array
			(idx !== null) ? 
				metadata.rule[idx] = rule : 
				metadata.rule = [rule];			
		}, 
		_exec: function($elem) {
			var self = this,
				metadata = $elem.metadata('rule'), 
				rule, error, errortpl, 
				args, rtr, e;

			if (!metadata.parsed) self.parseRule($elem);
			if (!metadata.rule) return;		
			if (metadata.ignore) {
				metadata.valid = true;
				return;
			}
			metadata.name = metadata.name || $elem.prev('label').text() || $elem.closest('label').text();
			$.each(metadata.rule, function() {
				rule = this;
				switch ($.type(rule)) {
					case 'array': 
						args = rule[2];
						errortpl = rule[1];
						rule = rule[0];
						
					// Function and RegExp
					default:
						switch ($.type(rule)) {
							case 'regexp':
								error = !rule.test($elem.val());
								break;
							case 'function': 
								rtr = rule($elem);
								if ($.type(rtr) === 'string') {
									errortpl = rtr;
									error = true;
								} else {
									error = !rtr;
								}
								
								break;
						}	
						if (error) {
							e = $.Event('error', {target: $elem[0]});
							self._trigger(e);
							self.showMsg(e, {type: 'error', msg: self.sprintf((errortpl || self.options.defaultErrorMsg), [].concat(metadata.name, args))});
                            return false;
						}
						break;
				}
			});	
			
			if (error) {
				metadata.valid = false;
				if (self.options.pauseOnError) return false;
			} else {
				// Passed
				metadata.valid = true;
				e = $.Event('ok', {target: $elem[0]});
				self._trigger(e);
				self.showMsg(e, {type: 'ok', msg: (metadata.okMsg === undefined ? self.options.defaultOkMsg : metadata.okMsg)});
			}			
		}, 
		sprintf: function(format) {
			var start = 0, str = '', args = arguments[1], arg;
			while ((start = format.search(/\{(\d)\}/)) !== -1) {
				arg = args.shift() || '';
				str += format.slice(0, start) + arg;
				format = format.slice(start + RegExp['$&'].length);
			}
			
			return str + format;
		}, 
		showMsg: function(e, opts) {
			var 
			options = this.options, 
			style = options.themes[options.theme].style, 
			$target = $(e.target), metadata = $target.metadata('rule');
			
			$target.addClass(style[opts.type + 'Input']);
			$target.removeClass(opts.type === 'ok' ? style['errorInput'] : (opts.type === 'error' ? style['okInput'] : ''));			
			
			// Only can show one type message at the same time
			// metadata.$activeMsg also can be provided by third-party
			if (metadata.$activeMsg) {
				metadata.$activeMsg.hide();
			}
			if (this.options.showMsg) {
				metadata.$activeMsg = this.options.showMsg.apply(this, arguments);
				//if (metadata.$activeMsg) metadata.$activeMsg.show();
				return;
			}
			metadata.$activeMsg = this._showMsg(e, opts);
		}, 
		_showMsg: function(e, opts) {
			var options = this.options, 
				style = options.themes[options.theme].style, 
				clsmsg, 
				$target = $(e.target), $next;
							
			if (opts.type === 'placeholder' && this.options.showTipsAsPlaceholer) return;

			if (!opts.msg) 
				return;
			
			clsmsg = options.classPrefix + '-' + opts.type + '-msg';
			$next = $target.next('.' + clsmsg);
			($next.length) ? $next.html(opts.msg).show() : $target.after(($next = $('<span class="' + style[opts.type + 'Msg'] + ' ' + clsmsg + '">' + opts.msg + '</span>')));
			return $next;
		}, 
		hideMsg: function() {}, 
		_draw: function(models) {
			var options = this.options, 
				style = options.themes[options.theme].style, 
				$elements = $(this.element.get(0).elements), $this;
				
			if (this.options.showTipsAsPlaceholer) {
				$elements.each(function() {
					$this = $(this);
					// `placeholder` attr is applicable to those form elements: text, search, url, telephone, email and password
					if (!$this.is(':checkbox, :radio')) {
						$this.attr('placeholder', $this.metadata('rule').placeholder);
					}
				});
			} else if (this.options.showTips) {
				$elements.each(function() {
					$this = $(this);
					clsmsg = options.classPrefix + '-placeholder-msg';
					$next = $this.next(clsmsg);
					($next.length) ? $next.show() : $this.after('<span class="' + style.placeholderMsg + ' ' + clsmsg + '">' + $this.metadata('rule').placeholder + '</span>');
				});
			}
		}
	});	
});