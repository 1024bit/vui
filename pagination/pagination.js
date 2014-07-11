/** 分页组件 
 使用方法: 
 * $('xxx').pagination(options)
 事件:
 * pageselect
 */

(function($) {
	$.widget('hijax.pagination', $.hijax.widget, {
		dict: {
			total: 'total'
		}, 
		options: {
			prefix: 'page', 
			themes: {
				'default': {
					style: {
						page: '', 
						pageDisabled: '',
						pageActive: ''
					}
				}
			}, 
			// 奇数
			pageSize: 5, 
			// 每屏数据数量
			count: 10,
			// 总数据量			
			total: 0, 
			// 起始页
			startPage: 1, 
			// 备用远程地址, 用以获取total
			url: ''
		},  
		widgetEventPrefix: 'page', 
		defaultElement: '<ul/>', 
		$active: $(), 
		// 总页数
		pages: 0,
		// 当前页码
		page: 0,
		_createWidget: function(options, element) {	
			if ($.type(options.url) === 'string') {
				options.url = {url: options.url}
			}
			if (!options.total && !options.url) {
				return;
			}
			if (!$.nodeName((options.element && options.element[0]) || element, 'ul')) {
				return $.error("Only can initialize on ul element");
			}	
			$.hijax.widget.prototype._createWidget.apply(this, arguments);
		}, 
		_create: function() {
			var options = this.options;
			if (!options.total) {
				$.ajax(options.url).done(function(data) {
					options.total = data[options.dict.total];
					$.hijax.widget.prototype._create.apply(this, arguments);					
				});
			} else {
				$.hijax.widget.prototype._create.apply(this, arguments);
			}
		}, 		
		_attachEvent: function() {
			this._on({
				'click li': function(e) {
					this.select($(e.currentTarget).attr('page'), e);
				}
			});
		}, 
		_paint: function(models) {
			var 
            options = this.options, 
            style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix,
			pages = 0, size = 0, i = 1, 
			html = '';
			if (options.total) {
				pages = Math.ceil(options.total / options.count), 
				size = Math.min(options.pageSize, pages), i = 1, 		
				html = '<li page="1" aria-disabled class="ui-state-disabled ' + style.pageDisabled + '"><a href="#" >首页</a></li>'
						+ '<li page="-1" aria-disabled class="ui-state-disabled ' + style.pageDisabled + '"><a href="#" >上一页</a></li>';

				for (; i <= size; i++) {
					html += '<li page=""><a href="#"></a></li>';
				}
					
				html += '<li page="+1"><a href="#">下一页</a></li>'
					+ '<li page="' + pages + '"><a href="#">末页</a></li>';
			}

			this.element.addClass(style.page).html(html);
			this.$first = this.element.find('li:first');
			this.$prev = this.element.find('li[page="-1"]');
			this.$next = this.element.find('li[page="+1"]');
			this.$last = this.element.find('li:last');
			this.$pages = this.element.find('li').not([this.$first[0], this.$prev[0], this.$next[0], this.$last[0]]);
			this.pages = pages;
			this.select(options.startPage, {type: 'click'});
		}, 
		select: function(pageno, e) {
			e = e || {};
			var 
            options = this.options, 
            style = options.themes[options.theme].style, 	
			pagesz = Math.min(options.pageSize, this.pages), 
			mid = Math.floor(pagesz / 2), 
			range = [], i = 0, addOrRemove = '';

			if ($.type(pageno) === 'string') {
				switch (pageno.charAt(0)) {
					case '+': 
						pageno = this.page + 1;
						break;
					case '-': 
						pageno = this.page - 1;
						break;
				}
				pageno *= 1;
			}

			// 重复点击
			// if ((pageno === this.page) || (pageno <= 0) || (pageno > this.pages)) return;
			if (pageno === this.page) return;
			this.page = pageno;

			if (pageno + mid > this.pages) {
				i = pagesz;
				pages = this.pages;
				while (i--) {
					range[i] = pages--;
				}						
			} else if (pageno > mid) {
				// 生成range
				for (; i < pagesz; i++, mid--) {
					range[i] = pageno - mid;
				}
			} else {
				i = pagesz;
				while (i--) {
					range[i] = i + 1;
				}
			} 
			if (pageno === 1) {
				this.$first.add(this.$prev)
					// .attr('aria-disabled', true)						
					.addClass(style.pageDisabled)
					.addClass('ui-state-disabled');
				addOrRemove = (pagesz === 1) ? 'addClass' : 'removeClass';
				this.$next.add(this.$last)
					[addOrRemove](style.pageDisabled)
					[addOrRemove]('ui-state-disabled');
			} else if (pageno === this.pages) {
				this.$next.add(this.$last)
					.addClass(style.pageDisabled)
					.addClass('ui-state-disabled');
				addOrRemove = (pagesz === 1) ? 'addClass' : 'removeClass';
				this.$first.add(this.$prev)
					[addOrRemove](style.pageDisabled)
					[addOrRemove]('ui-state-disabled');			
			} else {
				this.$first.add(this.$prev).add(this.$next).add(this.$last)
					.removeClass(style.pageDisabled)
					.removeClass('ui-state-disabled');
			}

			// 更新页码
			this.$pages.each(function(idx) {
				var $this = $(this), val = range[idx];
				if ($this.attr('page') !== val) {
					$this.attr('page', val);
					$this.children('a').text(val);
				}
			});
			// 获焦
			this.$active.length && this.$active.removeClass(style.pageActive);
			$focus = this.$pages.filter('[page=' + pageno + ']').addClass(style.pageActive);
			this.$active = $focus;
			e.target = this.$active[0];
			this._trigger('select', e, [pageno, this.pages]);			
		},
		// 更新
		update: function() {
			this.page = 0;
			this.options.startPage = 1;
			this._paint();
		}, 
		destroy: function() {
			this.$active 
			= this.$first 
			= this.$prev 
			= this.$next 
			= this.$last 
			= this.$pages 
			= null;
		}
	});
})(jQuery);