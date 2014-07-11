/*
 * Author: Oliver Steele
 * Copyright: Copyright 2007 by Oliver Steele.  All rights reserved.
 * License: MIT License
 * Homepage: http://osteele.com/javascripts/sequentially
 * Version: 1.0preview2
 */

Function.K = function(x){return function(){return x}};

/// An `MVar` is an asynchronous channel that synchronizes
/// readers and writers.  `MVar` implements (most of) the
/// Haskell `MVar` interface, but using funargs instead of
/// the `IO` monad.
function MVar() {
    var 
	value,
	readers = [],
	writers = [],
	takers = [], 
	proto = {
        // put if empty, else wait in line
        writer: function(writer) {
            value
                ? writers.push(writer)
                : put(writer());
            return this;
        },
        // apply `reader` to the value if full, else wait in line
        reader: function(reader) {
            value
                ? reader(value[0])
                : readers.push(reader);
            return this;
        },
        // take the value if full, else wait in line
        taker: function(taker) {
            if (!value)
                return takers.push(taker);
            var x = value[0];
            value = null;
            taker(x);
            runNextWriter();
            return this;
        },
        // put a value if empty, else wait in line with the writers
        put: put,
        // `put` and return true if empty, else return false
        tryPut: function(x) {
            value ? false : (put(x), true);
        },
        // return false if empty, else take the value and returns it
        // in a list
        tryTake: function() {
            var was = value;
            value = null;
            runNextWriter();
            return was;
        },
        modifier: function(modifier) {
            this.reader(function(value) {
                put(modifier(value));
            });
        },
        isEmpty: function() {return !value}, 
		unset: function() {
			value = null, 
			readers = [],
			writers = [],
			takers = [];			
		}		
    };
	if (this.__proto__) {
		this.__proto__ = proto;
	} else {
		var key;
		for (key in proto) {
			this[key] = proto[key];
		}
	}
    function put(x) {
        if (value)
            return writers.push(Function.K(x));
        while (readers.length)
            readers.shift().call(null, x);
        if (takers.length) {
            var taker = takers.shift();
            taker(x);
            runNextWriter();
        } else
            value = [x];
    }
    function runNextWriter() {
        if (!value && writers.length) {
            var writer = writers.shift();
            put(writer());
        }
    }
}
 
/**
*  Author:  cherish peng                            
*  Email:   505853744@qq.com                     
*  Desc:    插件支持以下功能: 
*           0. 支持自定义数据源(AJAX、JSONP、或JS对象), 由第三方决定
*           1. 同一页面支持多个实例, 实例可内嵌实例
*		    2. 支持本地缓存
*			3. 支持预加载
*			4. 支持更新缓存数据(自动或手动)
*			5. 支持将数据添加至指定容器
*			6. 支持动态数据模板
*           7. 支持垂直和水平方向滚动
*			
*  Config:  settings = {
*   		 event: 'scroll',                              // 默认由scroll事件触发
*            timestamp: '',                                // 数据时间戳字段
*            template: '',                                 // 模板
*            tmplEngine: function() {},                    // 模板引擎 
*			 numperscreen: 50,                             // 每屏数据数量
*			 containerselector: '.container',              // 容器选择器, 用于添加数据, 默认为实例对象本身
*			 initscreennum: 2,                             // 预先获取, 按屏来计量数据, 初始化为2屏, 应大于等于2
*            dir: 'ttb',                                   // 默认自上向下滚动 (ltr: 自左向右)
*			 autoupdate: 0,                                // 默认主动检测更新
*			 localize: 1,                                  // 默认开启本地缓存
*			
*            // 本地化参数
*			 cache: {
*                bound: 5,                                // 最大实例化数量(同一页面节点或同一页面)
*                node: 'DEMANDLOADERNODE',                // 页面节点名
*                md5: 'DEMANDLOADERMD5'                   // 页面唯一标识符
*            }, 
*			
*			 // 回调函数
*			 callback: function(ele, appendTo, where, initscreennum) {
*				 $ele:                                       // 实例对象
*				 $appendTo(ele, response, where), $response: // 数据列表; 
*				 $where:                                     // 插入点
*			 }
*  }
*  Method:  update()                                      // 获取最新数据并更新缓存
*  Event:   loaderinit loaderload                              
*
*  Version: 1.2   采用模板引擎处理动态数据模板, 1.0版本只处理静态模板
*  BTW:     任何需求可自行扩展或联系我    
**/
 
(function($) {
	// 计数器
	var counter = 0;
    $.fn.demandload = function(options) {
        var settings = {
			event: 'scroll', 
			initscreennum: 1, 
            dir: 'ttb', 
			autoupdate: 0, 
			localize: 0, 
			cache: {
                bound: 5,  
                node: 'DEMANDLOADERNODE', 
                md5: 'DEMANDLOADERMD5' 
            }, 
			
        };
				
        if (options) {
            $.extend(settings, options);
        }
		
		// 应大于等于2
		// (settings.initscreennum < 2) && (settings.initscreennum = 2);
		
		// 缓存最大数量
        var maximum = settings.initscreennum * settings.numperscreen, 
			dir = settings.dir, 
			// 过滤掉不支持localStorage的浏览器
			localize = settings.localize && (typeof localStorage != 'undefined'), 
			ele = this[0], self = this;
		
		if (localize) {
            var md5 = settings.cache.md5, 
				node = settings.cache.node;
		}

		var _appendTo = function(target, response, where, e) {
			if (!localStorage.cache) localStorage.cache = '{}';
			var cache = JSON.parse(localStorage.cache);
			
			// 只有开启缓存且update或初始化数据时操作localStorage
			var local = localize && ((where == 'prepend') || !(cache[node] && cache[node][md5] && cache[node][md5][target.data.GUID])), 
				pagination = 0;
				
			if ($.isArray(response)) {
				if (settings.template) {
					var l = response.length;
					if (l) {
						if (local) {
							// 存储到localStorage
							if (!cache['DEMANDLOADERTIMESTAMP']) cache['DEMANDLOADERTIMESTAMP'] = {};
							if (!cache[node]) cache[node] = {};
							if (!cache[node][md5]) cache[node][md5] = {};
							
							// 同一页面节点或同一页面的实例化数量
							var iterator = function(obj) {
								var i = 0, key, k;
								for (k in obj) {
									if ($.isO(obj[k])) iterator(obj[k]);
									if (i == 0) key = k;
									i++;
								}
								// 超出, 删除第一个
								if (i > settings.cache.bound) {
									delete obj[key];
								}								
							};
							
							iterator(cache[node]);
							iterator(cache['DEMANDLOADERTIMESTAMP']);
							
							if (!cache[node][md5][target.data.GUID]) cache[node][md5][target.data.GUID] = [];
							var _cache = cache[node][md5][target.data.GUID];							
						}
						
						/*
						// 后端返回数据为降序排列
						if (where == 'prepend') {
							response.reverse();
						}
						*/ 
						
						var container = (target.container) ? $(target.container) : $(target), 
							tpl = '';

						$.map(response, function(item, idx) {
							// 记录当前时间戳
							if (settings.timestamp) {
								if (((where == 'prepend') && (idx == l - 1)) || (!idx && !target.data.timestamp))  {
									target.data.timestamp = item[settings.timestamp];
								} 
							}
							// 标识数据的数量
							ele.data.offset += 1;
							// 生成列表所需模板(HTML结构)
							// 增加页码
							item['iteration'] = ((ele.data.offset % settings.numperscreen) === 1) ? (pagination = Math.ceil(ele.data.offset / settings.numperscreen)) : 0; 
							item['index'] = ele.data.offset;
							item['last'] = (idx === l - 1) ? 1 : 0; 
							
							var temptpl = settings.tmplEngine(settings.template, item);
							
							// 添加模板
							tpl = (where == 'prepend') ? (temptpl + tpl) : (tpl + temptpl);
							
							if (local) {
								// _cache按降序排序
								// 是否为更新动作
								if (where == 'prepend') {
									_cache.unshift(item);
									if (_cache.length > maximum) {
										_cache.pop();
										// 移除页面中相应元素
										$($('[template]:last-child', container)[0]).remove();
									}									
								} else {
									if (_cache.length < maximum) {
										_cache.push(item);
									}
								}
							}

						});

						container[where](tpl);
						// 存入本地
						if (local) {
							// 记录数据时间戳
							cache['DEMANDLOADERTIMESTAMP'][node + '-' + md5 + '-' + target.data.GUID] = target.data.timestamp;
							localStorage.cache = JSON.stringify(cache);
						}
					}
				}
			}
			/*
			if ($.isFunction(callback)) {
				callback();
			}
			*/
			var data = {'pagination': pagination, e: e};
			// 数据初始化
			if (ele.data.offset <= maximum) {
				// 触发loaderinit事件
				self.trigger('loaderinit', data);
			}
			// 触发loaderload事件
			self.trigger('loaderload', data);
		};
		
		var offscreen = (settings.dir == 'ttb') ? $.abovethetop : $.leftofbegin, 
			onDefault = function(event) {
				// 非并发请求
				if (ele.data.MVAR.isEmpty()) {
					ele.data.offset = ele.data.offset || maximum;
					if (ele.data.offset < ele.data.total) {
						if ($.isFunction(settings.callback)) { 
							ele.data.MVAR.writer(function() {
								// 若网络出现问题, 尝试从事发点重新连接
								ele.data.start = ele.data.offset;
								settings.callback(ele, function() { return _appendTo.apply(null, [].slice.call(arguments, 0).concat(event)); }, 'append', 1, settings);
								// 标识数据的数量
								// ele.data.offset += settings.numperscreen;
							});
						} 				
					}				
				}			
			}, 
			listener = {
				'scroll': function(event) {
					var $ele = $(ele);
					
					ele.eventDispatcher.writer(function() {

						ele.data.offset = ele.data.offset || maximum;
						
						// 子选择器默认从第1个开始
						var start = ele.data.offset - settings.numperscreen;

						// 支持内嵌实例
						/*
						// 从触发上次滚屏的元素开始
						var i = 0;					
						var $start = $('[template]:nth-child(' + start + ')', $ele);
						if ($start.size() && (ele.data.offset < ele.data.total)) {
							while (offscreen($start, ele)) {
								$start = $start.next();
								if ($start.size()) i++;
								if (i == settings.numperscreen) {
									if ($.isFunction(settings.callback)) { 
										ele.data.MVAR.writer(function() {
											// 若网络出现问题, 尝试从事发点重新连接
											ele.data.start = ele.data.offset;
											settings.callback(ele, _appendTo, 'append', 1);
										});
										// 防止疯狂拖拉滚动条
										// 标识数据的数量
										ele.data.offset += ele.data.count;							
									} 
									break;
								}
							}
						*/

						var $start = $('[template=' + start + ']' , $ele);

						if (offscreen($start, ele) && (ele.data.offset < ele.data.total)) {                        
							if ($.isFunction(settings.callback)) { 
								ele.data.MVAR.writer(function() {
									// 若网络出现问题, 尝试从事发点重新连接
									ele.data.start = ele.data.offset;
									settings.callback(ele, _appendTo, 'append', 1, settings);
								});
								// 防止疯狂拖拉滚动条
								// 标识数据的数量
								// ele.data.offset += settings.numperscreen;						
							}                         
						}

					});
					ele.eventDispatcher.tryTake();
				}, 
				'click': onDefault
			};
		
		if (settings.event) {
			var evt = settings.event.split(' '), 
				evttype = evt[0], 
				trigger = $(evt[1]);
				trigger.on(evttype, listener['click']);
		}
		this.on('scroll', listener['scroll']);
		
		// 数据信息
		ele.data = {
			GUID: ele.id || ele.name || 'DEMANDLOADER' + (counter++), // 索引号
			MVAR: new MVar(), 
			timestamp: 0, // 默认为0毫秒
			offset: 0 // 已加载的数据数量
		};
		
		// 采用异步通道管理高并发事件
		ele.eventDispatcher = new MVar();
		
		// 指定容器
		if (settings.containerselector) {
			ele.container = $(settings.containerselector, this)[0];
		}
		
		// 作为接口供手动更新
		ele.update = function() {
			if ($.isFunction(settings.callback)) {
				ele.data.MVAR.writer(function() {settings.callback(ele, _appendTo, 'prepend', 1, settings);});
			}				
		};
		
		// 检测本地是否已有缓存
		if (localStorage.cache) {
			var cache = JSON.parse(localStorage.cache);
			if (cache[node] && cache[node][md5] && cache[node][md5][ele.data.GUID]) {
				// 从缓存获取数据
				_appendTo(ele, cache[node][md5][ele.data.GUID], 'append');
				// 使用缓存时间戳
				ele.data.timestamp = cache['DEMANDLOADERTIMESTAMP'][node + md5 + ele.data.GUID];
				
				// 主动更新
				if (settings.autoupdate) {
					ele.update();
				} 
			} else {
				if ($.isFunction(settings.callback)) {
					ele.data.MVAR.writer(function() {settings.callback(ele, _appendTo, 'append', settings.initscreennum, settings);});
				}					
			}
		} else {
			// 获取最近settings.localize.maximum条数据
			if ($.isFunction(settings.callback)) {
				ele.data.MVAR.writer(function() {settings.callback(ele, _appendTo, 'append', settings.initscreennum, settings);});
			}
		}		
            
		
        return this;
    };
	
	// 借用lazyloader.js两个方法, 少许改良
	// 容器上
	$.abovethetop = function(element, container) {
		var fold, i = container, _i = $(container);
		if (!i || i == document || i.tagName.toLowerCase() == 'html' || i.tagName.toLowerCase() == 'body') {
			fold = _i.scrollTop();
		} else {
			fold = _i.offset().top;
		}
		fold += parseFloat(_i.css('border-top-width'));
		return Math.ceil(fold) >= Math.ceil(element.offset().top + element.outerHeight());
	};
	
	// 容器左
	$.leftofbegin = function(element, container) {
		var fold, i = container, _i = $(container);
		if (!i || i == document || i.tagName.toLowerCase() == 'html' || i.tagName.toLowerCase() == 'body') {
			fold = _i.scrollLeft();
		} else {
			fold = _i.offset().left;
		}
		fold += parseFloat(_i.css('border-left-width'));
		return Math.ceil(fold) >= Math.ceil(element.offset().left + element.outerWidth());
	}; 
})(jQuery);