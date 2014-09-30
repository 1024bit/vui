/**
 *  VUI's `form` class, for form beautify and form progressive enhancement
 *
 *  Inspiration:
 *  Form elements cut off from form that is not the meaning of existence
 *  Autocomplete's datasource: server, local
 *
 *  Usage:
 *    $(formselector).form(options)
 *    $(formselector).form('checkbox|radio|select', selector, settings)
 *    $(checkboxselector).checkbox(options), ...
 *    $(formselector).data('vui-form').checkbox(options), ...
 *
 *  Event:
 *	formautocomplete
 *
 *  Copyright(c) 2014 xx.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@xx.com>
 *  MIT Licensed
 */
define(function (require, exports) {
    var 
	$ = require('jquery'), 
	util = require('../vui.util');
    require('jquery.ui.widget');
    require('../vui.widget');
	require('jquery.fn.dimension');
    require('jquery.fn.nthsize');
    require('jquery.fn.guessposition');
    require('jquery.fn.scrollto');

    $.widget('vui.form', $.vui.widget, {
        options: {
            themes: {
                'default': {
                    style: {
						// Autocomplete
						autocomplete: '', autocompleteInput: '', autocompleteInputFocus: '', autocompleteItem: '', autocompleteItemHover: '', 
                        // Checkbox
                        checkbox: '', checkboxChecked: '', checkboxDisabled: '',
                        // Select
                        select: '', selectFocus: '', selectHover: '', selectOpen: '', selectClose: '',
                        selectInput: '', selectInputFocus: '', selectArrow: '', selectCombox: '',
                        selectOptionList: '', selectOption: '', selectOptionHover: '', selectOptionSelected: '', selectOptionDisabled: ''
                    }
                }
            }
        },
        _createWidget: function (options, element) {
            // options.element must be jQuery object
            if (!$.nodeName((options && options.element && options.element[0]) || element, 'form')) {
                return $.error("Only can initialize on form element");
            }
            this._super.apply(this, arguments)
        },
        _attachEvent: function () {
            var
                options = this.options, style = options.themes[options.theme].style,
                clspfx = options.classPrefix,
                clschkchk = clspfx + '-checkbox-checked',
				clsslt = clspfx + '-select', 
                clssltoptslt = clspfx + '-select-option-selected',
                clssltopthvr = clspfx + '-select-option-hover',
                clssltoptdbd = clspfx + '-select-option-disabled',
                clssltfcs = clspfx + '-select-focus',
                clssltiptfcs = clspfx + '-select-input-focus',
				clsauto = clspfx + '-autocomplete', 
				clsautoipt = clspfx + '-autocomplete-input', 
				clsautoiptfcs = clspfx + '-autocomplete-input-focus', 
				clsautoopthvr = clspfx + '-autocomplete-item-hover', 
				sltcbx = 'span.' + clspfx + '-checkbox',
                sltslt = 'div.' + clspfx + '-select',
				sltipt = 'input.' + clspfx + '-select-input', 
                sltarw = 'a.' + clspfx + '-select-arrow',
                sltopt = 'li.' + clspfx + '-select-option',
				sltoptslt = 'li.' + clspfx + '-select-option-selected', 
				autocpt = 'ul.' + clspfx + '-autocomplete',
				autoopt = 'li.' + clspfx + '-autocomplete-item', 
				autoopthvr = 'li.' + clspfx + '-autocomplete-item-hover', 
				autoipt = 'input.' + clspfx + '-autocomplete-input', 
				autofcs = 'input.' + clspfx + '-autocomplete-input-focus', 
				evtmap = {};

            /**
			 * Checkbox event
			 */
            evtmap['click ' + sltcbx] = function (e) {
                var $target = $(e.target);
                $target.toggleClass(style.checkboxChecked);
                $(e.target.checkbox).prop('checked', $target.hasClass(clschkchk));
            };

            /**
			 * Autocomplete event
			 */
			// The focus event is triggered before click event
			evtmap['focus ' + autocpt] = function (e) {
				var input = e.currentTarget.input;
				if (input.asyncBlur) {
                    clearTimeout(input.asyncBlur);
                    input.asyncBlur = undefined;
                }	
				if (input.asyncChange) {
					clearTimeout(input.asyncChange);
					input.asyncChange = undefined;
				}					
			};
			evtmap['click ' + autoopt] = function (e) {
				var 
				$autocomplete = $(e.target).closest(autocpt), 
				$input = $($autocomplete[0].input), $current = $(e.currentTarget), 
				oldval = $input.val(), newval = $current.text();
				
				$input[0].latestValue = '';
				$autocomplete.hide().css('zIndex', 'auto');
				if (oldval !== newval) {
					$input.val(newval).trigger('change', $current.attr('value'));
				}				
			};
			evtmap['mouseenter ' + autoopt] = evtmap['mouseleave ' + autoopt] = function (e) {
				var isenter = (e.type === 'mouseenter');
				if (isenter && $(e.currentTarget).parent().find(autoopthvr).length) return;
				$(e.currentTarget).toggleClass(clsautoopthvr + ' ' + style.autocompleteItemHover, isenter);			
			};
			// When the `autocomplete` is turn on then the second focus will trigger the `autocomplete` feature
			evtmap['click ' + autoipt] = function (e) {
				var $current = $(e.target), oneClickShow = ($current.attr('data-vui-input-oneclickshow') == 1);
				if (oneClickShow) {
					onAutocompleteKeyup.apply(this, arguments);
				} else {
					if ($current.hasClass(clsautoiptfcs)) {
						onAutocompleteKeyup.apply(this, arguments);
					} 				
				}
				// The focus event is underlying than click event
				// The Click event is a kind of virtual event
				$current.addClass(clsautoiptfcs + ' ' + style.autocompleteInputFocus);
			};	
			evtmap['keyup ' + autoipt] = onAutocompleteKeyup;
			evtmap['keydown ' + autoipt] = function(e) {
				var 
				self = this, which = e.which, upOrDownKey = (e.which === 38 || e.which === 40), upKey, 
				$autoipt = this.$(autofcs), $autocomplete = $autoipt.next(autocpt), $autoopthvr, $hover, 
				hvrcls = clsautoopthvr + ' ' + style.autocompleteItemHover, timer, text;
				
				if ($autocomplete.is(':hidden')) return;
				
				$autoipt[0].latestValue = $autoipt.val();
				
				if (upOrDownKey) {
					$autoopthvr = $autocomplete.find(autoopthvr);
					upKey = (e.which === 38);
					if ($autoopthvr.length) {
						$autoopthvr.removeClass(hvrcls);
						$hover = $autoopthvr[upKey ? 'prev' : 'next']();
						if (!$hover.length) {
							$hover = $($autocomplete[0][upKey ? 'lastChild' : 'firstChild']);
						}
						$hover.addClass(hvrcls);
					} else {
						$hover = $($autocomplete[0][upKey ? 'lastChild' : 'firstChild']);
						// Set a maximum to scroll to bottom
						// 违背常理的现象一定是假象
						$hover.addClass(hvrcls);
					}
					text = $hover.text();
					if (text !== $autoipt.val()) {
						$autoipt.val(text);
					
						$autocomplete.scrollTo($hover);

						// Input's text won't be selected if any key is pressed 
						timer = setTimeout(function () {
							clearTimeout(timer);
							timer = undefined;
							$autoipt.select();
							$autoipt[0].selection = true;
						}, 0);
					}
				} 
			};
			evtmap['focus ' + autoipt] = function (e) {
                if (e.currentTarget.asyncBlur) {
                    clearTimeout(e.currentTarget.asyncBlur);
                    e.currentTarget.asyncBlur = undefined;
                }				
			};
			evtmap['blur ' + autoipt] = function (e) {	
				var closureCurrentTarget = e.currentTarget; 
				e.currentTarget.asyncBlur = setTimeout(function () {
					var $autocomplete, $current = $(closureCurrentTarget);

					$current = $(closureCurrentTarget);
					$autocomplete = $current.next(autocpt);
					$current.removeClass(clsautoiptfcs + ' ' + style.autocompleteInputFocus);
					$current[0].latestValue = '';
					if ($current[0].selection) {
						$current[0].selection = false;
						$current.trigger('change');
					}
					$autocomplete.hide().css('zIndex', 'auto');

                    clearTimeout(closureCurrentTarget.asyncBlur);
                    closureCurrentTarget.asyncBlur = undefined;
                }, 0);			
			};
			function onAutocompleteKeyup(e) {
				var 
				self = this, $input = $(e.target), 
				leftButton = (e.which === 1), 
				// Ensure the event flow comes from autoipt's keydown
				functionKey = (!leftButton && ($input[0].latestValue !== undefined && ($input.val() === $input[0].latestValue))), 
				upOrDownKey = (e.which === 38 || e.which === 40);
				// Return false will prevent some default behavior maybe
				if (upOrDownKey || functionKey) return true;
				
				if (e.target.asyncAutocompleteKeyup) {
					clearTimeout(e.target.asyncAutocompleteKeyup);
					e.target.asyncAutocompleteKeyup = undefined;
				}
				
				// Anti frequency events
				e.target.asyncAutocompleteKeyup = setTimeout(function () {
					// May be u want to customize the autocomplete behavior
					if (self._trigger($.Event('autocomplete', {target: e.target}))) {
						var latestajax = e.target.latestAjax;
						// Always use the latest ajax
						if (latestajax && latestajax.state() === 'pending') latestajax.abort();
						// Prepare datalist timely
						$.Deferred(function(deferred) {
							var list = $input.data('list'), datalist;
							if ($.type(list) === 'string') {
								datalist = $('#' + list)[0].options; // Select or datalist's selector
							} else if (list.url) {
								e.target.latestAjax = $.ajax(list).done(function (data) { // ajaxOptions
									e.target.latestAjax = undefined;
									deferred.resolve(data);
								});
							} else { // options
								datalist = list;
							}
							if (datalist) {
								deferred.resolve(datalist);
							}
						}).done(function (datalist) {
							var 
							keyword = $input.val(), html = '', listsize = $input.attr('data-vui-input-listsize'), 
							len = 0, $autocomplete = $(e.target).next(autocpt);
							$.each(datalist, function () {
								if (!keyword || !this.text.toUpperCase().indexOf(keyword.toUpperCase())) {
									len++;
									html += util.tpl($input.attr('data-vui-input-listitemtpl'), this);
								}
							});
							$autocomplete.scrollTop(0);
							if (html) {
								$autocomplete[0].innerHTML = html;
								$autocomplete.css('zIndex', 100000).show().nthHeight(Math.min(len, listsize));
							} else {
								$autocomplete.hide();
							}
							$autocomplete.positionY($input);
						});
					}
				}, 0);			
			}			
			
			/**
			 * Select event
			 */
			evtmap['click ' + sltarw] = function (e) {
                toggle.apply(this, arguments);	
            };
			evtmap['click ' + sltipt] = function (e) {
				if (!$(e.target).hasClass(clsautoipt)) {
					toggle.apply(this, arguments);
				} else {
					onSelectKeyup.apply(this, arguments);
				}
			};
			evtmap['keyup ' + sltipt] = onSelectKeyup;

			evtmap['focus ' + sltipt] = evtmap['blur ' + sltipt] = function (e) {
				if (e.target.readOnly) return;
				var 
				isfocusin = (e.type === 'focusin'), 
				$input = $(e.target), select = $input.closest(sltslt)[0].select, $select = $(select), 
				style = options.themes[$select.attr('data-vui-select-theme')].style,
				text = $input.val(); 
								
				$input.toggleClass(clssltiptfcs + ' ' + style.selectInputFocus, isfocusin);

				// Support 'placeholder-like' behavior for select
				if (select.selectedIndex === 0 
					&& ($(select.options[0]).attr('value') === undefined || $select.val() === '') 
					&& (text === select.options[0].text || text === '')) {
					$input.val(isfocusin ? '' : select.value);
				}
			};	
			evtmap['change ' + sltipt] = function (e, value) {
				e.target.asyncChange = setTimeout(function () {
					var 
					$input = $(e.target), $element = $input.closest(sltslt), 
					text = $input.val(), select = $element[0].select, 
					$select = $(select), $optionlist = $($element[0].optionlist), 
					style = options.themes[$select.attr('data-vui-select-theme')].style, 
					sltoptcls = style.selectOptionSelected + ' ' + clssltoptslt;
					
					if (value !== undefined) {
						$select.val(value);
					} else {
						$.each(select.options, function () {
							if (this.text === text) {
								this.selected = true;
								return false;
							}
						});
					}
					if (~select.selectedIndex && select.options[select.selectedIndex].text !== text) {
						$select.val('');
					}
					$optionlist.find('li.' + clssltoptslt).removeClass(sltoptcls);
					$optionlist.find('li[value=' + $select.val() + ']').addClass(sltoptcls);
					$select.trigger('change');
				}, 0);
			};
			evtmap['mouseenter ' + sltopt] = evtmap['mouseleave ' + sltopt] = function (e) {
				var 
				$current = $(e.currentTarget), 
				style = options.themes[$($current.closest(sltslt)[0].select).attr('data-vui-select-theme')].style;
				$(e.currentTarget).toggleClass(clssltopthvr + ' ' + style.selectOptionHover, e.type === 'mouseenter');
			};
            evtmap['click ' + sltopt] = function (e) {
				if ($(e.currentTarget).hasClass(clssltoptdbd)) return;
                var
                    element = $(e.target).closest(sltslt)[0],
                    $input = $(element.input), $current = $(e.currentTarget), $optionlist = $(element.optionlist),
                    style = options.themes[$(element.select).attr('data-vui-select-theme')].style,
                    oldval = element.select.value, newval = $current.attr('value'),
                    sltoptcls = style.selectOptionSelected + ' ' + clssltoptslt;

                $optionlist.hide().css('zIndex', 'auto');
                $(element).addClass(style.selectClose).removeClass(style.selectOpen);
                $(e.target).trigger('blur' + this.eventNamespace);

                if (oldval !== newval) {
                    $input.val($current.text());
					$optionlist.find('li.' + clssltoptslt).removeClass(sltoptcls);
                    $current.addClass(sltoptcls);
                    $(element.select).val(newval).trigger('change');
                }
            };
            evtmap['mouseenter ' + sltslt] = evtmap['mouseleave ' + sltslt] = function (e) {
				var style = options.themes[$(e.currentTarget.select).attr('data-vui-select-theme')].style;
                $(e.currentTarget).toggleClass(style.selectHover, e.type === 'mouseenter');
            };
            evtmap['focus ' + sltslt] = function (e) {
                if (e.currentTarget.asyncBlur) {
                    clearTimeout(e.currentTarget.asyncBlur);
                    e.currentTarget.asyncBlur = undefined;
                }

                if (!$(e.currentTarget).hasClass(clssltfcs)) this.select2(e.currentTarget.select, 'focus');
			};

            evtmap['blur ' + sltslt] = function (e) {
				var self = this, closureCurrentTarget = e.currentTarget; // 在一个事件流中, 全程共享同一事件对象
                // Async, Anti-Flicker
				// 浏览器中的js是单线程的, 没有并行执行能力; 而异步编程, 本质上属于流程控制
				// 在一个事件流中, 异步流在整个事件流最末端执行
				e.currentTarget.asyncBlur = setTimeout(function () {
					self.select2(closureCurrentTarget.select, 'blur');
					$(closureCurrentTarget.optionlist).css('zIndex', 'auto');
					
                    clearTimeout(closureCurrentTarget.asyncBlur);
                    closureCurrentTarget.asyncBlur = undefined;
                }, 0);
				
            };
			function onSelectKeyup (e) {
				if (e.result === undefined) {
					if (e.target.asyncSelectKeyup) {
						clearTimeout(e.target.asyncSelectKeyup);
						e.target.asyncSelectKeyup = undefined;
					}
					e.target.asyncSelectKeyup = setTimeout(function () {
						toggle.apply(this, [e, true]);
					}, 0);
				}			
			}	
			function toggle(e, hide) {
				var 
				$element = $(e.target).closest(sltslt),
				$input = $($element[0].input), 
				$select = $($element[0].select), 
				$optionlist = $($element[0].optionlist), $optselected, 
				style = options.themes[$select.attr('data-vui-select-theme')].style,
				len = $element[0].select.options.length;

                if ($optionlist.is(':visible')) {
                    $optionlist
                        .hide()
                        .css('zIndex', 'auto');
                    $element.addClass(style.selectClose).removeClass(style.selectOpen);
                    return;
                }
							
				if (hide) return;
				
                // Large value enough to mask everything else
                $optionlist.css('zIndex', 100000).show();
                
                $element.addClass(style.selectOpen).removeClass(style.selectClose);
                // Calc height timely
				$optselected = $optionlist.find(sltoptslt);

				$optionlist.scrollTop(0)
					.nthHeight(Math.min(len, $select.attr('data-vui-select-maxsize')))
					.positionY($input);
				if ($optselected.length) {
					$optionlist.scrollTop($optselected.position().top + $optselected.outerHeight() - parseFloat($optionlist.css('height')));
				}
				e.preventDefault();				
			}			

            this._on(evtmap);
            this.on('option.add option.remove', sltslt, function (e, settings) {
                // do something
            });
			
			this._super.apply(this, arguments);
        },
        _draw: function (models) {
			var self = this;
			$.each('select input'.split(' '), function (i, nodeType) {
				var selector = nodeType;
				if (nodeType === 'input') selector += '[type=text]';
				self.$(selector + ':not([data-vui-' + nodeType + '-enhanced])')
                .not(':hidden')
                .filter(function () {
					var pass = true;
					if ($.nodeName(this, 'input')) pass = (this.readOnly !== true);
                    pass = pass && ($(this).css('visibility') !== 'hidden');
					return pass;
                })[nodeType + '2']();		
			});
            
        },

        // Checkbox
        // settings: {checked: false, disabled: false}
        checkbox2: function (selector, settings) {
            var
                self = this,
                options = this.options,
                style = options.themes[options.theme].style,
                clspfx = this.namespace + '-' + options.prefix,
                clschkbx = clspfx + '-checkbox',
                $checkbox = !(selector instanceof $) ? $(selector) : selector,
                $element = null;
            $checkbox.each(function () {
                var $this = $(this);
                if (!$.nodeName($this[0], 'input') || !$this.is('[type=checkbox]')) return;

                $element = $this.parent();
                settings = $.extend({}, {disabled: $this.prop('disabled'), checked: $this.prop('checked')}, settings);

                if (!$this.attr('data-vui-checkbox-enhanced')) {
					$this.attr('data-vui-checkbox-enhanced', 'enhanced');
                    // New created checkbox
                    $element = $('<span class="' + clschkbx + ' ' + style.checkbox + '"/>');
                    $element.insertAfter($this).append($this.hide());
                    $element[0].checkbox = $this[0];
                }

                $element.toggleClass(style.checkboxDisabled, settings.disabled);
                $this.prop('disabled', settings.disabled);
                $element.toggleClass(style.checkboxChecked, settings.checked);
                $this.prop('checked', settings.checked);
            });
        },

        /**
         * Simulate select
         *
         * @param {Object} settings: {
		 *      // Priority is greater than the form's theme
		 *  	theme: '', 
		 *	    // Datasource
		 *      data: ajaxOptions || [{
		 *			text: '', 
		 *			value: '', 
		 *			selected: false
		 *		}], 
		 *      // Read or write selected index
		 *		selectedIndex: number, 
		 *      // Read or write disabled prop
		 *		disabled: Boolean, 
		 *		autocomplete: 'off', 
		 *      // Read or write multiple prop
		 *		multiple: Boolean, 
		 *      // Whether editable or not
		 *		combox: Boolean,
		 *  	// Use `maxSize` as stead if the size isn't been set
		 *  	maxSize: number, 
		 *      // Move the select's name to input or not
		 *      useValue: 'value', 
		 *      // Select2's id
		 *		for: id, 
		 *  	autofocus: Boolean
		 *	}
         * @method {Function} add, blur, focus, remove
         * @event {Event} option.add, option.remove
         * @return {Form}
         */
        select2: function (selector, settings) {
            var
                self = this,
                defaults = settings,
                options = this.options,
                clspfx = options.classPrefix,
                clsslt = clspfx + '-select',
                clscbx = clspfx + '-select-combox',
                clsipt = clspfx + '-select-input',
                clsarw = clspfx + '-select-arrow',
                clslst = clspfx + '-select-option-list',
                clsopt = clspfx + '-select-option',
                clsoptslt = clspfx + '-select-option-selected',
                clsoptdbd = clspfx + '-select-option-disabled',
                $select = !(selector instanceof $) ? $(selector) : selector,
                implementing = {'add': 'add', 'remove': 'remove', 'focus': 'focus', 'blur': 'blur', 'filter': 'filter'},
                method, args, RE_QUOT = /"/g;
            // Method
            
			if ($.type(settings) === 'string') {
                if (!(settings in implementing)) {
                    return $.error('Method ' + settings + ' is not supported');
                }
                method = settings;
                args = [].slice.call(arguments, 2);
            }

            $select.each(function () {
				if (!$.nodeName(this, 'select')) return;
				
                var
                    _defaults,
                    htmllist = '',
                    selectedText = [],
                    supportedMethods = {'add': add, 'remove': remove, 'focus': focus, 'blur': blur},
                    $this = $(this), $element, $combox, $optionlist, $input,
                    theme = ('object' === typeof defaults && defaults.theme) || $this.attr('data-vui-select-theme') || options.theme,
                    style = options.themes[theme].style,
                    sltoptcls = style.selectOptionSelected + ' ' + clsoptslt,
                    dbdoptcls = style.selectOptionDisabled + ' ' + clsoptdbd,
                    dim, pos, css,
                    delimiter = ', ',
                    select = $this.get(0);

                if (!method) {
					if (defaults && ('array' === $.type(defaults.data))) {
						_defaults = defaults;
						select.innerHTML = '';
						$.each(_defaults.data, function (idx) {
							select.add($('<option />').text(this.text).val(this.value).prop('selected', !!this.selected).get(0), select.options[idx]);
						});
						if (select.selectedIndex < 0) {
							select.options[0].selected = true;
						}
						delete _defaults.data;
					}
					settings = $.extend({
						useValue: 'value', 
						autocomplete: 'off', 
						maxSize: 10 // chrome: 20, ie: 30
					}, {
						// attributes(html5 && html4)
						// form(html5 attribute)(Non-Option)
						autofocus: $this.attr('autofocus'),
						autocomplete: $this.attr('autocomplete'),
						"for": $this.attr('data-vui-select-for'), 
						useValue: $this.attr('data-vui-select-usevalue'), 
						combox: $this.attr('data-vui-select-combox'), 
						maxSize: $this.attr('data-vui-select-maxsize'), 
						data: select.options.length ? select.options : $this.attr('data-vui-select-data'),
						disabled: select.disabled,
						multiple: select.multiple,
						tabIndex: select.tabIndex
					}, _defaults || defaults);
					// There have two error types order by service targets corresponds to user and developer respectively
					if (!settings.maxSize) {
						throw 'Size cannot be zero.';
					}
					
					$this.attr('data-vui-select-theme', theme);
					$this.attr('data-vui-select-usevalue', settings.useValue);
					$this.attr('data-vui-select-combox', settings.combox);
					$this.attr('data-vui-select-for', settings["for"]);
					$this.attr('data-vui-select-maxsize', settings.maxSize);
					if ($this.attr('data-vui-select-enhanced')) {
						$this.prev('.' + clsslt).remove();
						$this.removeAttr('data-vui-select-enhanced').show();
					}
                }

				if (!$this.attr('data-vui-select-enhanced')) {
					$this.attr('data-vui-select-enhanced', 'enhanced');
					
                    // Get the raw select's layout info
                    css = $this.css(['display', 'float', 'top', 'left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left']);

                    // New created select
                    $element = $('<div tabindex="' + settings.tabIndex + '" class="' + clsslt + ' ' + style.select + ' ' + (settings.multiple ? style.selectOpen : style.selectClose) + '"/>');
					if (settings["for"]) $element.attr('id', settings["for"]);
                    $element.insertBefore($this.hide());

                    $combox = $('<div style="position:relative;" class="' + clscbx + ' ' + style.selectCombox + '"/>');
                    $input = $('<input style="position:absolute;left:0;top:0;" type="text" class="' + style.selectInput + ' ' + clsipt + '" ' + (settings.combox ? '' : 'readonly ') + '/>').appendTo($combox);
					// Set tabindex to value less than zero will make the element focusable but escape from TAB navigation
                    $arrow = $('<a tabindex="-1" style="position:absolute;top:0;right:0;" href="javascript:;" class="' + clsarw + ' ' + style.selectArrow + '"/>').appendTo($combox);
                    $element.append($combox);

                    $optionlist = $('<ul class="' + style.selectOptionList + ' ' + clslst + '"/>').css({"position": "absolute", "left": 0, "overflow": "auto"});
                    if ($.type(settings.data) === 'string') {
                        /*
                         $.ajax({
                         url: settings.data
                         }).done(function(data) {
                         // Two scenes: 1. select don't data attribute; 2. Set settings.data to override select.options
                         $.each(data, function() {
                         select.add($('<option />').text(option.text).val(option.value).get(0), this.options[index]);
                         });
                         settings.data = select.options;
                         });
                         */
                    }
                    settings.data = settings.data || [];
                    $.each(settings.data, function (idx) {
                        if (this.selected) {
                            selectedText.push(this.text);
                        }
                        htmllist += _createOption(this);
                    });
                    $input.val(selectedText.join(delimiter));

                    dim = {width: $this.outerWidth(), height: $this.outerHeight()};
                    $element.css(css);
                    $element
                        .dimWidth(dim.width)
                        .dimHeight(dim.height);

                    pos = $this.css('position');
                    $element.css({'position': (!~('relative, absolute, fixed'.indexOf(pos)) ? 'relative' : pos)})
                    $element.css('line-height', $element.height() + 'px');
                    // $combox relative to $element
                    // Since $combox is relative, use $element's content height
                    $combox.dimHeight($element.height());
                    // $arrow relative to $combox
                    // Since $arrow is absolute, use $combox's visual height
                    //$arrow.css({height: css.height, width: 17});
                    $arrow.dimHeight($combox.outerHeight());
                    // $input is same as $arrow
                    // NB: input element's box-sizing behaviour is border-box like
                    $input
                        .dimWidth(
                            $combox.outerWidth() // Because $combox is absolute
                            - $arrow.outerWidth(true)
                            //- parseFloat($input.css('paddingLeft'))
                            //- parseFloat($input.css('paddingRight'))
                    )
						.dimHeight(
                            $combox.outerHeight()
                            //- parseFloat($input.css('paddingTop'))
                            //- parseFloat($input.css('paddingBottom'))
                    );
					if (settings.autocomplete === 'on') {
						$input.attr('autocomplete', 'on').attr('data-vui-input-oneclickshow', 1);
						$input.input2({list: select.options, listWidth: dim.width});
					}
					if (settings.useValue === 'text') {
						$input[0].name = select.name;
						$this.removeAttr('name');
					}

					$element.append($optionlist.append(htmllist));

                    $optionlist
                        .dimWidth(dim.width)
                        // An element is said to be positioned if it has a CSS position attribute of relative, absolute, or fixed.
                        //.nthHeight(Math.min(settings.data.length, settings.size))
                        .hide();

                    if (settings.disabled) {
                        // <IE8 don't support bottom and right position
                        $mask = $('<div style="position:absolute;left:0;top:0;width:100%;height:100%;"/>').appendTo($element);
                    }

                    if (settings.autofocus) focus();

                    $element[0].select = select;
                    $element[0].input = $input[0];
                    $element[0].optionlist = $optionlist[0];
                    settings.disabled && $this.attr('disabled', 'disabled');
                    settings.multiple && $this.attr('multiple', 'multiple');
                    settings.autofocus && $this.attr('autofocus', 'autofocus');
                } else {
                    $element = $this.prev('.' + clsslt);
                    $combox = $element.find('.' + clscbx);
                    $optionlist = $element.find('.' + clslst);
                    $input = $element.find('.' + clsipt);
                }

                if (method) {
                    supportedMethods[method].apply(select, args);
                }

                // Method
				function _createOption(option) {
                    var attrs = '', cls = '';
                    if ($.type(option) !== 'object') return '';
                    if (option.attributes) {
                        $.each(option.attributes, function () {
                            var value = (this.value || this.nodeValue);
                            if (this.nodeName === 'class') cls = value;
                            attrs += ' ' + this.nodeName + '="' + value.replace(RE_QUOT, '') + '"';
                        });
                    }
                    return '<li class="' + cls + ' ' + (option.selected ? sltoptcls : '') + ' ' + (option.disabled ? dbdoptcls : '') + ' ' + style.selectOption + ' ' + clsopt + '"' + attrs + '><a href="javascript:return false;">' + (settings.multiple ? ('<label><input type="checkbox" />' + option.text + '</label>') : option.text) + '</a></li>';
                }

                // Add an option, index from zero, compatible with negative
                function add(option, index) {
                    if (!this.options.length) option.selected = true;
                    var len = this.options.length || 0, selectedText = [], selectedIndex;
                    if (index < 0) {
                        index = Math.max(index + len + 1, 0);
                    }
                    index = Math.min(index, len);
                    index
                        ? $optionlist.find('li:nth-child(' + index + ')').after(_createOption(option))
                        : $optionlist.prepend(_createOption(option));
                    // May be -1
                    selectedIndex = this.selectedIndex;
                    this.add($('<option />').text(option.text).val(option.value).prop('selected', !!option.selected).get(0), this.options[index]);
                    if (option.selected) {
                        if (!settings.multiple) {
                            $optionlist.find('li:nth-child(' + (selectedIndex + 1) + ')').removeClass(sltoptcls);
                        }
                        $.each(this.options, function () {
                            if (this.selected) {
                                selectedText.push(this.text);
                            }
                        });
                        $input.val(selectedText.join(delimiter));
                    }
                    $element.trigger('option.add', settings);
                    // $(this).trigger('option.add' + self.eventNamespace, settings);
                }

                // Delete an option
                // selectObject.remove(index): if the specified index less than zero or greater than or equiv to the options's length, invoke remove will do nothing
                function remove(index) { 
                    if (!this.options.length) return;
                    var len = this.options.length - 1, option, selectedText = [];
                    if (index < 0) {
                        index = Math.max(index + len + 1, 0);
                    }
                    index = Math.min(index, len);
                    option = this.options[index];
                    $optionlist.find('li:nth-child(' + (index + 1) + ')').remove();

                    this.remove(index);

                    if (option.selected) {
                        if (!settings.multiple) {
                            $optionlist.find('li:first').addClass(sltoptcls);
                            this.options.length && (this.options[0].selected = true);
                        }
                        $.each(this.options, function () {
                            if (this.selected) {
                                selectedText.push(this.text);
                            }
                        });
                        $input.val(selectedText.join(delimiter));
                    }

                    $element.trigger('option.remove', settings);
                }

                // focus
                // IE7及以上版本, 现代浏览器激活到页面所在视窗(或标签)会重新定位光标, 从而触发focus动作
                // 不同浏览器对"激活"的定义不同(最小化与最大化, 标签切换, alert弹出框等)
                function focus() {
					$element.addClass(style.selectFocus);
                    // To run an hidden element's focus event handlers:
                    // 1.$(this).focus() vs. 2.$(this).trigger('focus') vs. 3.$(this).triggerHandler('focus')
                    // IE6 support 1, 2, 3; others support 3
                    // focus event don't bubble in all browsers, delegate focusin event to complete this
                    $(this).triggerHandler('focus');
                }

                // blur
                function blur() {
                    $element.removeClass(style.selectFocus + ' ' + style.selectOpen);
                    $element.addClass(style.selectClose);
                    $optionlist.hide();
                    $(this).triggerHandler('blur');
                }
            });
        },
		/**
		 * Supported types: range calendar search color
		 *
         * @param {Object} settings: {
		 *      // Support autocomplete feature for input
		 *      autocomplete: 'off', 
		 *		// Just click one time then show autocomplete list, default 2 times
		 *      oneClickShow: 2, 
		 *  	listItemTpl: '', 
		 *      listSize: Number,
		 *  	listWidth: Number, 
		 *  	placeholder: '', 
		 *  	autofocus: Boolean, 
		 *  	list: ajaxOptions || [{
		 *			text: ''
		 *		}] || id
		 *	}
         * @return {Form}
         */		
        input2: function (selector, settings) {
			var 
			self = this, 
			options = this.options, style = options.themes[options.theme].style,
			clsauto = options.classPrefix + '-autocomplete',
			clsautoipt = options.classPrefix + '-autocomplete-input',
			clsautoitem = options.classPrefix + '-autocomplete-item',
			defaults = settings, 
			$input = !(selector instanceof $) ? $(selector) : selector;

			$input.each(function () {
				if (!$.nodeName(this, 'input')) return;
				var $this = $(this), $autocomplete, input = this, html = '';
				
                settings = $.extend({
					autocomplete: 'off', 
					oneClickShow: 2, 
					list: [], 
					listSize: 10, 
					listItemTpl: '<li class="' + clsautoitem + ' ' + style.autocompleteItem + '" value="<%=value%>"><a href="javascript:return false;"><%=text%></a></li>'
                }, {
                    autofocus: $this.attr('autofocus'),
					placeholder: $this.attr('placeholder'), 
					autocomplete: $this.attr('autocomplete'), 
					list: $this.attr('list'), // Only support id, use js to set ajaxOpts or option array
					listSize: $this.attr('data-vui-input-listsize'), 
					listItemTpl: $this.attr('data-vui-input-listitemtpl'), 
					oneClickShow: $this.attr('data-vui-input-oneclickshow')
                }, defaults);
				
				if ($this.attr('data-vui-input-enhanced')) {
                    $this.removeAttr('data-vui-input-enhanced');
                }

                if (!$this.attr('data-vui-input-enhanced')) {
					$this.attr('data-vui-input-enhanced', 'enhanced');
					settings.autofocus && $this.attr('autofocus', 'autofocus');
					$this
                        .attr('data-vui-input-listsize', settings.listSize)
                        .attr('data-vui-input-listitemtpl', settings.listItemTpl)
						.attr('data-vui-input-oneclickshow', settings.oneClickShow)
						.attr('autocomplete', settings.autocomplete)
                        .attr('placeholder', settings.placeholder)
                        .data('list', settings.list);
						
					if (settings.autofocus && !input.autofocus) input.focus();
					if (settings.autocomplete !== 'off') {
						// Turn off the raw html5 `autocomplete` feature which will influence style
						$this.attr('autocomplete', 'off').addClass(clsautoipt + ' ' + style.autocompleteInput);
						html += '<ul tabindex="-1" class="' + clsauto + ' ' + style.autocomplete + '" style="overflow:auto;"></ul>';
						$autocomplete = $(html)
							.css({"position": "absolute", "left": $this.position().left}).hide();
						$this.after($autocomplete);
						$autocomplete.dimWidth(settings.listWidth || $this.outerWidth());
						$autocomplete[0].input = input;
					}
					if (settings.placeholder && !input.placeholder) {
						// When the placeholder is been set, the defaultValue can be ignore
						input.defaultValue = settings.placeholder;
					}
				} 
			});
        },
		range: function () {}, 
		color: function () {}, 
		calendar: function () {}, 
        // Radio
        radio2: function (selector, settings) {}
    });

    // Descendable $.fn
    $.map(['checkbox2', 'radio2', 'select2', 'input2'], function (method) {
        $.fn[method] = function () {
            if (!this.length) return;
            var args = [].slice.apply(arguments), context = $(this[0].form).data('vui-form');
            context[method].apply(context, [].concat(this, args));
            return this;
        }
    });
});