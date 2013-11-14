/** 
 * 表单组件
 * Scene: checkbox, radio, select等表单元素脱离表单即没有存在的意义
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
						selectInput: '', 
						selectArrow: '', 
						selectOptionList: '', 
						selectOption: '', 
						selectOptionSelected: ''
					}
				}
			}, 
			prefix: 'form2'
		},  
		widgetEventPrefix: 'form',
		_createWidget: function(options, element) {
			// options.element必须为jQuery对象
			if (!$.nodeName((options.element && options.element[0]) || element, 'form')) {
				return $.error("Only can initialize on form element");
			}		
			$.hijax.widget.prototype._createWidget.apply(this, arguments);

		}, 
		_create: function() {
			var self = this;
			$.map(['checkbox2', 'radio2', 'select2'], function(method) {
				$.fn[method] = function() {
					var args = [].slice.apply(arguments);
					self[method].apply(self, [].concat(this, args));
					return this;
				}
			});
			$.hijax.widget.prototype._create.apply(this, arguments);
						
		}, 
		_attachEvent: function() {
			var 
            options = this.options, 
            style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix, 
			clscbx = clspfx + '-checkbox',
			clsslt = clspfx + '-select',
			clsarw = clspfx + '-select-arrow', 			
			clsopt = clspfx + '-select-option', 			
			clslst = clspfx + '-select-option-list', 			
			evtmap = {};
			
			// 复选框事件
			evtmap['click span.' + clscbx] = function(e) {
				var $target = $(e.target);
				$target.toggleClass(style.checkboxChecked);
				$(e.target.checkbox).prop('checked', $target.hasClass(style.checkboxChecked));
			};
			
			// 选择框事件
			evtmap['click a.' + clsarw] = function(e) {
				if (!e.target.select) {
					e.target.cache = $(e.target).closest('.' + clsslt)[0];
				}
				$(e.target.cache.optionlist).show();
			};
			evtmap['click li.' + clsopt] = function(e) {
				var $current = $(e.currentTarget), $select = $(e.currentTarget.select), 
					value = $current.attr('value');
				$select.val(value);
			};		
			
			evtmap['option div.' + clsslt] = function(e, settings) {
				// 计算高度
				var $target = $(e.target), $start, $end, $optionlist = $(e.target.optionlist);
				if (e.target.select.options.length >= settings.maxSize) {
					$start = $target.find('li:first-child');
					$end = $target.find('li:nth-child(' + settings.maxSize + ')');
					$optionlist.height($end.position().top - $start.position().top + $end.outerHeight());
				}
				// 超出视窗
				if (($optionlist.offset().top + $optionlist.outerHeight()) > (this.document.scrollTop() + this.document.height())) {
					$optionlist.css('top', '-' + $optionlist.outerHeight());
				}
			};
			evtmap['focusout div.' + clsslt] = function(e) {
				$(e.currentTarget.optionlist).hide();
			};
			
			
			this._on(evtmap);
		}, 
		_paint: function(models) {
			this.$('input[type=checkbox]:not([enhanced])').checkbox2();
			this.$('input[type=radio]:not([enhanced])').radio2();
			// this.$('select:not([enhanced])').select2();
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
		 *      data: url || {
		 *			text: '', 
		 *			value: '', 
		 *			selected: false
		 *		}, 
		 *		place: function() {}, 
		 *		selectedIndex: 0, 
		 *		disabled: false, 
		 *		multiple: false, 
		 *		combox: false
		 *	}
		 * 方法: add(), blur, focus, remove
		 * 事件: change
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
			$element, $this, $combox, $optionlist, $input,  
			htmllist, method, args, 
			interfase = {'add': add, 'remove': remove}, 
			selectedText, wdh;
			// 方法
			if ($.type(settings) === 'string') {
				if (!(settings in interfase)) {
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
				$element = $this.parent();
				settings = $.extend({}, {
					disabled: $this.prop('disabled'), 
					// selectedIndex: this.selectedIndex, 
					multiple: this.multiple, 
					combox: false, 
					maxSize: 20, // chrome: 20, ie: 30
				}, settings);
				
				if (!$this.attr('enhanced')) {	
					// 新创建的select
					$element = $('<div tabIndex="-1" class="' + clsslt + ' ' + style.select + '"/>').css({'position': 'relative'});
					if (!$.contains(self.element[0], $this[0])) {
						$element.append($this.hide());
						settings.place.call($element);
					} else {
						$element.insertAfter($this).append($this.hide());
					}
					$combox = $('<div class="' + clscbx + '"/>');
					$input = $('<input type="text" class="' + style.selectInput + ' ' + clsipt + '" readonly="' + settings.combox + '"/>').appendTo($combox);
					$arrow = $('<a href="#" style="position:absolute" class="' + clsarw + ' ' + style.selectArrow + '"/>').appendTo($combox);
					$element.append($combox);
					
					$optionlist = $('<ul class="' + style.selectOptionList + ' ' + clslst + '"/>').css({'position': 'absolute', left: 0, top: $combox.outerHeight()});
					if (!this.options.length) {
						if ($.type(settings.data) === 'string') {
							$.ajax({
								url: settings.data
							}).done(function(data) {
								settings.data = data;
							});
						}						
					} else {
						settings.data = this.options;
					}
					$.each(settings.data, function(idx) {
						if (this.selected) {
							selectedText.push(this.text);
						}
						htmllist += _createOption(this);
					});
					$input.val(selectedText.join(','));
					
					// 获取控件宽度
					$element.append($optionlist.append(htmllist));
					//wdh = $optionlist.outerWidth() + $arrow.outerWidth();
					$optionlist.width('+=' + $arrow.outerWidth());
					// input元素的宽度至始至终等于内容+补白+边框
					$input.width($optionlist.outerWidth());
					$optionlist.hide();
					if (method) {
						interfase[method].apply(this, args);
					}

					$this.attr('enhanced', 'enhanced');
					$element[0].select = $this.get(0);
					$element[0].optionlist = $optionlist[0];
				}
			});	
			function _createOption(option) {
				if ($.type(option) !== 'object') return '';
				return '<li class="' + (option.selected ? style.selectOptionSelected : '') + ' ' + style.selectOption + ' ' + clsopt + '" value="' + option.value + '"><a href="#">' + (settings.multiple ? ('<label><input type="checkbox" />' + option.text + '</label>') : option.text) + '</a></li>';			
			}
			// 添加一个选项
			function add(option, index) {
				$optionlist.find('li:nth-child(' + index + ')').before(_createOption(option));
				this.add($('<option />').text(option.text).val(option.value).get(0), this.options[index]);
				$element.trigger('option.add' + self.eventNamespace, settings);
			}
			// 删除一个选项
			function remove(index) {
				$optionlist.find('li:nth-child(' + index + ')').remove();
				this.remove(index);
				$element.trigger('option.remove' + self.eventNamespace, settings);				
			}
		}, 

		// 单选按钮
		radio2: function(selector, settings) {}	
	});
})(jQuery);