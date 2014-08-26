/** 
 * 上传组件 
 *
 * 使用方法: 
 * $('xxx').uploader(options)
 *
 * 事件:
 * uploadselect, uploadprogress, uploadsuccess, uploaderror, uploadcancel, uploadcomplete, uploadcompletedata uploadmessage
 *
 * 依赖组件: countdown
 */
(function($) {
	$.widget('hijax.uploader', $.hijax.widget, {
		options: {
			themes: {
				'default': {
					style: {
						filelist: '', 
						file: '', 
						fileInfo: '', fileName: '', fileSize: '', fileStatus: '', 
						fileOperation: '', cancelBtn: '', 
						progressBar: '', progressBarThumb: '', progress: '', 
						netWork: '', speed: '', remainTime: ''
					}
				}
			}, 	
			context: null, 
			// 远程服务器地址
			url: '', 
			// swf地址
			swfUrl: '', 
			// 供服务器使用的字段名
			field: 'files', 
			// 支持文件类型: '*.jpg;*.gif;*.png'
			type: '*.jpg;*.gif;*.png', 
			// 支持文件大小, 支持单位: G, M, K
			size: '2M', 
			// 自动上传
			manully: false, 
			// 文件数
			multiple: 5, 
			// 并发上传
			concurrent: true, 
			// 可取消上传
			cancelable: true, 
			// 显示网络信息
			showNetwork: true, 
			// 页面上已存在的文件列表
			$filelist: null,
			// 自定义消息显示样式, 返回消息对象(jQuery or Other object)
			showMsg: $.noop(), 
			message: {
				defaultError: '上传失败', 
				defaultOk: ' ✔', 
				typeError: '不支持的类型，仅支持 {extensions}',
				sizeError: '大小不应大于 {sizeLimit}', 
				multipleError: '一次最多只能上传个文件', 
				onLeave: '当前有正在上传的文件，您确信要离开？'
			}, 
			mod: {
				'1': 'typeError',
				'2': 'sizeError', 
				'4': 'multipleError'
			}, 
			// 若非命名冲突, 通常使用默认值
			jsapi: 'externalInterface', 
		},  
		widgetEventPrefix: 'upload', 
		swfobject: null, 
		_fileTpl: '', 
		_draw: function(models) {
			var 
			self = this, 
            options = this.options, 
            style = options.themes[options.theme].style, 
			clspfx = this.namespace + '-' + options.prefix, 
			clspbt = clspfx + '-progress-bar-thumb', 
			clspgrs = clspfx + '-progress',
			clsopt = clspfx + '-operation', 
			clsccl = clspfx + '-cancel-btn', 
			clsnet = clspfx + '-network',
			clsspd = clspfx + '-speed', 
			clsrt = clspfx + '-remain-time', 
			host = window, 
			id = this.widgetFullName + '-' + this.uuid;

			// 生成id: hijax-uploader-0
			if (!~('relative, absolute, fixed'.indexOf(this.element.css('position')))) {
				this.element.css({'position': 'relative'});
			}			
			this.element
				// 不破坏原有id, name
				.attr('uid', id)
				.append($('<div/>', {'id': id}));
			if (!$.contains(document, $(options.$filelist)[0])) {
				this.$filelist = $('<ul class="' + style.filelist + '"/>').css({'position': 'absolute', 'display': 'none', 'top': '100%', 'left': 0}).appendTo(this.element);
			}
			// 创建swf object(dynamic publishing), 同步操作
			swfobject.embedSWF(
				options.swfUrl, id, 
				'100%', '100%', 
				'9.0.0', null,
				{'uuid': this.uuid, 'field': options.field, 'type': options.type, 'size': options.size, 'url': options.url, 'data': '', 'multiple': options.multiple, 'concurrent': options.concurrent, 'manully': options.manully, jsapi: options.jsapi}, 
				{'allowScriptAccess': 'always'}, {'wmode': 'transparent'},
				// {success: true, id: '', ref: HTMLObject}
				function(arg) {
					self.swfobject = arg.ref;
					$(self.swfobject).css({
						'position': 'absolute', 
						'left': 0, 'top': 0
					});
				}
			);
			
			// 曝露接口
			host[options.jsapi] = host[options.jsapi] || function(fn) {
				var 
				uuid = self.widgetFullName + '-' + arguments[1],
				args = [].slice.call(arguments, 2), 
				context = $[self.namespace][self.widgetName + 's'][uuid];
				
				context[fn].apply(context, args);
			};
			
			this._fileTpl = '<li id="<%=id%>" class="' + style.filelist + '">' 
				+ '<div class="' + style.fileInfo + '"><span class="' + style.fileName + '"><%=name%></span><span class="' + style.fileSize + '"><%=size%></span></div>' 
				+ '<div class="' + style.progressBar + '"><div class="' + clspbt + ' ' + style.progressBarThumb + '"><span class="' + clspgrs + ' ' + style.progress + '"></span></div></div>' 
				+ (options.showNetwork ? ('<div class="' + clsnet + ' ' + style.netWork + '"><span class="' + clsspd + ' ' + style.speed + '"></span><span class="' + clsrt + ' ' + style.remainTime + '"></span></div>') : '') 
				+ (options.cancelable ? ('<div class="' + clsopt + ' ' + style.fileOperation + '"><a href="javascript:cancel;" class="' + clsccl + ' ' + style.cancelBtn + '">取消</a></div>') : '') 				
				+ '</li>';
		}, 
		trace: function(val) {
			console.log(val);
		}, 
		_getSelectedId: function($target) {
			return $target.closest('li').attr('id');
		}, 
		
		/** AS回调JS
		 */
		// Output filelist
		onSelect: function(files) {
			var 
			self = this, 
			filelist = '', 
			isDefaultPrevented = this._trigger('select', [files]), 
			e = {};
			if (!isDefaultPrevented) return;

			$.each(files, function() {
				filelist += $.tmpl(self._fileTpl, this);
				if (this.error) {

				}
			});

			this.$filelist.html(filelist).show();
		},
		onOpen: function(file, files) {
			var isDefaultPrevented = this._trigger('open', file);
			if (!isDefaultPrevented) return;		
		}, 
		onProgress: function(file, files) {
			// STATE_UNINITIALIZED:int = 0;STATE_UPLOADING:int = 1;STATE_COMPLETE:int = 2;
			var 
            options = this.options, 
			clspfx = this.namespace + '-' + options.prefix, 
			sltpbt = '.' + clspfx + '-progress-bar-thumb', 
			sltpgrs = '.' + clspfx + '-progress',
			sltnet = '.' + clspfx + '-network', 
			sltrt = '.' + clspfx + '-remain-time', 
			sltspd = '.' + clspfx + '-speed', 
			$file = this.$filelist.find('#' + file.id), 
			isDefaultPrevented = this._trigger('progress', file);
			if (!isDefaultPrevented) return;

			$file
				.find(sltpbt).css({'width': file.progress})
				.find(sltpgrs).html(file.progress);
			$file.find(sltspd).html(file.speed);
			$file.find(sltrt).countdown({date: file.remainTime, autoStart: false, leadingZero: true});
			$file.find(sltnet).show();
		},
		onSuccess: function(file, files) {
			var 
            options = this.options, 
			clspfx = this.namespace + '-' + options.prefix, 
			sltnet = '.' + clspfx + '-network', 
			sltopt = '.' + clspfx + '-operation', 
			$file = this.$filelist.find('#' + file.id), 
			isDefaultPrevented = this._trigger('success', file);
			if (!isDefaultPrevented) return;			
			
			$file.find(sltnet).hide();		
			$file.find(sltopt).hide();		
		}, 
		onError: function(file, files) {
			var 
            options = this.options, 
			clspfx = this.namespace + '-' + options.prefix, 
			sltccl = '.' + clspfx + '-cancel-btn', 
			$file = this.$filelist.find('#' + file.id), 
			isDefaultPrevented = this._trigger('error', file);
			if (!isDefaultPrevented) return;			

			$file.find(sltccl).attr('href', 'javascript:reupload;').html('重新上传');
		}, 
		onComplete: function(file, files) {
			var isDefaultPrevented = this._trigger({type: 'complete'}, file);
			if (!isDefaultPrevented) return;
		}, 
		onCompleteData: function(file, files) {
			var isDefaultPrevented = this._trigger('completedata', file);
			if (!isDefaultPrevented) return;		
		}, 
		onCancel: function(file, files) {
			var isDefaultPrevented = this._trigger('cancel', file);
			if (!isDefaultPrevented) return;		
		}, 

		/** JS调用AS
		 */
		// 上传
		upload: function() {
			this.swfobject.upload();
		}, 
		// 重新上传
		reupload: function(e, id) {
			$(e.target).attr('href', 'javascript:cancel;').html('取消');
			this.swfobject.upload({id: id});
		},
		// 取消单个文件上传
		cancel: function(e, id) {
			// 由于性能问题, 应选择性地传递e的某些属性
			$(e.target).attr('href', 'javascript:reupload;').html('重新上传');
			this.swfobject.cancel({id: id});
		}	
	});
})(jQuery);