/**
 * hijax所有widget继承此基类, 可根据需求扩展
 *
 * UI按照优化目的可分为两类: 
 * 1. 前端JS生成(前后端分离, 使用方便)
 * 2. 后端HTML输出 (搜索引擎友好, 比如menu组件)
 * 讨论问题: 一个优秀的组件是否应该支持以上两点?
 *
 * 添加主题: (以menu为例)
 * $.hijax.widgetSetup('menu', {themes: {pretty: {}}});
 * 应用主题:
 * $('xxx').menu({theme: 'pretty'})
 */
(function ($) { 
    $.widget('hijax.widget', {
        options: {
			// 运用场景? 若仅为满足非插件调用方式, 似乎没有必要
            element: null, 
            models: [], 
            themes: {
				'default': {
					// 通常, 两者二选一即可
					// 适用于DOM结构固定的场景
					'style': {}, 
					// 适用于DOM结构变化且子节点不绑定事件的场景(几乎不可能)
					'template': {}
				}
			},             
            theme: 'default', 
			// 作为a[href], button[href]中函数的上下文
			context: null, 
            message: {
                createError: 'Create widget error.'
            }
        }, 
        // 初始化组件; 增加id, parent, widgets属性
        _createWidget: function (options, element) {
            var 
            self = this, 
            constructor = $.hijax[this.widgetName], 
            duckType;
            
            // 为单一实例维护原型对象属性值为对象的属性的一份拷贝 
            // 理应整合进jquery.ui.widget.js
            $.each(self, function(key, prop) {
                duckType = $.type(prop);
                if (!self.hasOwnProperty(key)) {
					if (duckType === 'object') {
						self[key] = $.extend(true, {}, prop)
					} else if (duckType === 'array') {
						self[key] = [].concat(prop);
					}
                }
            });
			
            // instances: 静态属性, 存储实例
            // 可根据需要提供实例管理工具
            /*
            if (!constructor.instances) {
                constructor.instances = [];
            }
            constructor.instances.push(this);
            */

            if (options && (options.element instanceof $) && options.element.length) {
                element = options.element;
            }
                        
            // 缺省值
            if (!this.options.prefix) 
                this.options.prefix = this.widgetName;

			this.element = $(element);
			this.element.addAttr('widget', this.widgetFullName);
			this.dom = this.element;

            $.Widget.prototype._createWidget.apply(this, [options, element]);

            // 初始化子组件
            this.enhance();
        }, 
        _create: function() {
            $.Widget.prototype._create.apply(this, arguments);
            this._render();
            this._attachEvent();
        }, 
        // 事件绑定
        _attachEvent: function() {
			var 
			self = this, 
            options = this.options;

			this._on({
				'click a[href], button[href]': function(e) {
					var $target = $(e.target), 
						scheme = 'javascript:', fn, 
						href = $target.attr('href'), 
						js = href.indexOf(scheme), 
						context = options.context || this, 
						id;
						
					if (~$.inArray(href, ['', '#'])) return _leave();
					
					id = this._getSelectedId($target);
					
					// if (id === undefined) return;

					if (~js) {
						fn = href.slice(scheme.length);
						~fn.lastIndexOf(';') && (fn = fn.slice(0, -1));
						fn && context[fn] && context[fn](e, id);
						e.preventDefault();
					} else {
						return _leave();
					}
					
					function _leave() {
						var evt = $.Event(e);
						evt.type = 'leave';
						evt.target = e.target;
						// 第三方可在leave事件中拦截默认行为
						self._trigger(evt, id);
						return !evt.isDefaultPrevented();					
					}
				}
			});			
		}, 
        _getCreateOptions: function () {
            return this.element.metadata(this.widgetName);
        },
		// 被选中的子项id, 比如grid组件被选中的项id
		_getSelectedId: function($target) {}, 
        // 初始化子组件
        // 标签驱动
        // 考虑这种情况: <div widget="module tabpanel ..."/>
        enhance: function () {
            var self = this, $elems = this.element.find('[widget]'), widgetNames, $elem;
            
			$elems.each(function () {
                $elem = $(this);
                widgetNames = $elem.attr('widget').split(' ');
                $.map(widgetNames, function(widgetName) {
                    if (!$elem.data(self.namespace + '-' + widgetName)) {
						$elem[widgetName]();
					}
                });
                
            });
        },
        // 绘制
        _paint: function(models) {}, 
        // 渲染
        _render: function() {
            var 
            self = this, options = this.options, 
            expr = '[widget]',
            $elem = this.element,  
            ns, widgetName, evtobj;
            
            this._paint(options.models);

            // 基于事件编程
			/*
			if (self.events) {
				$.map(self.events.split(' '), function(evttp) {
					evtobj = {};
					evtobj[self.widgetEventPrefix + evttp] = self.options['on' + $.util.ucfirst(evttp)];
					self._on(evtobj);
				});  
			}
			*/

            // 注册组件, 增加parent, widgets, id属性
            // $.hijax.modules.xxx, $.hijax.modules.xxx.widgets
            var $parent = this.element.parent().closest(expr);
            if (!$parent.length) $parent = $(document);
            this.widgets = {};
            widgetName = $parent.attr('widget');
            widgetName && (this.parent = $parent.data(self.namespace + '-' + widgetName));
            this.id = $elem.attr('uid') || $elem.attr('id') || $elem.attr('name') || this.eventNamespace.slice(1);

			ns = this.widgetName + 's';
			// 关联数组
			!$.hijax[ns] && ($.hijax[ns] = {});
			this.id && ($.hijax[ns][this.id] = this);
            
			if (this.parent) {
                // 定位widget: 父widget下的索引或全局唯一id
                this.id && (this.parent.widgets[this.id] = this);
            }
        }, 
        // 更换主题(Theme contains structure and style.)
        changeTheme: function(name) {
            var 
            self = this, options = this.options, 
            from = options.themes[options.theme], to, 
            $elem, cls;
            
            // 相同主题
            if (options.theme === name) {
                this.raise(options.message.sameTheme, 'notice');
                return;
            }
            to = options.themes[name];
            $.each(to, function(key, val) {
                cls = from[key];
                $elem = self.element.find('.' + cls);
                $elem.removeClass(cls);
                $elem.addClass(val);
            });
            options.theme = name;
        }, 
        // 更新组件
        update: function(models) {
            if (!models) {
                this.raise(options.message.noUpdate, 'notice');
                return;
            }
            this.options.models = models;
            this._render();
        }, 
        // 某些widget事件不需要冒泡
		// 默认冒泡, 添加组件事件前缀
		// 假设带前缀的事件主要为第三方供应接口, 因而不携带namespace
        _trigger: function (type, event, data, addPrefix, bubble) {
            var prop, orig, callback, self = this;

            if ($.type(type) === 'string') {
                callback = this.options[type];
            } else {
                callback = this.options[type.type];
                // event, data, addPrefix, bubble
                bubble = addPrefix;
                addPrefix = data;
                data = event;
                event = type;
                type = event.type;
            }
			
            data = data || {};
            (bubble !== false) && (bubble = true);
            (addPrefix !== false) && (addPrefix = true);

			// $.Event构造的event对象不包含target, namespace属性
			event = $.Event(event);
			
			orig = event.originalEvent;
			
            event.type = (!type.indexOf(this.widgetEventPrefix) ? type : (!addPrefix ? type : this.widgetEventPrefix + type)).toLowerCase();
            
			if (orig) {
				orig.namespace = "";
				if (!orig.target) event.target = this.element[0];
                for (prop in orig) {
                    if (!(prop in event)) {
                        event[prop] = orig[prop];
                    }
                }
            }
			if (!event.target) event.target = this.element[0];
			
            // 修改事件侦听函数的this指针
            this.element._overrideListener(event.type, null, self);
			this.element[bubble ? 'trigger' : 'triggerHandler'](event, data);
            return !($.isFunction(callback) &&
				callback.call(this, event, data) === false ||
				event.isDefaultPrevented());
        }, 
		// 快捷函数
		$: function (selector, context) {
			return $(selector, context || this.element);
		},
		on: function (types, selector, data, fn) {
			var self = this;

			// 修改事件处理函数的this关键字
			function proxyFun(fn) {
				if (typeof fn == 'function') { 
                    // function
					fn = $.proxy(fn, self);
				} else { 
                    // string
					fn = $.proxy(self, fn);
				}
				return fn;
			}

			if (data == null && fn == null) { 
                // 只有两个参数 (types, fn)
				fn = selector;
				data = selector = undefined;
			} else if (fn == null) { 
                // 只有三个参数 
				if (typeof selector == 'string') { 
                    // (types, selector, fn)
					fn = data;
					data = undefined;
				} else { 
                    // (types, data, fn)
					fn = data;
                    data = selector;
					selector = undefined;
				}
			}
			
			if (arguments.length === 1) {
				// (types)
				this._on(types);
			} else {
				if ($.type(types) === 'object') {
					$.each(types, function(type, handler) {
						types[type + self.eventNamespace] = handler;
					});
				} else {
					types += self.eventNamespace;
				}
				this.element.on(types, selector, data, proxyFun(fn));
			}
			return this;
		}, 	
        /** 
		常识:
		1. $.fn.remove会将dom对象及其子dom对象上注册的所有事件和数据移除
		
		问题:
		1. 还有必要进行如下操作吗?
		
        移除widget对象及事件(含子widget) 
        整个jquery ui的销毁机制基于以下两种应用场景: 
        1. 使用$.fn.remove删除已组件化的dom对象
        2. dom对象的去组件化
        
		destroy调用方式: 
		1. 手动调用
		2. $.cleanData中调用
        destroy应接受一个参数, 用来标明是否由$.fn.remove方法触发, 避免重复执行
        */
		destroy: function (keepData) {
            var parent = this.parent;
            $.Widget.prototype.destroy.apply(this);
            // 触发组件remove事件
            // 注意区别: moduleremove vs. remove.module(内置) (前者对应组件本身, 后者对应组件的dom对象)
            this._trigger($.Event('remove'), this);
            // 移除与widget相关的标签属性
            // this.element.removeAttr('data-' + this.widgetName);
            this.element.removeAttr('widget', this.widgetName);  
            this.element._offByEventPrefix(this.widgetEventPrefix);
			// 销毁子widget(建议通过参数配置是否销毁子widget)
			$.each(this.widgets, function() {
				this.destroy();
			});
            
            // 正常情况下, 线网每次发布都具有不同的版本号
            delete $.hijax[this.widgetName + 's'][this.id];
			parent && (delete parent.widgets[this.id]);
			
            echo('destroy');
        },        
        // 抛出消息
        raise: function (message) {
			var options = this.options, messages;
			if ($.type(message.message) === 'number') {
				$.each($.factorMod(message.messgae), function() {
					messages.push({type: message.type, message: options.message[options.modMap[String(this)]]});
				});
			} else {
				messages.push(message);
			}
            // type: error, warning, notice
			// 支持多条消息
            this._trigger({type: 'message'}, messages);
        }	
    });  
	
	/** 插件扩展
	 */
	var _serializeArray = $.fn.serializeArray, 
		_removeAttr = $.fn.removeAttr, 
		$loading, $mask;
	if (!String.repeat) {
		String.prototype.repeat = function(l){
			return new Array(l+1).join(this);
		}
	}
	$.extend($.fn, {
		// 获取元信息
		metadata: function (name) {
			var data;
			if ($.metadata) {
				data = $.metadata.get(this[0], name ? { type: 'attr', name: 'data-' + name, single: name } : {});
			} else {
				// data = this.data('data-' + name) || '{}';
				data = this.data(name) || '{}';
				if ($.type(data) === 'string') {
					data = data.length && eval('(' + data + ')');
					this.data(name, data);
				}
			}
			return data;
		},	
		scrollTo: function(selector) {
			// An element is said to be positioned if it has a CSS position attribute of relative, absolute, or fixed.
			if (!~('relative, absolute, fixed'.indexOf(this.css('position')))) {
				this.css({'position': 'relative'});
			}
			var $target = this.find(selector), 
				offset = $target.position(), 
				dist, scrolltop = this.scrollTop();
			dist = scrolltop - offset.top - parseFloat(this.css('borderTop'));
			this.scrollTop(scrolltop - dist);
		},	
		// 移除指定前缀事件
		_offByEventPrefix: function (prefix) {
			var events = $.isWindow(this[0]) ? this[0][$.expando]['events'] : $.cache[this[0][$.expando]]['events'],
				self = this;
			$.each(events, function (evttype) {
				if (!evttype.indexOf(prefix)) self.off(evttype);
			});
		},
		// 事件是否被侦听
		_isListened: function (evttype, namespace) {
			var id = this[0][$.expando];
			if (!id) return false;
			var events = $.isWindow(this[0]) ? id['events'] : $.cache[id]['events'],
				b = false;
			if (!events[evttype] || !namespace) return !!events[evttype];
			$.each(events[evttype], function () {
				if (this.namespace == namespace) {
					b = true;
					return false;
				}
			});
			return b;
		}, 	
		// 重写事件侦听函数
		_overrideListener: function (evttype, data, context, one) {
			one = one || true;
			var events = $.isWindow(this[0]) ? this[0][$.expando]['events'] : $.cache[this[0][$.expando]]['events'];
			if (events[evttype]) {
				$.each(events[evttype], function () {
					var self = this;
					var _handler = this.handler;
					this.handler = function () {
						var args = [].slice.call(arguments, 0);
						_handler.apply(context || this, (data !== undefined) ? args.concat([data]) : args);
						// 利用完毕, 还原初始值
						if (one) self.handler = _handler;
					};
					// 维护guid
					this.handler.guid = _handler.guid;
				});
			}
		},
		// 使serializeArray支持所有元素
		serializeArray: function() {
			return this.prop('elements') ? 
				_serializeArray.call(this) : 
				this.prop('elements', this.find('input, select, textarea')).serializeArray();
		}, 
		addAttr: function(attrName, val) {
			var 
			re = new RegExp('\\b' + val + '\\b'), 
			attrVal = this.attr(attrName);
			
			this.attr(attrName, (attrVal && !re.test(attrVal)) ? attrVal + ' ' + val : val);
			return this;
		}, 	
		removeAttr: function(attrName, val) {
			var 
			re = new RegExp('\\b' + val + '\\b'), 
			attrVal = this.attr(attrName);
				
			if (attrVal === undefined) return this;
			return val ? this.attr(attrName, attrVal.replace(re, '')) : _removeAttr.call(this, attrName);
		}, 
		ajaxSubmit: function(ajaxOpts) {
			var $form = this, self = this;
			if (!$.nodeName(this.get(0), 'form')) $form = this.closest('form');
			var deferred = $.Deferred();
			$form.submit(function(e) {
				var params = {};
				if (!(e instanceof $.Event)) { 
					e = $.Event(e);
				}
				$.each(self.serializeArray(), function () {
					if (!(this.name in params)) { //未建立项
						params[this.name] = this.value;
					} else {
						params[this.name] = [].concat(params[this.name], this.value);
					}
				});	
				
				ajaxOpts.data = ajaxOpts.data || {};
				$.extend(ajaxOpts.data, params);	

				if (!e.isDefaultPrevented() && (!ajaxOpts.submit || (ajaxOpts.submit.apply(this, [e, ajaxOpts.data]) !== false)) && ajaxOpts.url) {
					$.ajax(ajaxOpts).done(function(data, textStatus, jqXHR) {
						deferred.resolve(data, textStatus, jqXHR);
					});
				}
				return false;
			});
			return deferred.promise();
		}, 
		// 显示加载信息
		// 单例
		showLoadMsg: function (opts) {
			if ($loading && $loading.is(':visible')) return;
			opts = opts || {};
			var 
			$ctnr, iterator = [], 
			$ldg = $loading, $msk = $mask, 
			msg = opts.message, mask = opts.mask, 
			$wpr = $('<div/>').css({'position': 'absolute'}), 
			isStr = msg && ($.type(msg) === 'string');
			if (this instanceof $) {
				this.css('position', 'relative');
				$ctnr = this;        } 
			if (opts.center) {
				$ctnr = $('body');
			}
			
			isStr && (msg = '<div class="widget-msg widget-msg-' + opts.type + '">' + msg + '</div>');
			$ldg && $ldg.remove();
			$ldg = (!msg)
			? $wpr.append(opts.defaultMsg ? ('<div class="widget-msg widget-msg-' + opts.type + '">' + opts.defaultMsg + '</div>') : '<i class="widget-loading"/>')
			: $wpr.append(msg);
			$loading = $ldg;

			iterator.push($ldg);
			if (mask) {
				if (!$msk) {
					$msk = $('<div class="widget-mask" />').css({ left: 0, top: 0, bottom: 0, right: 0 });
					$mask = $msk;
				}

				iterator.push($mask);
			}

			$.each(iterator, function () {
				this.appendTo($ctnr);
				this.show();
			});
			
			// 避免出现'createDocumentFragment' of undefined
			opts.changeModule && ($ctnr = $win);
			$ldg.css({
				top: $ctnr.scrollTop() + ($ctnr.outerHeight(true) - $ldg.outerHeight(true)) / 2, 
				left: $ctnr.scrollLeft() + ($ctnr.outerWidth(true) - $ldg.outerWidth(true)) / 2
			});

		},
		// 隐藏加载信息
		hideLoadMsg: function () {
			var $ldg = $loading, $msk = $mask;
			$ldg && $ldg.hide();
			$msk && $msk.hide();
		}	
	});
	
	/** $扩展
	 */
	$.extend({
		// 微型模板函数
		tmpl: function(tpl, data) {
			var html = '';
			if (!$.util || !$.util.tmpl) { 
				var lpos, rpos, key,
					lb = '<%=', rb = '%>', 
					llth = lb.length, rlth = rb.length;
				lpos = tpl.indexOf(lb);
				if (lpos !== -1) {
					rpos = tpl.indexOf(rb, lpos + llth);
					key = tpl.slice(lpos + llth, rpos);
					html += tpl.slice(0, lpos) + ((data[key] === undefined) ? '' : data[key]);
					html += arguments.callee(tpl.slice(rpos + rlth), data);
				} else {
					html = tpl;
				}
				
			} else {
				html = $.util.tmpl(tpl, data);
			}
			return html;
		}, 		
		// 分解mod: 7 = 1 + 2 + 4
		factorMod: function(mod) {
			var factors = [], sum = 1;
			function _factorMod(modx) {
				if (sum > mod) return;
				factors.push(modx);
				modx *= 2;
				sum += modx;
				_factorMod(modx);
			}
			_factorMod(1);
			return factors;
		}, 
        // 将字符串的首字母转换为大写
        ucfirst: function (str) {
            return str.replace(/^([a-z])/i, function (m) {
                return m.toUpperCase();
            });
        }, 
		// 字符, 对象, 数组是否为空
		isEmpty: function(arg) {
			var key;
			if (arg.length) return false;
			if ($.type(arg) === 'object') {
				for (key in arg) return false;
			}
			return true;
		}
	});
	
	/** $.hijax扩展
	 */	
	$.extend($.hijax, {
		// 批量修改组件配置
		widgetSetup: function (widgetName, options) {
			$.extend(true, $.hijax[widgetName].prototype.options, options);
		} 
	});			
})(jQuery);