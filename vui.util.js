/**
 *  VUI's util
 *  
 *  Copyright(c) 2014 xxx.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@xxx.com>
 *  MIT Licensed
 */
define(function(require, exports) {
	var 
	$ = require('jquery');
	
	return {	
		// Unix mode: 7 = 1 + 2 + 4
		getMod: function(mod) {
			var factors = [], sum = 1;
			function _factor(modx) {
				if (sum > mod) return;
				factors.push(modx);
				modx *= 2;
				sum += modx;
				_factor(modx);
			}
			_factor(1);
			return factors;
		}, 
		
		// Uppercase the first letter of str
		capitalize: function(str) {
			if (str.capitalize) return str.capitalize();
			return str.replace(/^([a-z])/i, function (m) {
				return m.toUpperCase();
			});
		}, 
		
		// Is empty of string, object or array
		isEmpty: function(glob) {
			if (glob.length) return false;
			if ($.type(glob) === 'object') {
				for (var k in glob) return false;
			}
			return true;
		},
		
		// Remove undefined and null from array or object
		compact: function(obj) {
			var result = [];
			if ($.type(obj) !== 'array') {
				result = {};
				obj = $.extend({}, obj);
			}
			$.each(obj, function (k, v) {
				if (v !== undefined && v !== null) {
					result[k] = v;
				}
			});
			return result;
		}, 
		// Return the value at the index or the last one
		getOrLast: function(arr, idx) {
			if ((idx === undefined) || (arr[idx] === undefined)) {
				return arr[arr.length - 1];
			}
			return arr[idx];
		}, 
		// Repeat str `l` times
		repeat: function(str, l) {
			return new Array(l+1).join(str);
		}, 
		// Simple and High-Performance template engine
		tpl: function(tpl, data) {
			var 
			lpos, rpos, key,
			lb = '<%=', rb = '%>', 
			llth = lb.length, rlth = rb.length, 
			html = '';
				
			lpos = tpl.indexOf(lb);
			if (lpos !== -1) {
				rpos = tpl.indexOf(rb, lpos + llth);
				key = tpl.slice(lpos + llth, rpos);
				html += tpl.slice(0, lpos) + ((data[key] === undefined) ? '' : data[key]);
				html += arguments.callee(tpl.slice(rpos + rlth), data);
			} else {
				html = tpl;
			}			

			return html;
		}				
	};
});
