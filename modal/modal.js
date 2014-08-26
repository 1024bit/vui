/** 
 *  VUI's `modal` class
 * 
 *  Usage: 
 *  $(selector).modal({
 *  	ok: function() {}, 
 *  	confirm: function() {}, 
 *  	cancel: function() {}
 *  })
 *  
 *  Event:
 *  modalclose, modalcancel, modalok, modalconfirm, ...
 *
 *  Copyright(c) 2014 vip.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@vip.com>
 *  MIT Licensed 
 */
define(function(require, exports) {
	var 
	$ = require('jquery'), 
	util = require('../vui.util');
	require('jquery.ui.widget');
	require('../vui.widget');

	$.widget('vui.modal', $.vui.widget, {
		options: {
			themes: {
				'default': {
					style: {
						modal: '',
						modalTitle: '',
						modalContent: '',
						modalBtns: '',
						// String or array
						modalBtn: '', 
						modalMask: '', 
						modalClose: ''
					}
				}
			}, 	
			title: '', 
			content: '', 
			// Modal type, value is provided by the third party
			type: '', 
			// Modal btns: ok, confrim, cancel and other custom, support HTML tag
			btns: [
				{value: 'Ok', event: 'ok'} // button's value and responsive event
			], 
			// Whether only one instance can be show at the same time
			xor: false, 			
			// By default, hide mask
			showMask: false
		},  
		_create: function() {
			var 
			options = this.options, 
			style = options.themes[options.theme].style;
			
			if ('string' === typeof style.modalBtn) {
				style.modalBtn = [style.modalBtn];
			}
			this._super.apply(this, arguments);
			this.show();
		}, 
		option: function() {
			if (this.options.optionChange) {
				this.$modal.remove();
				this.constructor.$mask.hide();	
			}			
			this._super.apply(this, arguments);
			return this;
		}, 
		_attachEvent: function() {
			var 
			self = this, 
			options = this.options, 	
			clsclose = options.classPrefix + '-close', 
			clsbtn = options.classPrefix + '-btn', 
			modalevtmap = {};
			
			modalevtmap['click .' + clsbtn] = function(e) {
				if (this._trigger($(e.target).data('vui-event'))) {
					this.close();
				} 
			};

			this._on(this.$modal, modalevtmap);
		}, 
		_draw: function(models) {
			var 
			options = this.options, 
			style = options.themes[options.theme].style, 
			clspfx = options.classPrefix,
			clsmodal = clspfx,
			clstitle = clspfx + '-title', 
			clscontent = clspfx + '-content', 
			clsclose = clspfx + '-close', 
			clsbtns = clspfx + '-btns', 
			clsbtn = clspfx + '-btn', 
			clsmask = clspfx + '-mask', 
			i = 0, btns = options.btns, 
			html, $mask, htmlbtn = '';
			
			if ('string' === typeof btns) {
				htmlbtn = btns;
			} else if (btns.length) {
				for (; i < btns.length; i++) {
					htmlbtn += '<button class="' + clsbtn + ' ' + util.getOrLast(style.modalBtn, i) 
						+ '" data-vui-event="' + btns[i]['event'] 
						+ '">' + btns[i]['value'] + '</button>';
				}
			}
			if (htmlbtn) {
				htmlbtn = '<div class="' + clsbtns + ' ' + style.modalBtns + '">' 
					+ htmlbtn + '</div>';				
			}
			html = '<div class="' + clsmodal + ' ' + style.modal + ' ' + options.type + '">' 
				+ (options.title ? '<h3 class="' + clstitle + ' ' + style.modalTitle + '">' + options.title + '</h3>' : '') 
				+ '<div class="' + clscontent + ' ' + style.modalContent + '">' + options.content + '</div>'
				+ '<button type="button" class="' + clsbtn + ' ' + style.modalClose + '" data-vui-event="close" aria-hidden="true">&times;</button>' 
				+ htmlbtn 
				+ '</div>';
			this.$modal = $(html).css({'position': 'absolute'}).appendTo(document.body);
			if (options.showMask) {
				$mask = this.constructor.$mask;
				$mask.addClass(clsmask + ' ' + style.modalMask);
				$mask.css({
					width: (this.document.scrollLeft() + this.document.width())+ 'px', 
					height: (this.document.scrollTop() + this.document.height()) + 'px'
				}).show();
			}
		}, 
		close: function() {
			this.$modal.remove();
			this.constructor.$mask.hide();
			this.destroy();		
		},
		show: function() {
			var self = this, tgtsz, tgtofs, modalsz, modalofs;
			
            if (this.options.xor) {
                $.each($[this.namespace][this.widgetName + 's'], function(k) {
					if (k !== self.id)
                        this.close();
                });
            }
			
            if ($.isWindow(this.element[0])) {
				tgtsz = {w: this.document.width(), h: this.document.height()};
				tgtofs = {top: this.document.scrollTop(), left: this.document.scrollLeft()};
			} else {
				tgtsz = {w: this.element.outerWidth(), h: this.element.outerHeight()};
				tgtofs = this.element.offset();
			}
			modalsz = {w: this.$modal.outerWidth(), h: this.$modal.outerHeight()};
			modalofs = {
				top: tgtofs.top + (tgtsz.h / 2) - (modalsz.h / 2), 
				left: tgtofs.left + (tgtsz.w / 2) - (modalsz.w / 2)
			};
			this.$modal.css(modalofs);
			return this;
		}
	});
	$.vui.modal.$mask = $('<div/>').css({position: 'absolute', left: 0, top: 0}).hide().appendTo(document.body);
	$.fn.alert = function(options) {
		return this.modal(options);
	};
	$.fn.confirm = function(options) {
		options.btns = [{value: 'Ok', event: 'ok'}, {value: 'Cancel', event: 'cancel'}];
		return this.modal(options);
	};
});