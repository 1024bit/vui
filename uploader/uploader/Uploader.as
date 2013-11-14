package uploader {
	import flash.net.*;
	import flash.display.*;
	import flash.events.*;
	import flash.external.ExternalInterface;
	
	public class Uploader extends MovieClip {
		// 错误类型
		static const E_SIZE                   :int = 1;
		static const E_EXT                    :int = 2;
		
		// 单个文件上传状态
		static const STATE_UNINITIALIZED :int = 0;
		static const STATE_UPLOADING     :int = 1;
		static const STATE_COMPLETE      :int = 2;

		// 应用上传状态
		protected var uploading               :Boolean = false;
		// 文件
		protected var files                   :Array;
		// 供服务器使用的字段名
		protected var field                    :String = "";
		// 支持文件类型
		protected var exts                    :FileFilter;
		// 支持文件大小, 单位: Mb
		protected var size                    :Number;
		// 自动上传
		protected var manully                 :Boolean = false;
		// 远程服务器地址
		protected var url                     :URLRequest;
		// 并发上传
		protected var concurrent              :Boolean = false;
		// 上传记录
		protected var memo                    :Object = new Object();
		protected var index                   :int = 0;
		// 构造函数
		public function Uploader() {
			trace('here');
			//ExternalInterface.marshallExceptions = true;
			//if (ExternalInterface.available) {
				
				// 标识AS准备妥当, 等待JS调用
				ExternalInterface.addCallback("ASINIT", init);
				ExternalInterface.addCallback("asselect", select);
				ExternalInterface.addCallback("ASUPLOAD", upload);
				ExternalInterface.addCallback("ASCANCEL", cancel);
				ExternalInterface.addCallback("ASLEAVE", leave);
			//}
			masker.addEventListener(MouseEvent.CLICK, onclick);
		}
		public function onclick(event:MouseEvent) {
			select();
		}
		// 初始化
		// param: {field: '', exts: '*.jpg;*.gif;*.png', size: 4, url: '', data: {}, multiple: false}
		public function init(param:Object) {
			exts = new FileFilter(param.exts, param.exts);
			size = param.size * 1024 * 1024;
			url = new URLRequest(param.url);
			url.data = param.data;
			concurrent = param.multiple;
			
			files.addEventListener(Event.SELECT, onSelect);
		}
		
		/**
		 * JS调用AS
		 */
		// 选择文件
		public function select() {
			var ref:FileReferenceList = new FileReferenceList();
			//ref.browse([this.exts]);
			ref.browse();
			files = ref.fileList;
		}
		// 上传
		public function upload(param:Object) {
			var redo:Boolean = (param && param.id);
			if (uploading && !redo) {
				return;
			}
			
			uploading = true;

			if (redo) {
				files.every(function(file, index) {
					if (file.id === param.id) {
						file.upload(url, field);
						return false;  
					}
				});
			} else if (concurrent) {
				// 并发
				return files.forEach(function(file) {
					file.upload(url, field);
				});
			} else {
				// one by one
				files[index].upload(url, field);
			}
		}
		// 取消上传
		public function cancel(param) {
			files.every(function(file) {
				if (file.id === param.id) {
					file.cancel();
					return false;  
				}
			});
		}
		// 
		public function leave() {}
		// 断点续传(暂不支持)
		public function pause() {}
		
		/** 
		 * 事件
		 */
		// 选择文件
		public function onSelect() {
			var list:Array = new Array(), error:int = 0;
			// 过滤文件
			files = files.filter(function(file) {
				// 文件MIME(影响性能, 暂不支持), 大小检测
				if (file.size > size) {
					error += E_SIZE;
				}	
				
				file.id = file.field + "." + file.type;
				file.state = STATE_UNINITIALIZED;
				list.push({id: file.id, size: file.size, error: error});				
				if (!error) {
					file.addEventListener(Event.OPEN, onOpen);
					file.addEventListener(ProgressEvent.PROGRESS, onProgress);
					file.addEventListener(Event.COMPLETE, onSuccess);
					file.addEventListener(HTTPStatusEvent.HTTP_STATUS, onError);
					file.addEventListener(DataEvent.UPLOAD_COMPLETE_DATA, onUploadCompleteData);
					// file.load();
					return true;
				}
			});
			ExternalInterface.call("JSSELECT", list);
			// 自动上传
			if (!manully) {
				upload(null);
			}
		}
		public function onOpen(event:Event) {
			memo[event.target.id] = true;
			event.target.sate = STATE_UPLOADING;
			event.target.startTime = new Date().getTime();
		}
		// 上传进度
		public function onProgress(event:ProgressEvent) {
			var speed:Number, currentTime:Number = new Date().getTime(), remainTime:Number;
			event.target.lastBytesLoaded = event.target.lastBytesLoaded || 0;
			event.target.lastTime = event.target.lastTime || 0;
			// 上传实时速度(byte/ms)
			speed = (event.bytesLoaded - event.target.lastBytesLoaded) / (currentTime - event.target.lastTime);
			// 计算上传剩余时间(ms)
			remainTime = (event.bytesTotal - event.bytesLoaded) / speed;
			event.target.lastBytesLoaded = event.bytesLoaded;
			event.target.lastTime = currentTime;
			
			ExternalInterface.call("JSPROGRESS", {
				id: event.target.id, 
				progress: event.bytesLoaded / event.bytesTotal, 
				startTime: event.target.startTime, 
				elapsedTime: currentTime - event.target.startTime, 
				remainTime: remainTime
			});
		}
		// http响应状态
		private function onStatus(event:*) {
			var redo:Boolean = memo[event.target.id];
			event.target.state = STATE_COMPLETE;
			if (!redo) {
				index++;
				if (!concurrent) {
					upload(null);
				}
			}

			files.every(function(file, i) {
				if (file.sate < STATE_COMPLETE)  return false;
				if (i === (files.length - 1)) {
					onComplete();
				}
			});
		}
		// 上传成功
		public function onSuccess(event:Event) {
			ExternalInterface.call("JSSUCCESS", {id: event.target.id});
			onStatus(event);
		}
		// 上传失败
		public function onError(event:HTTPStatusEvent) {
			ExternalInterface.call("JSERROR", {id: event.target.id, status: event.status});
			onStatus(event);
		}
		// 上传完成
		public function onComplete() {
			uploading = false;
			memo = {};
			ExternalInterface.call("JSCOMPLETE");
		}
		// 上传响应数据
		public function onUploadCompleteData(event:DataEvent) {
			
		}
	}	
}