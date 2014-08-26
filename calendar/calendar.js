/** 
 * 日历组件
 * 配置项参考自: http://www.bootcss.com/p/bootstrap-datetimepicker/ 
 *
 * 使用方法: 
 * $('xxx').calendar(options)
 *
 * 事件:
 *
 * TODO: 
 * 农历支持
 */
(function($) {
	$.widget('hijax.calendar', $.hijax.widget, {
		options: {
			// 数据源
			models: {
				footer: {
					'today': {title: 'Today', href: 'javascript:today;'}, 
					'next': {title: 'Next', href: 'javascript:next;'},
					'prev': {title: 'Prev', href: 'javascript:prev;'}
				}
			}, 
			dict: {
				footer: 'footer', title: 'title', href: 'href'
			}, 
			themes: {
				'default': {
					style: {
						// 日期项
						date: '',
						// 焦点日期项
						activeDate: '',
						selectedDate: '',
						edgeDate: '', 
						rangeStart: '', 
						rangeEnd: '', 
						// 主体容器
						body: '',
						// 日期表格
						dateTable: '',
						// 底部容器
						footer: '', 
						// 操作按钮
						btn: '', 
					}
				}
			}, 	
			// 数组表示日期范围
			initialDate: new Date(), 
			// 周的第一天(周日)
			weekStart: 0, 
			// 开始时间
			startDate: '',
			// 结束时间
			endDate: '', 
			// 选中日期的格式
			format: 'yyyy-mm-dd', 
			// 视图日期的格式: 使用sprintf对日期项进行格式化, 默认为空, 可提升性能
			viewFormat: {
				decade: '', year: 'M', month: '', day: 'h:00', hour: 'h:ii'
			}, 
			// 视图表头日期的格式
			viewCaptionFormat: {
				decade: 'yyyy-yyyy', year: 'yyyy', month: 'M yyyy', day: 'd MM yyyy', hour: 'd MM yyyy'
			},
			placement: 'right', 
			startView: 'month', 
			minView: 'month',
			maxView: 'decade', 
			// en, zh-CN
			language: 'en', 
			daysOfWeekDisabled: [], 
			// 相邻分钟差值
			minuteStep: 5, 
			// 相邻视图差值
			viewStep: ['1h', '1d', '1m', '1y', '10y'], 
			todayHighlight: true, 

			showMeridian: false, 
			// 同时显示两个并列的视图
			showDouble: false, 
			autoclose: true, 
			autoselect: true, 
			
			message: {
				argError: ''
			}
		},  
		views: ['hour', 'day', 'month', 'year', 'decade'], 
		// 不加入配置项: IE8及以下版本, Data.parse解析格式必须满足: yyyy/m/d (分隔符为斜线) 
		_format: {
			hour: 'yyyy/m/d h:ii', day: 'yyyy/m/d h:00', month: 'yyyy/m/d', year: 'yyyy/m/1', decade: 'yyyy/1/1'
		}, 
		// 日期范围
		range: [], 
		_create: function() {
			var 
			options = this.options, 
			i = $.inArray(options.startView, this.views), min = $.inArray(options.minView, this.views), max = $.inArray(options.maxView, this.views);

			if (i > max || i < min) {
				return this.raise({
					type: 'error', 
					message: options.message.argError
				});
			}
			
			options.initialDate = [].concat(options.initialDate);
			options.initialDate.length = Math.min(options.initialDate.length, 2);
			options.initialDate.sort(function(a, b) {
				return a - b;
			});
			// 拷贝数组
			this.range = [].concat(options.initialDate);
		
			this._super();
		}, 
		_attachEvent: function() {
			var 
			self = this, 
            options = this.options, 
			clspfx = this.namespace + '-' + options.prefix, 
			evtmap = {
				'click caption': function(e) {
					if (this.activeView + 1 > $.inArray(options.maxView, this.views)) return;
					this.createView(self.parse($(e.currentTarget).parent().attr('date')), this.activeView + 1);					
				}				
			};

			this._on(evtmap);
			this._on(true, {
				'click td': function(e) {
					var options = this.options, date = self.parse($(e.currentTarget).attr('date'));
					this.selectRange(this.range[1], date);
					if (this.activeView - 1 < $.inArray(options.minView, this.views)) {
						
						if (options.autoclose && options.autoselect) {
							this.close();
						}
						return;
					}
										
					this.$body.html(this.createView(date, this.activeView - 1));
					
				}			
			});
			
			this._super();
		}, 		
		_draw: function(models) {
			var 
			self = this, 
			options = this.options, 
			style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix, 
			clsbody = clspfx + '-body', 
			dict = options.dict, 
			footer = models[dict.footer], 
			html = '<div class="' + style.body + ' ' + clsbody + '"></div>';

			if (!$.isEmpty(footer)) {
				html += '<div class="' + style.footer + '">';
				$.each(footer, function(key) {
					html += '<button type="button" class="' + style.btn + ' ' + style[style.btn + $.ucfirst(key)] + '" href="' + this[dict.href] + '">' + this[dict.title] + '</button>';
				});
				html += '</div>';
			}

			this.element.html(html);
			this.$body = this.element.find('.' + clsbody).html(this.createView(options.initialDate[0], options.startView));
			this.selectRange();

		}, 
		// 定位到今天
		today: function() {
		},
		// 选择日期		
		select: function() {},
		// 关闭控件
		close: function() {}, 
		// view: hour(0) day(1) month(2) year(3) decade(4)
		createView: function(date, view, showDouble) {
			if (showDouble !== false) showDouble = true;
			view = ($.type(view) === 'number') ? this.views[view] : view.toLowerCase();
			this.activeView = $.inArray(view, this.views);
			if (!~this.activeView) return;		
			
			var 
			self = this, 
			options = this.options, 
			style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix, 
			lang = this.constructor.lang[options.language], 
			year = date.getFullYear(), 
			month = date.getMonth(), // (0~11)
			day = date.getDate(), // (1~31)
			// wday: week day
			wday = date.getDay(), // (0~6)
			hour = date.getHours(), // (0~23)
			minute = date.getMinutes(), // (0~59)
			ismonth = (view === 'month'), 
			isdecade = (view === 'decade'), 
			cols = ismonth ? 7 : 4, 
			i, item, items, 
			$html, html, frag = '', 
			_format = this._format[view], 
			
			_show = {
				// 十年视图
				decade: function () {
					var 
					years = [], 
					// 个位
					units = (year + '').slice(-1), 
					year0 = year - units - 1;
					
					i = 0;
					while (i < 12) {
						item = {text: year0 + (i++)};
						item.date = new Date(item.text, 0);
						years.push(item);
					}
					return years;
				}, 
				// 年视图
				year: function() {
					var months = [];
					i = 0;
					while (i < 12) {
						item = {text: i + 1};
						item.date = new Date(year, i++);
						months.push(item);
					}
					return months;
				}, 
				// 月视图
				month: function() {
					var 
					days = [], 
					// 0: from, 2: to
					month0 = month, 
					year0 = year, 
					month2 = month, 
					year2 = year, 
					daysofmonth, 
					daysofweek = 7, 
					// 月初(1号)是星期几
					fstwday, 
					// 月末是星期几
					lstwday, 
					len;
					
					// 去年
					i = 0;
					if (month === 0) {
						year0 -= 1;
						month0 = 12;
					}
					fstwday = new Date(year, month, 1).getDay();
					daysofmonth = self.getDaysOfMonth(month0 - 1, year0);
					len = fstwday - !!options.weekStart;
					(len < 0) && (len += daysofweek);
					// 上月显示天数
					while (i < len) {
						item = {text: daysofmonth - i++};
						item.date = new Date(year0, month0 - 1, item.text);
						days.unshift(item);
					}

					// 今年
					i = 0;
					len = self.getDaysOfMonth(month, year);
					// 当月显示天数
					while (i < len) {
						item = {text: ++i};
						item.date = new Date(year, month, item.text);
						days.push(item);
					}
					
					// 明年
					i = 0;
					if (month === 11) {
						year2 += 1;
						month2 = -1;
					}
					lstwday = new Date(year, month, len).getDay();
					len = daysofweek - !options.weekStart - lstwday;
					(len === daysofweek) && (len = 0);
					// 下月显示天数
					while (i < len) {
						item = {text: ++i};
						item.date = new Date(year2, month2 + 1, item.text);
						days.push(item);
					}
					return days;
				}, 
				// 天视图
				day: function() {
					var hours = [];
					i = 0;
					while (i < 24) {
						item = {text: i++};
						item.date = new Date(year, month, day, item.text);	
						hours.push(item);
					}
					return hours;
					
				}, 
				// 小时视图
				hour: function() {
					var minutes = [];
					i = 0;
					while (i < 60) {
						item = {text: i};
						item.date = new Date(year, month, day, hour, item.text);
						minutes.push(item);
						i += options.minuteStep;
					}
					return minutes;
				}
			};
			minute = minute - (minute % options.minuteStep);

			items = _show[view]();

			html = '<table date="' + date + '"><caption>' + this.sprintf(options.viewCaptionFormat[view], isdecade ? {year: [items[1].date.getFullYear(), items[10].date.getFullYear()]} : date) + '</caption>';
			if (ismonth) {
				frag = '<th>' + lang.mo + '</th><th>' + lang.tu + '</th><th>' + lang.we + '</th><th>' + lang.th + '</th><th>' + lang.fr + '</th><th>' + lang.sa + '</th>'
				html += '<thead><tr>' + (options.weekStart ? (frag + '<th>' + lang.su + '</th>') : ('<th>' + lang.su + '</th>' + frag)) + '</tr></thead>';
			}
			i = 0;
			while (i < items.length) {
				item = items[i];
				if (!(i % cols)) {
					html += (i === 0) ? '<tbody><tr>' : '</tr><tr>';
				}
				html += '<td date="' + this.sprintf(_format, item.date) + '" class="' + style.date + '">' + (options.viewFormat[view] ? this.sprintf(options.viewFormat[view], item.date) : item.text) + '</td>';
				i++;
			}
			html += '</tr></tbody></table>';

			$html = $(html);
			if (view === 'month') {
				$html.find('td:not([date^="' + this.sprintf(_format.split(/([^\w]+)/).slice(0, 3).join(''), date) + '"])').addClass(style.edgeDate);
			}
			if (view === 'decade') {
				$html.find('td:first, td:last').addClass(style.edgeDate);				
			}
			$html.find('td[date="' + this.sprintf(_format, options.initialDate[0]) + '"]').not('.' + style.edgeDate).addClass(style.activeDate);						
			
			
			if (showDouble && options.showDouble) {
				// '+h', '+1d', '+1m', '+1y', '+1y'
				$html = $html.add(this.createView(this.parse('+' + options.viewStep[this.activeView], date, true), view, false));
			} 

			return $html;
		}, 
		// 选择日期范围
		selectRange: function(rangeStart, rangeEnd) {
			var 
			self = this, 
			options = this.options, 
			style = options.themes[options.theme].style, 
			_format = this._format[this.views[this.activeView]], 
			$td, 
			date;		

			if (this.activeView - 1 < $.inArray(options.minView, this.views)) {
				/*
				rangeStart = rangeStart || this.range[0];
				rangeEnd = rangeEnd || this.range[1];
				
				this.range = [rangeStart, rangeEnd];
				
				options.autoselect && this.option('initialDate', [].concat(this.range));					
			
				//this.$body.find('[date="' + this.sprintf(_format, this.range[0]) + '"]').addClass(style.rangeStart);
				//this.$body.find('[date="' + this.sprintf(_format, this.range[1]) + '"]').addClass(style.rangeEnd);			
				this.$body.find('td').each(function() {
					$td = $(this);
					date = self.parse($td.attr('date'));
					$td.toggleClass(style.selectedDate, (date > rangeStart) && (date < rangeEnd));
				});
				*/
			}		
		}, 
		// 获取某年某月的天数
		getDaysOfMonth: function(month, year) {
			// 天/月
			var daypermonth = {
				'31': [1, 3, 5, 7, 8, 10, 12],
				'30': [4, 6, 9, 11]
			}, 	key, i;	
				
			month += 1;
			// 润年或平年
			(year % 4) ? (daypermonth['28'] = [2]) : (daypermonth['29'] = [2]);	
			
			for (key in daypermonth) {
				for (i in daypermonth[key]) {
					if (month === daypermonth[key][i]) {
						return key * 1;
					}
				}
			}
		}, 
		// 日期格式化
		sprintf: function(format, date) {
			
			/**
			 * ISO 8601: yyyy-mm-ddThh:mm:ss[.mmm]
			 * T 表示后面是日期时间值的时间部分;
			 * UTC时间最后加一个大写字母Z，其他时区用实际时间加时差表示
			 * 方括号表示秒成分的这个小数部分是可选的; 时间成分以 24 小时格式指定
			 *
			 * 日期格式: p, P, h, hh, i, ii, s, ss, d, dd, m, mm, M, MM, yy, yyyy的任意组合
			 * p : meridian in lower case ('am' or 'pm') - according to locale file
			 * P : meridian in upper case ('AM' or 'PM') - according to locale file
			 * s : seconds without leading zeros
			 * ss : seconds, 2 digits with leading zeros
			 * i : minutes without leading zeros
			 * ii : minutes, 2 digits with leading zeros
			 * h : hour without leading zeros - 24-hour format
			 * hh : hour, 2 digits with leading zeros - 24-hour format
			 * H : hour without leading zeros - 12-hour format
			 * HH : hour, 2 digits with leading zeros - 12-hour format
			 * d : day of the month without leading zeros
			 * dd : day of the month, 2 digits with leading zeros
			 * m : numeric representation of month without leading zeros
			 * mm : numeric representation of the month, 2 digits with leading zeros
			 * M : short textual representation of a month, three letters
			 * MM : full textual representation of a month, such as January or March
			 * yy : two digit representation of a year
			 * yyyy : full numeric representation of a year, 4 digits	
			 */	
			if (~$.inArray($.type(date), ['string', 'number'])) {
				date = new Date(Date.parse(date));
			}
			if ($.type(date) === 'date') {
				date = {
					year: date.getFullYear(), 
					month: date.getMonth() + 1, 
					day: date.getDate(), 
					hour: date.getHours(), 
					minute: date.getMinutes(), 
					second: date.getSeconds(), 
					millisecond: date.getMilliseconds()
				};
			}
			 
			var 
			datestr = '', 
			year = date.year, 
			month = date.month,  // (1 ~ 12) 
			day = date.day, // (1 ~ 31) 
			hour = date.hour, // (0 ~ 23) 
			hour12 = (hour < 12) ? hour : (hour - 12), 
			minute = date.minute, // (0 ~ 59) 
			second = date.second, // // (0 ~ 59) 
			millisecond = date.millisecond, // (0 ~ 999) 
			re = /P|p|ss|s|ii|i|hh|h|HH|H|dd|d|mm|m|MM|M|yyyy|yy|.+?/g, 
			rule = {
				// year
				'yyyy': year, 
				'yy': (year + '').slice(-2), 
				// month
				'm': month, 
				'mm': ((month + '').length === 1) ? ('0' + month) : month, 
				'MM': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month - 1], 
				'M': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1], 
				// day
				'd': day, 
				'dd': ((day + '').length === 1) ? ('0' + day) : day, 
				// hour
				'h': hour, 
				'hh': ((hour + '').length === 1) ? ('0' + hour) : hour, 
				'H': hour12,
				'HH': ((hour12 + '').length === 1) ? ('0' + hour12) : hour12,
				// minute
				'i': minute, 
				'ii': ((minute + '').length === 1) ? ('0' + minute) : minute, 
				// second
				's': second, 
				'ss': ((second + '').length === 1) ? ('0' + second) : second, 
				'P': (hour < 12) ? 'am' : 'pm', 
				'p': (hour < 12) ? 'AM' : 'PM'
			}, 
			matches = format.match(re), match, 
			// 记录标识符被匹配的次数
			counter = {};

			$.each(matches, function() {
				match = this;
				if (match in rule) {
					if ($.isArray(rule[match])) {
						counter[match] = counter[match] || 0;
						datestr += rule[match][counter[match]++];
					} else {
						datestr += rule[match];
					}
					
				} else {
					datestr += match;
				}
			});
			return datestr;
		},
		// 将日期字符串转换为日期对象
		// Date.parse识别ISO 8601格式(UTC标准)和1970#01#01%00:00(GMT标准), 
		// GMT标准下, 分隔符支持除了字母, 数字以外的其他符号(#, %...)
		parse: function(datestr, date, floor) {
			if ($.type(datestr) === 'date') return datestr;
			// if (datestr * 1 == datestr) return new Date(datestr * 1);
			if (!~$.inArray(datestr.charAt(0), ['-', '+'])) return new Date(Date.parse(datestr));
			// A timedelta relative to (date || today), eg '-1d', '+6m +1y', etc, where valid units are 's' (second), 'i' (minute), 'h' (hour), 'd' (day), 'w' (week), 'm' (month), and 'y' (year).
			date = date ||  new Date();		
			date = {
				'4': date.getFullYear(), 
				'3': date.getMonth(),  // (0~11) 
				'2': date.getDate(), // (1~31) 
				'1': date.getHours(), // (0~23) 
				'0': date.getMinutes(), // (0~59)
				'-1': date.getSeconds()				
			};

			var self = this, delta, key, 
			// 快捷键
			map = {
				y: '4', 
				m: '3', 
				d: '2', 
				h: '1', 
				i: '0', 
				s: '-1',
				'4': 'y', 
				'3': 'm', 
				'2': 'd', 
				'1': 'h', 
				'0': 'i'
			};
			
			// 不大于当前日期的最大日期
			if (floor) {
				$.each(date, function(key){
					if (self.activeView > key) {
						date[key] = (key == 2) * 1; // day (1~31)
					}
				});
			}

			// '1y 1d ...'
			$.each(datestr.split(' '), function() {
				delta = this.slice(0, -1) * 1;
				key = this.slice(-1);
				if (map[key] in date) {
					date[map[key]] += delta;
				}
			});
			// new Date(2000) vs. new Date(2000, 0)
			// 现代浏览器中, Date构造函数支持数组参数; IE9及以下版本不支持
			return new Date(date['4'], date['3'], date['2'], date['1'], date['0'], date['-1']);
		}, 
		// 下一视图
		next: function() {
			var 
			options = this.options, 
			$table = this.$body.find('table');
			
			$table.first().remove();
			this.$body.append(this.createView(this.parse('+' + options.viewStep[this.activeView], this.parse($table.last().attr('date')), true), this.activeView, false));
			this.selectRange();
		}, 
		// 上一视图
		prev: function() {
			var 
			options = this.options, 		
			$table = this.$body.find('table');
			
			$table.last().remove();
			this.$body.prepend(this.createView(this.parse('-' + options.viewStep[this.activeView], this.parse($table.first().attr('date'), true)), this.activeView, false));			
			this.selectRange();
		}
	});
	// i18n
	$.hijax.calendar.lang = {};
})(jQuery);