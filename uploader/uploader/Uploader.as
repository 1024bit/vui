package uploader {
	import flash.net.*;
	import flash.display.*;
	import flash.events.*;
	import flash.external.ExternalInterface;
	
	public class Uploader extends MovieClip {
		// 错误类型
		static const E_TYPE                   :int = 1;
		static const E_SIZE                   :int = 2;
		static const E_MULTIPLE               :int = 4;
		
		// 单个文件上传状态
		static const STATE_UNINITIALIZED      :int = 0;
		static const STATE_UPLOADING          :int = 1;
		static const STATE_COMPLETE           :int = 2;

		// 应用上传状态
		protected var uploading               :Boolean = false;
		// 文件句柄
		protected var handle                  :FileReferenceList = new FileReferenceList();
		// 文件列表
		protected var files                   :Array = new Array();
		// 供服务器使用的字段名
		protected var field                   :String = "";
		// 支持文件类型
		protected var type                    :FileFilter;
		// 支持单个文件大小, 单位: b
		protected var size                    :int;
		// 文件数 
		protected var multiple                :int = 5;		
		// 自动上传
		protected var manully                 :Boolean = false;
		// 远程服务器地址
		protected var url                     :URLRequest;
		// 并发上传
		protected var concurrent              :Boolean = false;
		// 上传记录
		protected var memo                    :Object = new Object();
		protected var flashvars               :Object;
		protected var index                   :int = 0;
		protected var jsapi                   :String;                   
		// 构造函数
		public function Uploader() {
			flashvars = stage.loaderInfo.parameters;
			jsapi = flashvars.jsapi;
			init(flashvars);
		}

		// 初始化
		// param: {field: '', type: '*.jpg;*.gif;*.png', size: 4, url: '', data: {}, multiple: false}
		public function init(param:Object) {
			var boolean:Object = {"true": true, "false": false};
			merge()
			
			ExternalInterface.marshallExceptions = true;
			if (ExternalInterface.available) {
				// 标识AS准备妥当, 等待JS调用
				ExternalInterface.addCallback("upload", upload);
				ExternalInterface.addCallback("cancel", cancel);
				ExternalInterface.addCallback("leave", leave);
			}
			
			type = new FileFilter(param.type, param.type);
			size = param.size.slice(0, -1);
			field = param.field;
			switch (param.size.slice(-1).toLowerCase()) {
				case "g": 
					size *= 1024;
				case "m": 
					size *= 1024;
				case "k":
					size *= 1024;
					break;
			}

			url = new URLRequest(param.url);
			// url.data = param.data;
			concurrent = boolean[param.concurrent];
			manully = boolean[param.manully];
			multiple = param.multiple;
			
			handle.addEventListener(Event.SELECT, onSelect);
			stage.addEventListener(MouseEvent.CLICK, onBrowse);
		}
		
		/**
		 * JS调用AS
		 */
		// 上传
		public function upload(param:Object) {
			var redo:Boolean = (param && param.id), file:Object, i:int;
			
			uploading = true;

			if (redo) {
				file = files[param.id];
				i = files.indexOf(file);

				if (file.state !== STATE_UPLOADING) {
					handle.fileList[i].upload(url, field);
				}
						
			} else if (concurrent) {
				// 并发
				return files.forEach(function(file:Object, i:int, arr:Array) { 
					handle.fileList[i].upload(url, field);
				});
			} else {
				// one by one
				handle.fileList[index].upload(url, field);
			}
		}
		// 取消上传
		public function cancel(param:Object) {
			
			var file = files[param.id], i:int = files.indexOf(file);
			if (file.state !== STATE_COMPLETE) {
				handle.fileList[i].cancel();
				onStatus({target: handle.fileList[i]});
				ExternalInterface.call(jsapi, "onCancel", flashvars.uuid, merge(file), files);							
			}
		}
		// 
		public function leave() {}
		// 断点续传(暂不支持)
		public function pause() {}
		
		/** 
		 * 事件
		 */
		// 浏览文件
		public function onBrowse(event:MouseEvent) {
			if (uploading) {
				return;
			}
			// 清空已有files
			files = [];			
			handle.browse([type]);
		}		 
		// 选择文件
		public function onSelect(event:Event) {
			var id:String, filesize:Number, unit:String, error:int, fileinfo:Object;
			if (handle.fileList.length > multiple) {
				return ExternalInterface.call(jsapi, "raise", flashvars.uuid, {"message": E_MULTIPLE, "type": "error"});
			}
			handle.fileList.forEach(function(file:FileReference, i:int, arr:Array) {
				error = 0;
				unit = "B";
				// 文件MIME(影响性能, 暂不支持), 大小检测
				if (file.size > size) {
					error += E_SIZE;
				}	
				id = field + '-' + flashvars.uuid + '-' + i;
				filesize = file.size;
				if (filesize > 1024) {
					unit = "K";
					filesize = filesize / 1024;
				}
				if (filesize > 1024) {
					unit = "M";
					filesize = filesize / 1024;
				}
				filesize = Math.ceil(filesize);
				fileinfo = {"id": id, "index": i, "name": file.name, "size": filesize + unit, "state": STATE_UNINITIALIZED, "error": error};				
				// 关联数组
				files.push(fileinfo);
				files[id] = fileinfo;
				
				if (!error) {
					file.addEventListener(Event.OPEN, onOpen);
					file.addEventListener(ProgressEvent.PROGRESS, onProgress);
					file.addEventListener(Event.COMPLETE, onSuccess);
					file.addEventListener(HTTPStatusEvent.HTTP_STATUS, onError);
					file.addEventListener(DataEvent.UPLOAD_COMPLETE_DATA, onUploadCompleteData);
					file.addEventListener(IOErrorEvent.IO_ERROR, onIoError);
					// 暂不支持本地载入(文件MIME, 尺寸检测; 本地预览; 断点续传)
					// file.load();
				}
			});
			ExternalInterface.call(jsapi , "onSelect", flashvars.uuid, files);
			
			// 自动上传
			if (!manully) {
				upload(null);
			}
		}
		public function onOpen(event:Event) {
			var i:int = handle.fileList.indexOf(event.target), file:Object = files[i];
			file.state = STATE_UPLOADING;
			file.startTime = new Date().getTime();
			ExternalInterface.call(jsapi, "onOpen", flashvars.uuid, merge(file), files);
		}
		// 上传进度
		public function onProgress(event:ProgressEvent) {
			
			var 
			i:int = handle.fileList.indexOf(event.target), 
			file:Object = files[i], 
			speed:Number, 
			currentTime:Number = new Date().getTime(), 
			remainTime:Number, unit:String = "B/s";
			
			file.lastBytesLoaded = file.lastBytesLoaded || 0;
			file.lastTime = file.lastTime || currentTime;

			speed = (event.bytesLoaded - file.lastBytesLoaded) / ((currentTime - file.lastTime) || 1);
			// 计算上传剩余时间(ms)
			remainTime = (event.bytesTotal - event.bytesLoaded) / speed;
			// 上传实时速度(B/s)
			speed *= 1000;
			if (speed > 1024) {
				unit = "KB/s";
				speed = speed / 1024;
			}
			if (speed > 1024) {
				unit = "MB/s";
				speed = speed / 1024;
			}
			speed = Math.ceil(speed);
			
			file.lastBytesLoaded = event.bytesLoaded;
			file.lastTime = currentTime;
			
			ExternalInterface.call(jsapi, "onProgress", flashvars.uuid, merge(file, {
				"progress": Math.floor((event.bytesLoaded / event.bytesTotal) * 100) + "%", 
				"startTime": file.startTime, 
				"elapsedTime": currentTime - file.startTime, 
				"remainTime": remainTime,
				"speed": speed + unit
			}), files);
			
		}
		// http响应状态
		private function onStatus(event:*) {
			var file:Object = files[handle.fileList.indexOf(event.target)], redo:Boolean = memo[file.id];
			file.state = STATE_COMPLETE;
			if (!redo) {
				
				// OneByOne
				if (!concurrent && (++index < files.length)) {
					upload(null);
				}
			}

			files.every(function(file:Object, i:int, arr:Array) {
				if (file.state < STATE_COMPLETE)  return false;
				if (i === (files.length - 1)) {
					onComplete(event);
				}
				return true;
			});
			
		}
		// 上传失败()
		public function onError(event:HTTPStatusEvent) {
			var i:int = handle.fileList.indexOf(event.target), file:Object = files[i];
			
			ExternalInterface.call(jsapi, "onError", flashvars.uuid, merge(file, {"status": event.status}), files);
			
			onStatus(event);
			memo[file.id] = true;
		}
		// 上传成功 ( 有无响应数据complete事件都会触发 )
		public function onSuccess(event:Event) {
			var i:int = handle.fileList.indexOf(event.target), file:Object = files[i];
			
			ExternalInterface.call(jsapi, "onSuccess", flashvars.uuid, merge(file), files);
			
			onStatus(event);
		}		
		// 响应数据
		public function onUploadCompleteData(event:DataEvent) {
			var i:int = handle.fileList.indexOf(event.target), file:Object = files[i];
			
			ExternalInterface.call(jsapi, "onCompleteData", flashvars.uuid, merge(file, {"data": event.data}), files);						
		}		
		// 上传完成
		public function onComplete(event:*) {
			var i:int = handle.fileList.indexOf(event.target), file:Object = files[i];
			uploading = false;
			memo = {};
			
			ExternalInterface.call(jsapi, "onComplete", flashvars.uuid, merge(file), files);						
		}

		// IO错误
		public function onIoError(event:IOErrorEvent) {
			trace(event.text);
		}
	}	
}

/**
 * 工具
 */
// 合并对象(拷贝) 
function merge(... args) {
	var target:Object = {}, from:Object = {}, i:int = 0, key:String, toString = Object.prototype.toString;
	do {
		from = args[i];
		for (key in from) {
			if (!(key in target)) {
				target[key] = from[key];
			} else if ((toString.call(target[key]) === "[object Object]") && (toString.call(from[key]) === "[object Object]")) {
				target[key] = merge(target[key], from[key]);
			}
		}
	} while (++i < args.length)
	
	return target;
}
// 并发排序
function MVar() {
    var 
	value:*,
	readers:Array = [],
	writers:Array = [],
	takers:Array = [], 
	proto:Object = {
		// put if empty, else wait in line
		writer: function(writer:Function) {
			value
				? writers.push(writer)
				: put(writer());
			return this;
		},
		// apply `reader` to the value if full, else wait in line
		reader: function(reader:Function) {
			value
				? reader(value[0])
				: readers.push(reader);
			return this;
		},
		// take the value if full, else wait in line
		taker: function(taker:Function) {
			if (!value)
				return takers.push(taker);
			var x:* = value[0];
			value = null;
			taker(x);
			runNextWriter();
			return this;
		},
		// put a value if empty, else wait in line with the writers
		put: put,
		// `put` and return true if empty, else return false
		tryPut: function(x:*) {
			value ? false : (put(x), true);
		},
		// return false if empty, else take the value and returns it
		// in a list
		tryTake: function() {
			var was:* = value;
			value = null;
			runNextWriter();
			return was;
		},
		modifier: function(modifier:Function) {
			this.reader(function(value) {
				put(modifier(value));
			});
		},
		isEmpty: function() {return !value}, 
		unset: function() {
			value = null, 
			readers = [],
			writers = [],
			takers = [];			
		}		
	};
	
	var key:String;
	for (key in proto) {
		this[key] = proto[key];
	}
	
	function put(x:*) {
        if (value)
            return writers.push(noop(x));
        while (readers.length)
            readers.shift().call(null, x);
        if (takers.length) {
            var taker:Function = takers.shift();
            taker(x);
            runNextWriter();
        } else
            value = [x];
    }
    function runNextWriter() {
        if (!value && writers.length) {
            var writer:Function = writers.shift();
            put(writer());
        }
    }
}
// 创建一个返回值为x的函数
function noop(x:*) {
	return function(){ return x; }
}
