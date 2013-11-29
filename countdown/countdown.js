/** 
 * 倒计时组件
 *
 * 使用方法: 
 * $('xxx').countdown(options)
 *
 * 事件:
 * countdownstart(Global Event), coundownover, countdownstop(Global Event)
 */
(function($) {
	$.widget('hijax.countdown', $.hijax.widget, {
		options: {
			date: null, 
			// 是否显示天
			showDay: true,
			// 0 -> 00
			leadingZero: false,
			// 默认自动开始倒计时
			autoStart: true, 
			show: null, 
		},  
		_createWidget: function(options, element) {
			this._super(options, element);
			var cls = this.constructor, uuid = this.widgetFullName + '-' + this.uuid;
			this.getCountdown();
			
			if (options.autoStart) {
				cls.timerInstance[uuid] = this;
				if (!cls.timer) {
					this._trigger('start');
					cls.timer = setInterval(function() {
						$.each(cls.timerInstance, function() {
							this.getCountdown();
						});
					}, 100);
				}
			}
		}, 
		getCountdown: function() {
			var 
			options = this.options, 
			cls = this.constructor, uuid = this.widgetFullName + '-' + this.uuid, 
			result = [], dt, d, h, m, s;
			
			// 参考时间为当前时区的时间
			dt = new Date(options.date + (new Date().getTimezoneOffset() * 60 * 1000));
			if (options.showDay) {
				d = parseInt(dt / (24 * 3600 * 1000), 10) + '';
				if (d.length === 1) d = '0' + d;
				result.push(d);
			}
			
			if (!d && !h && !m && !s) {
				delete cls.timerInstance[uuid];
				this._trigger('over');
				if ($.isEmptyObject(cls.timerInstance)) {
					clearInterval(cls.timer);
					cls.timer = 0;
					this._trigger('stop');
				}
			}
			
			h = dt.getHours() + '';
			m = dt.getMinutes() + '';
			s = dt.getSeconds() + '';

			if (options.leadingZero) {
				if (h.length === 1) h = '0' + h;
				if (m.length === 1) m = '0' + m;
				if (s.length === 1) s = '0' + s;
			}
			result.concat([h, m, s]);
			this.show(result);
		}, 
		show: function(countdown) {
			var options = this.options;
			if ($.isFunction(options.show)) {
				options.show.apply(this, arguments);
			}
			this._show(countdown);
		}, 
		_show: function(countdown) {
			this.element.html(countdown.join(':'));
		}, 
		destroy: function() {
			this._super();
			delete this.constructor.timerInstance[this.widgetFullName + '-' + this.uuid];
		}
		
	});
	// 定时器
	$.hijax.countdown.timer = 0;
	// 开启定时器的实例
	$.hijax.countdown.timerInstance = {};
})(jQuery);