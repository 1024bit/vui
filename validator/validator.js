/** 
 * 表单验证组件, 改编自: http://niceue.com/validator
 * 目的: 保持组件的风格统一(基于jQuery UI), 方便后续同事扩展与维护
 * Scene: 
 * 1. 验证组件不负责表单提交
 * 2. 灵活与性能是此消彼长的关系
 
 * 讨论问题: 错误消息一次全部提示与逐一提示的优缺点
 *
 * 使用方法: 
 * 1. $('xxform').validator({
 * 		fields: {
 *			name1:  {
 *				name: '', placeholder: '', okMsg: '', ignore: '', 
 *				rule: [[regexp, '请输入正确的信息'], 'match[lt, money]', 'length[6~16]', ['qq', ''], 'rule4'; ...]
 *			}
 *		}
 * }); 
 *
 * 事件:
 * validatesuccess, validateok, validateerror
 */
(function($) {
	$.widget('hijax.validator', $.hijax.widget, {
		options: {
			themes: {
				'default': {
					style: {
						errorMsg: '',
						placeholder: '', 
						okMsg: ''
					}
				}
			}, 			
			rules: {}, 
			fields: {}, 
			pauseOnError: false, 
			defaultErrorMsg: '{0}格式不正确', 
			defaultOkMsg: ' ✔', 
			// 引导性提示消息默认以placeholder的形式显示
			showTipsAsPlaceholer: true, 
			// 初始化时将引导性提示消息显示在表单元素后面
			showTips: false, 
			// 自定义消息显示样式, 返回消息对象(jQuery or Other object)
			showMsg: $.noop()
		},  
		widgetEventPrefix: 'validate',
		// 增加规则
		addRule: function() {},
		// 修改规则
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
			$.hijax.widget.prototype._createWidget.apply(this, arguments);
			if (!$.nodeName(element, 'form')) {
				return $.error("Only can initialize on form element");
			}
            
			var self = this, 
				// elements 集合可返回包含表单中所有元素的数组
				// 元素在数组中出现的顺序和它们在表单的HTML 源代码中出现的顺序相同			
				$elements = $(this.element.get(0).elements);

			// 获取规则
			// 已禁用与不可见元素不验证
			$elements.not(':hidden').not(':disabled').each(function() {
				self.parseRule($(this));
			});		
		}, 
		parseRule: function($elem) {
			$elem.attr('novalidate', 'novalidate');
			var self = this, name = $elem.attr('name'), 
				options = this.options, 
				option = options.fields[name], 
				metadata;
			
			// 预处理
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
				($.type(metadata.rule) === 'array') ? 
					$.each(metadata.rule, function() { return self._parseRule.apply(self, $.makeArray(arguments).concat(metadata)); }) : this._parseRule(null, metadata.rule, metadata);
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
					// 获取参数
					$.each(RegExp.$2.split(','), function() {
						var subargs = String(this).split('~');
						if (subargs.length !== 1) {
							(subargs[0] === '') ? (subargs[0] = MIN_VALUE) : (subargs[1] = MAX_VALUE);
						}
						args = args.concat(subargs);
					});
					// 获取
					$.each(self.delimiter, function(key) {
						name = RegExp.$1;
						if (this.test(RegExp.$2)) {
							// 函数, 数组, 正则
							rule = options.rules[name][key] || options.rules[name];
							return false;
						}
					});

				} else {
					// 函数, 数组, 正则
					rule = options.rules[rule];
				}					
			}
			
			if ($.type(rule) !== 'array') {
				// 函数, 正则
				rule = [rule];
			}
			// 拷贝, 以免影响所有值
			rule = [].concat(rule);
			fn = rule[0];
			if ($.type(fn) === 'function') {
				rule[0] = function() {
					return fn.apply(self, [].slice.call(arguments, 0).concat(args));
				};
				rule[2] = args;
			}
			error && (rule[1] = error);
			// 二维数组
			(idx !== null) ? 
				metadata.rule[idx] = rule : 
				metadata.rule = [rule];			
		}, 
		_attachEvent: function() {
			var self = this, 
				options = this.options, 		
				evtmap = {}, isDefaultPrevented;
			
			evtmap['validate'] 
			= evtmap['change input'] 
			= evtmap['change select'] 
			= function(e) {
				return this._exec($(e.target));
			};

			evtmap[this.widgetEventPrefix + 'error'] = function(e) {
				isDefaultPrevented = true;
			};			
			evtmap['submit'] = function(e) {
				isDefaultPrevented = false;
				var self = this, $elements = $(e.target.elements), 
						$elem, metadata, rtr, evt;
				
				$elements.not(':hidden').not(':disabled').each(function() {
					$elem = $(this);
					// if (metadata.valid === true) return;
					return self._exec($elem);
					
				});
				rtr = !isDefaultPrevented;
				if (rtr === true) {
					evt = $.Event('success');
					this._trigger(evt);
					if (evt.isDefaultPrevented()) {
						return !rtr; 
					}
				}
				return rtr;
			};
			evtmap['focusin input'] = function(e) {
				var $target = $(e.target), metadata = $target.metadata('rule');
				($target.val() === '' && (metadata.valid === undefined)) && this.showMsg(e, {type: 'placeholder', msg: ''});
			};
			
			this._on(true, evtmap);
		}, 
		_exec: function($elem) {
			var self = this, 
			    e = {target: $elem[0]}, 
				metadata = $elem.metadata('rule'), 
				rule, error, errortpl, 
				args, rtr;
				
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
						
					// 正则, 函数
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
							self._trigger('error', e);
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
				// 标识验证通过
				metadata.valid = true;
				self._trigger('ok', e);
				self.showMsg(e, {type: 'ok', msg: metadata.okMsg || self.options.defaultOkMsg});
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
			var $target = $(e.target), metadata = $target.metadata('rule');
			// 同一时间只能显示一种消息
			// metadata.$activeMsg有可能是第三方提供的对象
			if (metadata.$activeMsg) {
				metadata.$activeMsg.hide();
			}
			if (this.options.showMsg) {
				metadata.$activeMsg = this.options.showMsg.apply(this, arguments);
				if (metadata.$activeMsg) metadata.$activeMsg.show();
				return;
			}
			metadata.$activeMsg = this._showMsg(e, opts);
		}, 
		_showMsg: function(e, opts) {
			var options = this.options, 
				style = options.themes[options.theme].style, 
				clspfx = this.namespace + '-' + options.prefix, 
				clsmsg, 
				$target = $(e.target), $next;
							
			if (opts.type === 'placeholder' && this.options.showTipsAsPlaceholer) return;

			clsmsg = clspfx + '-' + opts.type + '-msg';
			$next = $target.next('.' + clsmsg);
			($next.length) ? $next.html(opts.msg).show() : $target.after(($next = $('<span class="' + style[opts.type + 'Msg'] + ' ' + clsmsg + '">' + opts.msg + '</span>')));
			return $next;
		}, 
		hideMsg: function() {}, 
		_paint: function(models) {
			var options = this.options, 
				style = options.themes[options.theme].style, 
				clspfx = this.namespace + '-' + options.prefix, 
				$elements = $(this.element.get(0).elements), $this;
				
			if (this.options.showTipsAsPlaceholer) {
				$elements.each(function() {
					$this = $(this);
					// placeholder 属性适用于以下的 <input> 类型: text, search, url, telephone, email 以及 password
					if (!$this.is(':checkbox, :radio')) {
						$this.attr('placeholder', $this.metadata('rule').placeholder);
					}
				});
			} else if (this.options.showTips) {
				$elements.each(function() {
					$this = $(this);
					clsmsg = clspfx + '-placeholder';
					$next = $this.next(clsmsg);
					($next.length) ? $next.show() : $this.after('<span class="' + style.placeholder + ' ' + clsmsg + '">' + $this.metadata('rule').placeholder + '</span>');
				});
			}
		}
	});	
})(jQuery);