/** 上传组件 
 使用方法: 
 * $('xxx').uploader(options)
 事件:
 * uploadselect
 */
(function($) {
	$.widget('hijax.uploader', $.hijax.widget, {
		options: {
			// 远程服务器地址
			url: '', 
			// 供服务器使用的字段名
			field: 'files', 
			// 支持文件类型
			exts: '', 
			// 支持文件大小, 单位: Mb
			size: 0, 
			// 自动上传
			manully: false, 
			// 并发上传
			multiple: false, 
			// 可取消上传
			cancelable: true, 
			// 可重新上传
			reuploadable: true, 
			$filelist: null, 
			// 单个文件DOM	
			fileTemplate: '<li id="">' 
				+ '<div class="{uploaderFileInfo}"><span class="{uploaderFileName}"></span><span class="{uploaderFileSize}"></span></div>' 
				+ '<div class="{uploaderProgressBar}"><div class="{uploaderProgressBarThumb}"></div></div>' 
				+ '<div class="{uploaderFileHandler}"></div>' 
				+ '<div class="{uploaderFileStatus}"></div>'
				+ '</li>', 
			message: {
				typeError: "{file} 不支持的类型. 仅支持 {extensions}",
				sizeError: "{file} 大小不应大于 {sizeLimit}",
				minSizeError: "{file} 大小不应小于 {minSizeLimit}",
				emptyError: "{file} 大小为0",
				onLeave: "当前有正在上传的文件, 您确信要离开"		
			}				
		},  
		widgetEventPrefix: 'upload', 	
		_attachEvent: function() {
			this._on(this.$filelist, {
				'click a[href], button[href]': function(e) {
					var $target = $(e.target), 
						scheme = 'javascript:', fn, 
						href = $target.attr('href'), 
						js = href.indexOf(scheme), 
						context = options.context || this, 
						id;
						
					if (~$.inArray(href, ['', '#'])) return _leave();
					
					id = $target.closest('tr').find('input[type=checkbox]:first').val() || 
						(this.tbodys[this.page - 1] && this.tbodys[this.page - 1].find('input:checked:first').val());
					
					// if (id === undefined) return;
					
					if (~js) {
						fn = href.slice(scheme.length);
						~fn.lastIndexOf(';') && (fn = fn.slice(0, -1));
						fn && context[fn] && context[fn](e, id);
						e.preventDefault();
					} else {
						$target.attr('href', href + (~href.indexOf('?') ? '&' : '?') + dict.id + '=' + id + '&' + dict.page + '=' + self.page);
						return _leave();
					}
					function _leave() {
						var evt = $.Event(e);
						evt.type = 'leave';
						// 第三方可在gridleave事件中拦截默认行为
						self._trigger(evt, id);
						return !evt.isDefaultPrevented();						
					}
				}
			});			
			
		}, 
		_paint: function(models) {
			var 
            options = this.options, 
            style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix,
			clsflst = clspfx + '-filelist', 
			html = '<div class="{uploader}">' 
				+ '<a href="javascript:;" class="{uploaderButton}">上传</a>' 
				+ '<ul class="{uploaderFilelist}"></ul></div>';
			var $parent = this.element.parent();
			if (!options.$filelist) {
				this.$filelist = $('<ul class="' + clsflst + '"/>', {'position': 'absolute', 'display': 'none'}).after(this.element)
			}
			// 创建flash object
			swfobject.embedSWF('', $parent.).css({
				'position': 'absolute', 
				'left':, 
				'top':, 
				'width':, 
				'height':
			});

		}, 
		// 取消上传
		cancel: function() {},
		//  id: file.id, size: file.size, error: error
		select: function(files) {
			
		},
		// 上传
		upload: function() {},
		leave: function() {}		
	});
})(jQuery);