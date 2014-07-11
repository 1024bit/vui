/** 
 * 表单组件
 * Scene: 
 * checkbox, radio, select等表单元素脱离表单即没有存在的意义
 * 自动完成数据来源: server, local
 *
 * 目的: 
 * 1. 表单美化
 * 2. 渐进增强
 *
 * 使用方法: 
 * 1. $('xxform').form2(options); 
 * 2. $('xxform').form2('checkbox2|radio2|select2', options);
 * 3. $('xxcheckbox').checkbox2(options), ... 
 * 4. $('xxform').data('hijax-form2').checkbox2(options), ...
 */
(function($) {
	$.widget('hijax.form2', $.hijax.widget, {
		options: {
			themes: {
				'default': {
					style: {
						// 复选框
						checkbox: '', checkboxChecked: '', checkboxDisabled: '', 
						// 选择框
						select: '', selectFocus: '', 
						selectInput: '', selectArrow: '', 
						selectOptionList: '', selectOption: '', selectOptionSelected: ''
					}
				}
			}
		},  
		widgetEventPrefix: 'form',
		_createWidget: function(options, element) {
			// options.element必须为jQuery对象
			if (!$.nodeName((options && options.element && options.element[0]) || element, 'form')) {
				return $.error("Only can initialize on form element");
			}	
			this._super.apply(this, arguments)
		}, 
		_attachEvent: function() {
			this._super.apply(this, arguments);

			var 
            options = this.options, 
            style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix, 
			sltcbx = 'span.' + clspfx + '-checkbox',
			sltslt = 'div.' + clspfx + '-select',
			sltarw = 'a.' + clspfx + '-select-arrow', 			
			sltopt = 'li.' + clspfx + '-select-option', 			
			evtmap = {}, timer = 0;
			
			// 复选框事件
			evtmap['click ' + sltcbx] = function(e) {
				var $target = $(e.target);
				$target.toggleClass(style.checkboxChecked);
				$(e.target.checkbox).prop('checked', $target.hasClass(style.checkboxChecked));
			};
			
			// 选择框事件
			evtmap['click ' + sltarw] = function(e) {
				var 
				$element = $(e.target).closest(sltslt), 
				$optionlist = $($element[0].optionlist), 
				$btmli, 
				len = $element[0].select.options.length, 
				wtop = this.window.scrollTop(), wh = this.window.height(), wbtm = wtop + wh, 
				etop, eh, ebtm, h;
				
				$optionlist.show();
				// 计算高度
				if (len <= $element[0].select.size) {
					$btmli = $optionlist.find('li:nth-child(' + len + ')');
					$optionlist.height((($btmli.length && $btmli.position().top) || 0) - parseInt($optionlist.css('padding-top')) + $btmli.outerHeight(true));
				}
				
				etop = $element.offset().top, eh = $element.outerHeight(), ebtm = etop + eh, h = $optionlist.outerHeight();
				
				// 超出视窗
				if (ebtm + h > wbtm) {
					if (etop - wtop > wbtm - ebtm) {
						$optionlist.css('top', '-' + h + 'px');
					} else {
						$optionlist.css('top', eh);
					}
				}				
				e.preventDefault();
			};
			evtmap['click ' + sltopt] = function(e) {
				var 
				element = $(e.target).closest(sltslt)[0], 
				$input = $(element.input), $current = $(e.currentTarget), 
				oldval = $input.val(), newval = $current.attr('value');
				
				$(element.optionlist).hide();
				if (oldval !== newval) {
					$input.val($current.text());
					//$(element).addClass(style.selectOptionSelected);
					$(element.select).val(newval).trigger('change');
				}
			};		
			evtmap['focus ' + sltslt] = function(e) {
				if (timer) {
					clearTimeout(timer);
					timer = null;
				}
				var $current = $(e.currentTarget), select = e.currentTarget.select;
				if (!$current.hasClass(style.selectFocus)) {
					this.select2(select, 'focus');
				}
			};
			evtmap['blur ' + sltslt] = function(e) {
				var self = this, select = e.currentTarget.select;
				// 异步
				timer = setTimeout(function() {
					self.select2(select, 'blur');
				}, 0);
			};				

			this._on(evtmap);
			this.on('option.add option.remove', sltslt, function(e, settings) {
				// do something
			});
		}, 
		_paint: function(models) {
			// this.$('input[type=checkbox]:not([enhanced])').checkbox2();
			// this.$('input[type=radio]:not([enhanced])').radio2();
			this.$('select:not([enhanced])').select2();
		}, 	
		
		// 复选框
		// settings: {place: function() {}, checked: false, disabled: false}
		checkbox2: function(selector, settings) {
			var 
			self = this, 
            options = this.options, 
            style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix, 
			clschkbx = clspfx + '-checkbox',			
			$checkbox = !(selector instanceof $) ? $(selector) : selector,
			$element = null;
			$checkbox.each(function() {
				var $this = $(this);
				if (!$.nodeName($this[0], 'input') || !$this.is('[type=checkbox]')) return;
				
				$element = $this.parent();
				settings = $.extend({}, {disabled: $this.prop('disabled'), checked: $this.prop('checked')}, settings);
			
				if (!$this.attr('enhanced')) {
					// 新创建的checkbox
					$element = $('<span class="' + clschkbx + ' ' + style.checkbox + '"/>');
					if (!$.contains(self.element[0], $this[0])) {
						$element.append($this.hide());
						settings.place.call($element);
					} else {
						$element.insertAfter($this).append($this.hide());
					}
					$this.attr('enhanced', 'enhanced');
					$element[0].checkbox = $this[0];
				} 

				$element.toggleClass(style.checkboxDisabled, settings.disabled);
				$this.prop('disabled', settings.disabled);			
				$element.toggleClass(style.checkboxChecked, settings.checked);
				$this.prop('checked', settings.checked);				
			});
		}, 
		
		/** 
		 * 选择框
		 * settings: {
		 *	    // 供自动插入数据
		 *      data: url || {
		 *			text: '', 
		 *			value: '', 
		 *			selected: false
		 *		}, 
		 *		// 
		 *		place: function($element, $form) {}, 
		 *      // 设置或返回下拉列表中被选项目的索引号
		 *		selectedIndex: number, 
		 *      // 设置或返回是否应禁用下拉列表
		 *		disabled: boolean, 
		 *      // 设置或返回是否选择多个项目
		 *		multiple: boolean, 
		 *		combox: boolean
		 *      // 设置或返回下拉列表中的可见行数
		 *      size: number
		 *		// 设置或返回下拉列表的 id
		 *		id: string
		 *      // 设置或返回下拉列表的名称
		 *      name: string
		 *	} 
		 * 方法: add(), blur(), focus(), remove()
		 * 事件: option.add, option.remove
		 */
		select2: function(selector, settings) {
			var 
			self = this, 
            options = this.options, 
            style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix, 
			clsslt = clspfx + '-select', 
			clscbx = clspfx + '-select-combox', 
			clsipt = clspfx + '-select-input', 
			clsarw = clspfx + '-select-arrow', 
			clslst = clspfx + '-select-option-list', 
			clsopt = clspfx + '-select-option', 
			$select = !(selector instanceof $) ? $(selector) : selector, 
			$element, $this, $combox, $optionlist, $input, $btmli,
			htmllist, method, args, 
			implementing = {'add': add, 'remove': remove, 'focus': focus, 'blur': blur}, 
			selectedText, dim, pos, 
			select, l = $select.size(), 
			delimiter = ', ';
			
			// 方法
			if ($.type(settings) === 'string') {
				if (!(settings in implementing)) {
					return $.error('Method ' + settings + ' is not supported');
				}
				method = settings;
				args = [].slice.call(arguments, 2);
			}
			
			while (l--) {
				htmllist = '';
				selectedText = [];
				
				$this = $select.eq(l);
				select= $select.get(0);
				if (!$.nodeName($this[0], 'select')) return;

				settings = $.extend({}, {
					// attributes(html5 && html4)
					// form(html5 attribute)(非设置项)
					autofocus: $this.attr('autofocus'), 
					data: select.options.length ? select.options : $this.attr('data'), 		
					disabled: select.disabled, 
					multiple: select.multiple, 
					size: select.size, 
					tabIndex: select.tabIndex
				}, {
					combox: false, 
					tabIndex: 1, 
					maxSize: 20, // chrome: 20, ie: 30	
					place: $.noop
				}, settings);
				
				if (!settings.size) settings.size = settings.maxSize;
				settings.size = Math.min(settings.size, settings.maxSize);
				// 错误按服务对象分两种: 面向用户, 面向程序猿
				if (!settings.size) {
					throw 'Size cannot be zero.';
				}
				
				if ($this.attr('enhanced') && !method) {
					$this.parent().after($this).remove();
					$this.removeAttr('enhanced');
				}
				
				if (!$this.attr('enhanced')) {
					// 新创建的select
					$element = $('<div tabindex="' + settings.tabIndex + '" class="' + clsslt + ' ' + style.select + '"/>');
					if (!$.contains(self.element[0], $this[0])) {
						$element.append($this.hide()).css({'position': 'absolute'});
						settings.place.call($element, self.element);
					} else {
						// An element is said to be positioned if it has a CSS position attribute of relative, absolute, or fixed.
						pos = $this.css('position');
						$element
							.css({'position': (!~('relative, absolute, fixed'.indexOf(pos)) ? 'relative' : pos)})
							.insertAfter($this)
							.append($this.hide());
					}
					

					$combox = $('<div style="position:relative;" class="' + clscbx + '"/>');
					$input = $('<input style="position:absolute;left:0;top:0;" type="text" class="' + style.selectInput + ' ' + clsipt + '" ' + (settings.combox ? '' : 'readonly ') + '/>').appendTo($combox);
					// tabindex小于0可使元素获得焦点事件而不受Tab键导航 
					$arrow = $('<a tabindex="-1" style="position:absolute;top:0;right:0;" href="javascript:;" class="' + clsarw + ' ' + style.selectArrow + '"/>').appendTo($combox);
					$element.append($combox);
					
					$optionlist = $('<ul class="' + style.selectOptionList + ' ' + clslst + '"/>').css({'position': 'absolute', left: 0});
					if ($.type(settings.data) === 'string') {
						$.ajax({
							url: settings.data
						}).done(function(data) {
							// 考虑两种场景: 1. select不支持data attribute; 2. 设置settings.data覆盖select.options
							$.each(data, function() {
								select.add($('<option />').text(option.text).val(option.value).get(0), this.options[index]);
							});
							settings.data = select.options;
						});
					}

					$.each(settings.data, function(idx) {
						if (this.selected) {
							selectedText.push(this.text);
						}
						htmllist += _createOption(this);
					});
					$input.val(selectedText.join(delimiter));
									
					// 获取原生控件尺寸, 位置
					// .css与.width已兼容, 唯一的区别是前者返回值带单位(字符类型)
					dim = {width: $this.outerWidth(), height: $this.outerHeight()};
					pos = {left: $this.css('left'), top: $this.css('top')};
					(pos.left === 'auto') && (pos.left = 0);
					(pos.top === 'auto') && (pos.top = 0);
					$element.css(pos);
					$element.contentWidth(dim.width);
					$combox.contentHeight(dim.height);
					$arrow
						.contentHeight(dim.height)
						.contentWidth(17);
					$input
						.contentWidth(dim.width - $arrow.outerWidth(true))
						.contentHeight(dim.height);       
					$element.append($optionlist.append(htmllist));
					$btmli = $optionlist.find('li:nth-child(' + Math.min(settings.data.length, settings.size) + ')');
					$optionlist
						.contentWidth(dim.width)
						.height($btmli.position().top - parseInt($optionlist.css('padding-top')) + $btmli.outerHeight())
						.hide();
					
					if (settings.disabled) {
						// IE8以下不支持bottom, right属性
						$mask = $('<div style="position:absolute;left:0;top:0;width:100%;height:100%;"/>').appendTo($element);
					}
					
					if (settings.autofocus) focus();

					$element[0].select = select;
					$element[0].input = $input[0];
					$element[0].optionlist = $optionlist[0];
					$this
						.attr('disabled', settings.disabled)
						.attr('multiple', settings.multiple)
						.attr('size', settings.size);					
					$this.addAttr('enhanced', 'enhanced');
				} else {
					$element = $this.parent();
					$combox = $element.find('.' + clscbx);
					$optionlist = $element.find('.' + clslst);
					$input = $element.find('.' + clsipt);
				}

				if (method) {
					implementing[method].apply(select, args);
				}
				
				// 方法
				function _createOption(option) {
					if ($.type(option) !== 'object') return '';
					return '<li class="' + (option.selected ? style.selectOptionSelected : '') + ' ' + style.selectOption + ' ' + clsopt + '" value="' + option.value + '"><a href="javascript:return false;">' + (settings.multiple ? ('<label><input type="checkbox" />' + option.text + '</label>') : option.text) + '</a></li>';			
				}
				// 添加一个选项, 索引从0计数, 支持负数
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
					this.add($('<option />').text(option.text).val(option.value).attr('selected', !!option.selected).get(0), this.options[index]);
					if (option.selected) {
						if (!settings.multiple) {
							$optionlist.find('li:nth-child(' + (selectedIndex + 1) + ')').removeClass(style.selectOptionSelected);
						}
						$.each(this.options, function() {
							if (this.selected) {
								selectedText.push(this.text);
							}
						});
						$input.val(selectedText.join(delimiter));	
					}						
					// 与组件实例无关联且作为API开放的事件, 不建议加上组件事件命名空间
					$element.trigger('option.add', settings);
					// $(this).trigger('option.add' + self.eventNamespace, settings);
				}
				// 删除一个选项
				// selectObject.remove(index): 如果指定的下标比0小, 或者大于或等于选项的数目, remove()方法会忽略它并什么也不做
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
							$optionlist.find('li:first').addClass(style.selectOptionSelected);
							this.options.length && (this.options[0].selected = true);
						}
						$.each(this.options, function() {
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
					// 1.$(this).focus() vs. 2.$(this).trigger('focus') vs. 2.$(this).triggerHandler('focus')
					// IE6支持1, 2, 3; 其他支持3
					// focus事件在各浏览器下均不冒泡, 委托focusin进行冒泡
					$(this).triggerHandler('focus');
				}
				// blur
				function blur() {
					$element.removeClass(style.selectFocus);
					$optionlist.hide();
					$(this).triggerHandler('blur');
				}
			}	
		}, 
		// Supported types: date datetime datetime-local month range time week
		input2: function(selector, settings) {}, 
		// 单选按钮
		radio2: function(selector, settings) {}	
	});
	
	// 子插件
	$.map(['checkbox2', 'radio2', 'select2', 'input2'], function(method) {
		$.fn[method] = function() {
			var args = [].slice.apply(arguments), context = $(this[0].form).data('hijax-form2');
			context[method].apply(context, [].concat(this, args));
			return this;
		}
	});	
})(jQuery);