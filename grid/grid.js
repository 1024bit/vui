/** 数据表格组件 
 Sence:
 * 按字段排序分两种: js排序-效果层 服务端排序-功能层
 * 搜索分两种: js搜索-效果层 服务端搜索-功能层
 * 数据排序: 与grid无关
 * 不考虑数据频繁更新(增删改)(缓存应更多地从HTTP层考虑)
 * 基于offset的数据偏移量适用于瀑布式浏览
 * 
 Featrues: 
 * 1. 人性化编辑(同时编辑多项)
 * 2. 方便定位(标记数据项)
 * 3. 后台静默预加载数据, 不影响渲染速度
 数据源结构, models: {
 *     thead: [
 *	       {name: '', title: '', type: 'enum', rule: 'enum()', editable: '', href: ''}, 		
 *		   {name: '', title: '', type: 'date', rule: 'date', href: ''}, 		
 *		   {name: '', title: '', type: 'char', rule: '', href: ''}
 *     ], 
 *     tbody: [], 
 *	   tfoot: [
 *		   {title: '保存更改', href: ''}, 
 *		   {title: '删除所选项', href: ''}
 *	   ]
 * }
 使用方法: 
 * $('xxx').grid(options)
 依赖组件:
 * form2, pagination, validator
 事件:
 * gridinit gridload gridleave
 */

(function($) {
	$.widget('hijax.grid', $.hijax.widget, {
		options: {
			models: {
				thead: [], tbody: [], tfoot: []
			}, 
			dict: {
				thead: 'thead', tfoot: 'tfoot', tbody: 'tbody',
				total: 'total', page: 'page', count: 'count', 
				id: 'id', name: 'name', title: 'title', type: 'type', rule: 'rule', href: 'href', editable: 'editable'
			}, 
			themes: {
				'default': {
					style: {
						// 控制面板
						gridPnl: '', 
						gridTable: '', 
						gridPage: '', 	
						gridSum: '', 
						gridBtn: '', 
						gridEditBtn: '',
						gridRepeatBtn: '', 
						gridLoading: ''
					}
				}
			},  
			// 每屏数据数量
			count: 10,
			// 预加载一页数据			
			preload: true, 
			// 按需加载配置项, 对象或url地址
			dataUrl: '', 
			saveUrl: '', 
			delUrl: '', 
			// 数据预处理器
			dataFilter: {}, 
			context: null,
			// 可编辑的grid
			editable: true, 
			// 默认显示行选择checkbox
			showCheckbox: true, 
			// 起始页
			startPage: 1
		},  
		page: 0, 
		total: 0, 
		tbodys: [], 
		$activePage: $(), 
		isGridLoading: false, 
		deferredLoad: null, 
		initialized: false, 
		_tpl: '', 
		_createWidget: function(options, element) {
			if ($.type(options.saveUrl) === 'string') {
				options.saveUrl = {url: options.saveUrl};
			}			
			if ($.type(options.delUrl) === 'string') {
				options.delUrl = {url: options.delUrl};
			}			
			if ($.type(options.dataUrl) === 'string') {
				options.dataUrl = {url: options.dataUrl};
			}			
			if ($.type(options.editUrl) === 'string') {
				options.editUrl = {url: options.editUrl};
			}
			if (options.saveUrl && !options.saveUrl.url) options.editable = false;
			$.hijax.widget.prototype._createWidget.apply(this, arguments);
		}, 		
		_attachEvent: function() {
			var 
			self = this, 
            options = this.options, 
			dict = options.dict, 
			clspfx = this.namespace + '-' + options.prefix, 
			clssave = clspfx + '-btn-save',
			clsdel = clspfx + '-btn-del',	
			clschkall = clspfx + '-check-all',		
			clsrepeat = clspfx + '-repeat',	
			clspageno = clspfx + '-page-no',
			$pageno = this.element.find('.' + clspfx + '-page-no'),
			$pagettl = this.element.find('.' + clspfx + '-page-total'), 
			$checkall = this.element.find('input.' + clschkall);

			evtmap = {
				'mouseenter tbody tr': function(e) {
					$(e.currentTarget).find('td:first').prepend(this.$editBtn.show());
				}, 				
				'mouseleave tbody tr': function(e) {
					this.$editBtn.hide();
				}, 
				'submit form': function(e) {
					e.preventDefault();
				}, 
				'pageselect': function(e, page, pages) {
					var _done = function() {
						$pageno.val(page);
						$pagettl.text(pages);
						self._trigger('load');
					};
					this.load(page - 1).done(_done);
				}, 

				//'': function() {}
				/*
				'click td': function(e) {
					$target = $(e.currentTarget);
					var editable = $target.attr(dict.editable);
					if (editable === '0' || editable === false) {
						return;
					}
					var pos = $target.position();
					
					this.$input
						.offset(pos)
							.css({
								'left': pos.left, 
								'top': pos.top, 
								'paddingTop': parseFloat($target.css('paddingTop')) - !(parseFloat($target.css('borderTopWidth'))), 
								'paddingLeft': parseFloat($target.css('paddingLeft')) - !(parseFloat($target.css('borderLeftWidth'))), 
								'paddingBottom': parseFloat($target.css('paddingBottom')) - !(parseFloat($target.css('borderBottomWidth'))), 
								'paddingRight': parseFloat($target.css('paddingRight')) - !(parseFloat($target.css('borderRightWidth')))
							})
								.width($target.width())
									.height($target.height())					
										.show()
											.val($target.find('span').text())
												.select();
				}
				*/
				
			};
			// 全选或全不选
			evtmap['change input[type=checkbox]'] = function(e) {
				var $target = $(e.target), checked = $(e.target).prop('checked');
				if (!checked) {
					$checkall.prop('checked', false).attr('title', '全选');
				}
				(checked ? this.checkedCount++ : this.checkedCount--);
				if (e.target === $checkall[0]) {
					this.checkedCount = (checked ? this.$checkbox.length : 0);
					this.$checkbox.prop('checked', checked);
				}
				if (this.checkedCount === this.$checkbox.length) {
					$checkall.prop('checked', true).attr('title', '全不选');
				}
			};
			// 去第几页
			evtmap['change input.' + clspageno] = function(e) {
				var pageno = e.target.value;
				if ((pageno <= this.pages) && (pageno > 0)) {
					this.pagination.select(+(e.target.value), e);
				}
			}; 			
			// 保存更改
			evtmap['click .' + clssave] = function(e) {
			    // 考虑到标签可能具有默认行为
				e.preventDefault();
				this.saveChanges(e, options.saveUrl);
			};	
			// 重载
			evtmap['click .' + clsrepeat] = function(e) {
				e.preventDefault();
				this.reload(e);
			};
			// 删除所选
			evtmap['click .' + clsdel] = function(e) {
				e.preventDefault();
				this.delSelected(e, options.delUrl);
			};
			evtmap[this.widgetEventPrefix + 'init'] = function(e) {
				var 
				self = this, 
				options = this.options, 
				ajaxOpts = $.extend({type: this.$form.attr('method')}, options.saveUrl);
				
				this.$form.validator();
				this.$activePage.ajaxSubmit(ajaxOpts).done(function() {
					self.tbodys = [];
					self.reload({type: 'submit'});
				});
			};			
			evtmap[this.widgetEventPrefix + 'load'] = function() {
				this.$checkbox = this.$activePage.find('input[type=checkbox]').not(':hidden');
				this.checkedCount = 0;
			};
			evtmap[this.widgetEventPrefix + 'leave'] = function(e, id) {
				id && $(e.target).attr('href', href + (~href.indexOf('?') ? '&' : '?') + dict.id + '=' + id + '&' + dict.page + '=' + self.page);
			};
			this._on(evtmap);

			this._on(this.$input, {
				'change': function(e) {
					var $target = $(e.target), $input = $target.find('input'), 
						$span = $target.find('span'), 
						value = this.$input.val();
						
					if (!$span.attr('data-raw')) {
						$span.attr('data-raw', $span.text());
					}
					if (!$input.length) {
						$input = $('<input type="hidden" name="' + $span.attr('name') + '[]"/>').appendTo($target);
					} 
					$input.val(value);
					$span.text(value);
				}
			});
		}, 
		_paint: function(models) {
			var 
			self = this, 
            options = this.options, 
            style = options.themes[options.theme].style, 
			dict = options.dict, 
			clspfx = this.namespace + '-' + options.prefix, 
			clspnl = clspfx + '-pnl', 
			clstbl = clspfx + '-table', 
			clsbtn = clspfx + '-btn ' + style.gridBtn,
			clssave = clspfx + '-btn-save',
			clsdel = clspfx + '-btn-del',
			clspgn = clspfx + '-page', 
			clssum = clspfx + '-sum', 
			clspageno = clspfx + '-page-no',
			clspagettl = clspfx + '-page-total',
			clschkall = clspfx + '-check-all', 
			clsedit = clspfx + '-edit', 
			clsrepeat = clspfx + '-repeat', 
			clsldg = clspfx + '-loading', 
			gpnl = '<div class="' + clspnl + ' ' + style.gridPnl + '">',
			gtable = '', 
			html = '', columns = 0;
			
			this._tpl = '<tr><td editable="0">' + (options.showCheckbox ? ('<input type="checkbox" style="float:right;" value="<%=' + dict.id + '%>" />') : '') + '</td>';
			// 生成表格控制面板
			gpnl += (options.saveUrl.url ? ('<button type="submit" class="' + clssave + ' ' + clsbtn + '">保存更改</button>') : '') 
			+ (options.delUrl.url ? ('<button type="button" class="' + clsdel + ' ' + clsbtn + '">删除所选项</button>') : '');
			$.each(models[dict.tfoot], function() {
				gpnl += '<button type="button" class="' + clsbtn + '" href="' + this[dict.href] + '">' + this[dict.title] + '</button>';
			});
			gpnl += '</div>';
			// 生成表格
			gtable = '<table class="' + clstbl + ' ' + style.gridTable + '"><thead><tr><th style="width:50px">' + (options.showCheckbox ? ('<input type="checkbox" title="全选" class="' + clschkall + '" style="float:right;" />') : '') + '</th>';
			$.each(models[dict.thead], function(idx) {
				var name = this[dict.name];
				gtable += '<th>' + this[dict.title] + '</th>';
				self._tpl += '<td name="' + name + '"' + (this[dict.editable] === false ? (' editable="0" style="cursor:not-allowed"') : '') + '>' + (this[dict.href] ? ('<a href="' + this[dict.href] + '"><%=' + name + '%></a>') : ('<%=' + name + '%>')) + '</td>';
				columns = idx;
			});
			this.columns = columns + 2;
			this._tpl += '</tr>';
			gtable += '</tr></thead><tfoot><tr><td colspan="' + this.columns + '">'  
			+ '<div class="' + clssum + ' ' + style.gridSum 
			+ '"><i title="重载表格" class="' + clsrepeat + ' ' + style.gridRepeatBtn + '"></i> 共 <span class="' + clspagettl + '">0</span> 页 &nbsp;<span style="display:none;">去第 <input size="2" style="text-align:center" type="text" class="' + clspageno + '" value="" /> 页</span></div>' 
			+ '<ul class="' + clspgn + ' ' + style.gridPage + '"></ul>';
			+ '</td></tr></tfoot></table>';
				
			html += '<form method="post" action="' + (options.saveUrl.url || '') + '">' + gpnl + gtable + '</form>';
			this.element.append(html);
			
			this.init();

			this.$editBtn = $('<a class="' + clsedit + ' ' + style.gridEditBtn + '" title="编辑" href="' + options.editUrl.url + '"></a>').css({'position': 'absolute'}).hide().appendTo(this.element);
			// 定焦文本输入框
			this.$input = $('<input type="text"/>').css({'position': 'absolute', 'border': '1px solid #333', 'border-radius': '3px'}).hide().appendTo(this.element);
			this.$loading = $('<i class="' + clsldg + ' ' + style.gridLoading + '"/>').css({'position': 'absolute'}).hide().appendTo();
			this.$form = this.$('form');
			this.$thead = this.element.find('thead');
			
		}, 
		// 注意区别_init
		// 分页组件初始化
		init: function() {
			var 
			self = this, options = this.options, 
			clspfx = this.namespace + '-' + options.prefix, 
			clspgn = clspfx + '-page', 
			clspageno = clspfx + '-page-no';
			
			this.load(options.startPage - 1).done(function() {
				self.element.find('.' + clspageno).parent().toggle((self.total !== 0));

				if (self.pagination) {
					// 更新分页组件
					self.pagination.option({total: self.total}).update();
				} else {
					self.pagination = self.element.find('.' + clspgn).pagination({
						pageSize: options.pageSize, 
						count: options.count, 
						total: self.total, 
						startPage: options.startPage
					}).data(self.namespace + '-pagination');
				}
				self._trigger('init');
			});			
		}, 
		load: function(page) {
			this.element.showLoadMsg();
			// 加载中, 防止疯狂点击
			if (this.isGridLoading) {
				// 溢出请求
				this.deferredLoad.net && this.deferredLoad.net.abort();
				this.deferredLoad.reject();
				this.isGridLoading = false;
			}	
			// 将指针置为加载中状态
			this.isGridLoading = true;			
			var self = this, 
				options = this.options, 
				models = options.models, 
				dict = options.dict, 
				deferred, model, htmlpgn = '';				
			page = page || 0;
			this.deferredLoad = deferred = $.Deferred(function() {
				if (self.tbodys[page]) {
					this.resolve(null, self.total, self.tbodys[page]);
					if (page !== (options.startPage - 1)) {
						if (options.preload && !self.tbodys[page + 1]) {
							_ajax(page + 1, true);
						}
					}					
				} else {
					_ajax(page);
				}
			})
			.done(_done)
			.fail(_fail);	
			
			return deferred;
			function _done(model, total, $page, preload, nodata) {
				self.element.hideLoadMsg();
				var htmltbody = nodata ? '<tr class="ui-state-disabled"><td style="text-align:center;" colspan="' + self.columns + '">暂无数据</td></tr>' : '';
				self.isGridLoading = false;	
				
				if (model && model.length) {
					$.each(model, function(idx, item) {
						$.each(options.dataFilter, function(key, fn) {
							item[key] = fn.apply(item, [item[key]]);
						});
						htmltbody += tmpl(self._tpl, item);
					});
				} 
				if (!$page) {
					$page = $('<tbody>' + htmltbody + '</tbody>').hide();
					self.$thead.after($page);
				}				
				!nodata && (self.tbodys[page] = $page);
				if (!preload) {
					self.$activePage.hide();
					$page.show();
					self.$activePage = $page;
					// self.page = page++; 注意犯低级错误
					self.page = ++page;
					self._trigger('load');
				}
				
				self.total = total;
				self.pages = Math.ceil(self.total / options.count);
				// 可根据实际情况确定是否更新分页组件
			}			
			function _fail() {
				self.isGridLoading = false;
				self.element.hideLoadMsg();
			}
			function _ajax(page, preload) {
				// 注意, 此时deferred尚未构造完毕
				var start, end;
				if (!options.dataUrl.url) {
					start = page * options.count;
					end = start + options.count;
					model = models[dict.tbody].slice(start, end);
					_done(model, models[dict.tbody].length);
				} else {
					self.isGridLoading = true;
					// if (page > self.pages - 1) return _fail();
					var params = {}, _fn;
					params[dict.page] = page;
					params[dict.count] = options.count;
					self.net = $.ajax($.extend(true, {}, options.dataUrl, {
						data: params
					})).done(function(data) {
						model = data[dict.tbody];
						_fn = preload ? _done : deferred.resolve;
						_fn(model, +(data[dict.total]), null, preload, !model.length);
						// 考虑到服务器负载, 只预加载下一页
						// 分页组件初始化时会默认加载第一页
						// 后台静默加载
						if (!preload && options.preload && !self.tbodys[self.page] && (model.length === options.count)) {
							_ajax(self.page, true);
						}						
					}).fail(function() {
						deferred.reject();
					});
				}				
			}
		}, 
		_getSelectedId: function($target) {
			return $target.closest('tr').find('input[type=checkbox]:first').val() || 
			(this.tbodys[this.page - 1] && this.tbodys[this.page - 1].find('input:checked:first').val());		
		}, 
		// 保存更改
		saveChanges: function(e, ajaxOpts) {
			this.$form.submit();
		}, 
		// 删除所选
		delSelected: function(e, ajaxOpts) {
			var 
			self = this, 
            options = this.options, 
			dict = options.dict,
			id = dict.id, 
			data = {};
			
			data[id] = [];
			this.$activePage.find('input:checked').each(function() {
				data[id].push(this.value);
			})
			$.ajax($.extend({
				type: this.$form.attr('method'), 
				data: data
			}, ajaxOpts)).done(function() {
				// 清空缓存, 保正数据唯一
				self.tbodys = [];
				self.reload(e);
			});
		}, 
		// 显示标记的项
		showTagged: function() {}, 
		// 重载
		reload: function(e) {
			this.tbodys = [];
			this.pagination.page = 0;
			this.pagination.select(this.page || this.options.startPage, e);
		}, 
		// 更新
		update: function() {	
			this.tbodys = [];
			this.options.startPage = 1;
			this.init();
		}, 
		destroy: function() {
			// 避免内存泄露
			this.tbodys 
			= this.$activePage 
			= this.$form 
			= this.$thead 
			= null;
		}
	});
	// 微型模板函数
	function tmpl(tpl, data) {
		var html = '';
		if (!$.util || !$.util.tmpl) { 
			var lpos, rpos, key,
				lb = '{', rb = '}', 
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
	}			
})(jQuery);