/** 
 *  VUI's `page` class
 *  
 *  Insprition:
 *  When use with ajax, keep in mind the `pages` may be rolling timely
 *  `seo` option is not secuce since `page` will be updated sometimes
 *  
 *  Usage: 
 *  $(selector).page(options)
 *  
 *  Event:
 *  pageselect
 *
 *  Copyright(c) 2014 xxx.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@xxx.com>
 *  MIT Licensed 
 */
define(function(require, exports) {
	var 
	$ = require('jquery');
	require('jquery.ui.widget');
	require('../vui.widget');
	
	$.widget('vui.page', $.vui.widget, {
		dict: {
			total: 'total'
		}, 
		options: {
			themes: {
				'default': {
					style: {
						page: '', 
						pageDisabled: '',
						pageActive: '', 
						pagePrev: '', 
						pageNext: ''
					}
				}
			}, 
			btns: {
				first: 'First', last: 'Last', prev: 'Prev', next: 'Next'
			},  
			pageSize: 0, 
			// Items per screen 
			count: 0,
			// Total items
			total: 0, 
			// Start point
			startPage: 0, 
			// Only show prev and next
			showPagination: true, 
			// Rely on server's options to update widget timely
			updateTimely: false
		},  
		defaultElement: '<ul/>', 
		// Total pages
		pages: 0,
		// Current page
		page: 0,	
		_create: function() {
			if (!this.options.showPagination) {
				this.options.pageSize = 0;
			}
			this._super.apply(this, arguments);
		},
		_render: function() {
			var options = this.options; 
			this._super.apply(this, arguments);
			this.$active = $(); 
			this.$first = this.element.find('li:first');
			this.$prev = this.element.find('li[page="-1"]');
			this.$next = this.element.find('li[page="+1"]');
			this.$last = this.element.find('li:last');
			this.$pages = this.element.find('li').not([this.$first[0], this.$prev[0], this.$next[0], this.$last[0]]);
			this.pages = options.count ? Math.ceil(options.total / options.count) : 0;
			this.select(this.page || options.startPage, {type: 'click'});
		}, 
		_attachEvent: function() {
			var options = this.options, evtmap = {};
			
			evtmap['click li'] = function(e) {
				this.select($(e.currentTarget).attr('page'), e);
			}; 
			this.on(evtmap);
		}, 
		_getResult: function(eventResult, callbackResult) {
		}, 
		_draw: function(models) {
			var 
            options = this.options, 
            style = options.themes[options.theme].style, 
			pages = 0, size = 0, i = 1, 
			html = '';
			if (options.total) {
				pages = Math.ceil(options.total / options.count), 
				size = Math.min(options.pageSize, pages), i = 1, 		
				html = (options.showPagination ? '<li page="1"><a href="#" >' + options.btns.first + '</a></li>' : '')
						+ '<li page="-1" class="' + style.pagePrev + '"><a href="#" >' + options.btns.prev + '</a></li>';

				if (options.showPagination) 
					for (; i <= size; i++) 
						html += '<li page=""><a href="#"></a></li>';
				
					
				html += '<li page="+1" class="' + style.pageNext + '"><a href="#">' + options.btns.next + '</a></li>'
					+ (options.showPagination ? '<li page="' + pages + '"><a href="#">' + options.btns.last + '</a></li>' : '');
			}

			this.element.addClass(style.page).html(html);
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
			
			// Repeated click
			//if (pageno === this.page) return;

			// Generate range(current visible paginations)
			if (pageno + mid > this.pages) {
				i = pagesz;
				pages = this.pages;
				while (i--) {
					range[i] = pages--;
				}						
			} else if (pageno > mid) {
				for (; i < pagesz; i++, mid--) {
					range[i] = pageno - mid;
				}
			} else {
				i = pagesz;
				while (i--) {
					range[i] = i + 1;
				}
			} 
			addOrRemove = (pagesz <= 1) ? 'addClass' : 'removeClass';
			if (pageno === 1) {
				this.$first.add(this.$prev)				
					.addClass(style.pageDisabled)
					.addClass('ui-state-disabled');
				this.$next.add(this.$last)
					[addOrRemove](style.pageDisabled)
					[addOrRemove]('ui-state-disabled');
			} else if (pageno === this.pages) {
				this.$next.add(this.$last)
					.addClass(style.pageDisabled)
					.addClass('ui-state-disabled');
				this.$first.add(this.$prev)
					[addOrRemove](style.pageDisabled)
					[addOrRemove]('ui-state-disabled');
			} else {
				this.$first.add(this.$prev).add(this.$next).add(this.$last)
					.removeClass(style.pageDisabled)
					.removeClass('ui-state-disabled');
			}

			// Update paginations
			this.$pages.each(function(idx) {
				var $this = $(this), val = range[idx];
				if ($this.attr('page') !== val) {
					$this.attr('page', val);
					$this.children('a').text(val);
				}
			});
			// Get focus
			this.$active.length && this.$active.removeClass(style.pageActive);
			$focus = this.$pages.filter('[page=' + pageno + ']').addClass(style.pageActive);
			this.$active = $focus;
			if (!(e instanceof $.Event)) {
				e = $.Event(e);
			}
			e.target = this.$active[0];
			e.type = 'select';
			// When page is initialized at the first, `this.page` is zero
			// Sometimes, `this.page` is passed by third-party may be a string
			if (!this.page || (this.page != pageno)) {
				this.page = pageno;
				this._trigger(e, [pageno, this.pages]);	
			}				
		}
	});
});