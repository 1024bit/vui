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
						checkbox: '',
						checkboxChecked: '', 
						checkboxDisabled: '', 
						select: '', 
						selectFocus: '', 
						selectInput: '', 
						selectArrow: '', 
						selectOptionList: '', 
						selectOption: '', 
						selectOptionSelected: ''
					}
				}
			}
		},  
		widgetEventPrefix: 'form',
		_createWidget: function(options, element) {
			// options.element必须为jQuery对象
			if (!$.nodeName((options.element && options.element[0]) || element, 'form')) {
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
			evtmap = {};
			
			// 复选框事件
			evtmap['click ' + sltcbx] = function(e) {
				var $target = $(e.target);
				$target.toggleClass(style.checkboxChecked);
				$(e.target.checkbox).prop('checked', $target.hasClass(style.checkboxChecked));
			};
			
			// 选择框事件
			evtmap['click ' + sltarw] = function(e) {
				$(e.target).closest(sltslt)[0].optionlist.show();
			};
			evtmap['click ' + sltopt] = function(e) {
				var 
				$current = $(e.currentTarget), $select = $(this.element.select), 
				oldval = $(this.element.input).val(), newval = $current.attr('value');
				if (oldval !== newval) $select.val(newval).trigger('change');
			};		
			// add, remove
			evtmap['option ' + sltslt] = function(e, settings) {
				// 计算高度
				var 
				$target = $(e.target), $btmli, $optionlist = $(e.target.optionlist), 
				len = e.target.select.options.length;
				if (len <= settings.size) {
					$btmli = $target.find('li:nth-child(' + len + ')');
					$optionlist.height($btmli.position().top + $btmli.outerHeight(true));
				}
				// 超出视窗
				if (($optionlist.offset().top + $optionlist.outerHeight()) > (this.document.scrollTop() + this.document.height())) {
					$optionlist.css('top', '-=' + $optionlist.outerHeight());
				}
			};
			
			evtmap['focusin ' + sltslt] = function(e) {
				this.select2(e.currentTarget.select, 'focus');
			};
			evtmap['focusout ' + sltslt] = function(e) {
				this.select2(e.currentTarget.select, 'blur');
			};				

			this._on(evtmap);
		}, 
		_paint: function(models) {
			this.$('input[type=checkbox]').checkbox2();
			this.$('input[type=radio]').radio2();
			this.$('select').select2();
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
			selectedText, dim, pos;
			
			// 方法
			if ($.type(settings) === 'string') {
				if (!(settings in implementing)) {
					return $.error('Method ' + settings + ' is not supported');
				}
				method = settings;
				args = [].slice.call(arguments, 2);
			}
			
			$select.each(function() {
				htmllist = '';
				selectedText = [];
				
				$this = $(this);
				if (!$.nodeName($this[0], 'select')) return;

				settings = $.extend({}, {
					// attributes(html5 && html4)
					// form(html5 attribute)(非设置项)
					autofocus: $this.attr('autofocus'), 
					data: this.options.length ? this.options : $this.attr('data'), 		
					disabled: this.disabled, 
					multiple: this.multiple, 
					size: this.size, 
					tabIndex: this.tabIndex
				}, {
					combox: false, 
					tabIndex: 1, 
					maxSize: 20, // chrome: 20, ie: 30	
					place: $.noop
				}, settings);
				if (!settings.size) settings.size = settings.maxSize;
				settings.size = Math.min(settings.size, settings.maxSize);
				// 错误按服务对象分两种: 面向用户, 面向程序猿
				!settings.size && throw 'Size cannot be zero.';
				
				if ($this.attr('enhanced') && !method) {
					$this.parent().after($this).remove();
					$this.removeAttr('enhanced');
				}
				
				if (!$this.attr('enhanced')) {
					// 新创建的select
					$element = $('<div tabIndex="' + settings.tabIndex + '" class="' + clsslt + ' ' + style.select + '"/>');
					if (!$.contains(self.element[0], $this[0])) {
						$element.append($this.hide()).css({'position': 'absolute'});
						settings.place.call($element, self.element);
					} else {
						// An element is said to be positioned if it has a CSS position attribute of relative, absolute, or fixed.
						pos = $this.css('position');
						$element
							.css({'position': (!~('relative, absolute, fixed'.indexOf(pos)) ? 'relative' : pos)});
							.insertAfter($this)
							.append($this.hide());
					}

					$combox = $('<div class="' + clscbx + '"/>');
					$input = $('<input type="text" class="' + style.selectInput + ' ' + clsipt + '" readonly="' + settings.combox + '"/>').appendTo($combox);
					$arrow = $('<a href="#" style="position:absolute" class="' + clsarw + ' ' + style.selectArrow + '"/>').appendTo($combox);
					$element.append($combox);
					
					$optionlist = $('<ul class="' + style.selectOptionList + ' ' + clslst + '"/>').css({'position': 'absolute', left: 0, top: $combox.outerHeight()});
					if ($.type(settings.data) === 'string') {
						$.ajax({
							url: settings.data
						}).done(function(data) {
							settings.data = data;
						});
					}
					
					$.each(settings.data, function(idx) {
						if (this.selected) {
							selectedText.push(this.text);
						}
						htmllist += _createOption(this);
					});

					$input.val(selectedText.join(','));
									
					// 获取原生控件尺寸, 位置
					dim = {width: $this.css('width'), height: $this.css('height')};
					pos = {left: $this.css('left'), top: $this.css('top')};
					$element.css(pos);
					$optionlist.css('width', dim.width);
					$input.css({'width': dim.width - $arrow.outerWidth(), 'height': dim.height});
					$element.append($optionlist.append(htmllist));
					$btmli = $optionlist.find('li:nth-child(' + settings.size + ')');
					$optionlist.height($btmli.position().top() + $btmli.outerHeight(true)).hide();
					
					if (settings.disabled) {
						// IE8以下不支持bottom, right属性
						$mask = $('<div/>').insertAfter($element).css({position: 'absolute', left: pos.left, top: pos.left, width: dim.width, height: dim.height, opacity: .25});
					}
					
					if (settings.autofocus) focus();

					$element[0].select = this;
					$element[0].input = $input[0];
					$element[0].optionlist = $optionlist[0];
					$this.addAttr('enhanced');
				}

				if (method) {
					implementing[method].apply(this, args.concat([$element, $input, $optionlist]));
				}
				
				// 方法
				function _createOption(option) {
					if ($.type(option) !== 'object') return '';
					return '<li class="' + (option.selected ? style.selectOptionSelected : '') + ' ' + style.selectOption + ' ' + clsopt + '" value="' + option.value + '"><a href="#">' + (settings.multiple ? ('<label><input type="checkbox" />' + option.text + '</label>') : option.text) + '</a></li>';			
				}
				// 添加一个选项
				function add(option, index) {
					$optionlist.find('li:nth-child(' + index + ')').before(_createOption(option));
					this.add($('<option />').text(option.text).val(option.value).get(0), this.options[index]);
					// 与组件实例无关联且作为API开放的事件, 不建议加上组件事件命名空间
					$(this).trigger('option.add', settings);
					// $(this).trigger('option.add' + self.eventNamespace, settings);
				}
				// 删除一个选项
				function remove(index) {
					$optionlist.find('li:nth-child(' + index + ')').remove();
					this.remove(index);
					$(this).trigger('option.remove', settings);				
				}
				// focus
				// IE7及以上版本, 现代浏览器激活到页面所在视窗(或标签)会重新定位光标, 从而触发focus动作
				// 不同浏览器对"激活"的定义不同(最小化与最大化, 标签切换, alert弹出框等)
				function focus() {
					$element.addClass(style.selectFocus);
					$input.focus();
					// To run an hidden element's focus event handlers: 
					// 1.$(this).focus() vs. 2.$(this).trigger('focus') vs. 2.$(this).triggerHandler('focus')
					// IE6支持1, 2, 3; 其他支持3
					// focus事件在各浏览器下均不冒泡, 委托focusin进行冒泡
					$(this).triggerHandler('focus');
				}
				// blur
				function blur() {
					$element.removeClass(style.selectFocus);
					$input.blur();
					$optionlist.hide();
					$(this).triggerHandler('blur');
				}
			});	
		}, 
		// Supported types: date datetime datetime-local month range time week
		input2: function(selector, settings) {
						
		}, 
		// 单选按钮
		radio2: function(selector, settings) {
		
		}	
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