/**
 *  VUI's util
 *  
 *  Copyright(c) 2014 vip.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@vip.com>
 *  MIT Licensed
 */
define("vui.util", function(require, exports) {
	var 
	$ = require('jquery');
	
	$.extend({	
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
		ucfirst: function(str) {
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
		}		
	});
});
