/** 
 * popover: 集dialog, tooltip功能于一身
 *
 * 使用方法: 
 * 1. $('xxform').popover({options})
 *
 * 事件: popready, popclose, popcancel, popok
 */

		
(function($) {

	$.widget('hijax.popover', $.hijax.widget, {
		options: {
			event: 'click', //  click | hover | focus | manual
			themes: {
				'default': {
					style: {
						popOver: '',
						popArrow: '', 
						popTitle: '', 
						popContent: '', 
						popTop: '',
						popLeft: '',
						popBottom: '',
						popRight: ''
					}
				}
			}, 	
			placement: 'right', 
			title: '', 
			content: '', 
			// 延迟消失
			delay: 0, 
			// 可手动关闭
			closable: false,
			// 标识popover类型, 值由第三方提供
			type: ''
			
		},  
		widgetEventPrefix: 'pop', 
		_attachEvent: function() {
			var self = this, 
				options = this.options, 	
				clspfx = this.namespace + '-' + options.prefix, 
				clsclose = clspfx + '-close', 
				evtmap = {}, popevtmap = {};
			// 考虑以下几种情况: 1. 窗体大小可变, 2. 响应式布局(含流体布局)元素的大小可变 
			// 因而, 获取元素的position定位要比offset定位靠谱
			evtmap[options.event] = function(e) {
				this.show();
			};
			
			popevtmap['click .' + clsclose] = function(e) {
				var evt = $.Event('close');
				this._trigger(evt);
				if (!evt.isDefaultPrevented()) {
					this.hide();
				}
			}
			$.extend(popevtmap, {
				'mouseenter': function(e) {
					if (this.timer) {
						clearTimeout(this.timer);
						this.timer = null;
					}
				}, 
				'mouseleave': function(e) {
					options.delay && (this.timer = this._delay('hide', options.delay));
				}			
			});
			this._on(evtmap);
			this._on(this.$popover, popevtmap);
		}, 
		_paint: function(models) {
			var 
			options = this.options, 
			style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix, 
			clsover = clspfx + '-over',
			clsarrow = clspfx + '-arrow', 
			clstitle = clspfx + '-title', 
			clscontent = clspfx + '-content', 
			clsclose = clspfx + '-close', 
			html = '<div class="' + clsover + ' ' + style.popOver + ' ' + options.type + ' ' + style['pop' + ucfirst(options.placement)] + '">' 
			+ '<div class="' + clsarrow + ' ' + style.popArrow + '"></div>' 
			+ (options.clstitle ? '<h3 class="' + clstitle + ' ' + style.popTitle + '">' + options.title + '</h3>' : '') 
			+ '<div class="' + clscontent + ' ' + style.popContent + '">' + options.content + '</div>'
			+ (options.closable ? '<button type="button" class="' + clsclose + ' ' + style.popClose + '" aria-hidden="true">&times;</button>' : '') 
			+ '</div>';
			this.$popover = $(html).css({'position': 'absolute'}).hide().appendTo(this.element.parent());
		}, 
		show: function() {
			// 适用于不可见的自由宽高元素
			this.$popover.show();
			var 
			options = this.options, 	
			clspfx = this.namespace + '-' + options.prefix, 
			clsarrow = clspfx + '-arrow', 				
			$arrow = this.$popover.find('.' + clsarrow), 
			
			arwsz = {w: $arrow.outerWidth(), h: $arrow.outerHeight()}, 
			docsz = {w: this.document.width(), h: this.document.height()}, 
			tgtsz = {w: this.element.outerWidth(), h: this.element.outerHeight()}, 
			arwofs = $arrow.position(), 
			docofs = {top: this.document.scrollTop(), left: this.document.scrollLeft()}, 		
			tgtofs = this.element.position(), 
			popsz = {w: this.$popover.outerWidth(), h: this.$popover.outerHeight()}, 
			popofs, 
			margin = {top: $arrow.outerHeight(true) - arwsz.h, left: $arrow.outerWidth(true) - arwsz.w}, 
			top, left, bottom, right;
			
			switch (options.placement) {
				case 'top': 
					top = true;
				case 'bottom':
					bottom = true;
					left = tgtofs.left + (tgtsz.w / 2) - (popsz.w / 2);
					dist = arwofs.left + (arwsz.w / 2) + margin.left - (popsz.w / 2);
					popofs = {top: top ? (tgtofs.top - popsz.h) : (tgtofs.top + tgtsz.h), left: left - dist};
					break;
				case 'left':
					left = true;
				case 'right':
					right = true;
					top = tgtofs.top + (tgtsz.h / 2) - (popsz.h / 2);
					dist = arwofs.top + (arwsz.h / 2) + margin.top - (popsz.h / 2);
					popofs = {left: left ? (tgtofs.left - popsz.w) : (tgtofs.left + tgtsz.w), top: top - dist};
					break;
			}
			// 超出视窗
			// top && (popofs.top < docofs.top) && (popofs.top = tgtofs.top + tgtsz.h);
			// left && (popofs.left < docofs.left) && (popofs.left = tgtofs.left + $tgtsz.w);
			// right && (popofs.left + popsz.w > docofs.left + docsz.w) && (popofs.left = tgtofs.left - popsz.w);
			// bottom && (popofs.top + popsz.h > docofs.top + docsz.h) && (popofs.top = tgtofs.top - popsz.h);
			this.$popover.css(popofs);
			options.delay && (this.timer = this._delay('hide', options.delay));
			return this;
		},
		hide: function() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			this.$popover.hide();
			return this;
		}, 
		// 小范围dom更新, 相当于dom操作
		// 区别组件的更新(对应更新options, events)
		// 待删(可抽到业务逻辑中去), 仅留作对比
		update: function(options) {
			var 
			style = this.options.themes[this.options.theme].style, 
			clspfx = this.namespace + '-' + this.options.prefix, 
			clstitle = clspfx + '-title', 
			clscontent = clspfx + '-content'; 
			
			options.type && this.$popover.removeClass(this.options.type).addClass(options.type);
			options.title && this.$popover.find('.' + clstitle).html(options.title);
			options.content && this.$popover.find('.' + clscontent).html(options.content);
			return this;
		}
	});
	
	// 将字符串的首字母转换为大写
	function ucfirst(str) {
		return (!$.util || !$.util.ucfirst) ? 
			str.replace(/^([a-z])/i, function (m) { return m.toUpperCase(); }) : 
			$.util.ucfirst(str);
	};	
})(jQuery);