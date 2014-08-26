/**
 *  VUI validator's default rules
 *
 *  Copyright(c) 2014 xx.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@xx.com>
 *  MIT Licensed
 */
define(function(require, exports) {
	var 
	$ = require('jquery'),
	util = require('../vui.util'), 
	LANG = require('./i18n/{lang}');
	require('../vui.widget');
	require('./validator');	
	require('../popover/popover');
	
	$.vui.widgetSetup('validator', {			
		rules: {
		    digits: [/^\d*$/, LANG.DIGITS], 
            letters: [/^[a-z]*$/i, LANG.LETTERS], 
            email: [/^(?:[a-z0-9]+[_\-+.]?)*[a-z0-9]+@(?:([a-z0-9]+-?)*[a-z0-9]+.)+([a-z]{2,})+$/i, LANG.EMAIL],
			phone: [/^(((0\d{2,3})-)?(\d{7,8}))|(1\d{10})$/, LANG.PHONE], 
            date: [/^\d{4}-\d{1,2}-\d{1,2}$/, LANG.DATE],
            time: [/^([01]\d|2[0-3])(:[0-5]\d){1,2}$/, LANG.TIME],
			datetime: [/^\d{4}-\d{2}-\d{2}\s([01]\d|2[0-3])(:[0-5]\d){2}$/, LANG.DATETIME],
            url: [/^(https?|ftp):\/\/[^\s]*$/i, LANG.URL],
            username: [/^\w{3,12}$/, LANG.USERNAME], 
            password: [/^[0-9a-zA-Z]{6,16}$/, LANG.PASSWORD], 
            money: [/^(([1-9]\d{0,7})|0)(\.\d{1,2})?$/, LANG.MONEY],
            discount: [/^(\d|100|[1-9]\d)$/, LANG.DISCOUNT], 

            // Accepted file ext
            accept: function($element, ext){
				return (ext === '*') || (new RegExp(".(?:" + (ext || "png|jpg|jpeg|gif") + ")$", "i")).test($element.val()) || LANG.ACCEPT; 
			}, 
				
            required: [/^[\s\S]+$/, LANG.REQUIRED],
            integer: {
                '*': [integer, LANG['INTEGER_*']],
                '+': [integer, LANG['INTEGER_+']],
                '+0': [integer, LANG['INTEGER_+0']],
                '-': [integer, LANG['INTEGER_-']],
                '-0': [integer, LANG['INTEGER_-0']]
            },
            match: {
                eq: match,
                lt: match,
                gt: match,
                lte: match,
                gte: match
            },
            range: {
                rg: [range, LANG.RANGE_RG],
                gt: [range, LANG.RANGE_GT],
                lt: [range, LANG.RANGE_LT]
            },
            checked: {
                eq: [checked, LANG.CHECKED_EQ],
                rg: [checked, LANG.CHECKED_RG],
                gt: [checked, LANG.CHECKED_GT],
                lt: [checked, LANG.CHECKED_LT]
            },
            length: {
                eq: [length, LANG.LENGTH_EQ],
                rg: [length, LANG.LENGTH_RG],
                gt: [length, LANG.LENGTH_GT],
                lt: [length, LANG.LENGTH_LT],
                "2_eq": [length, LANG.LENGTH_2_EQ],
                "2_rg": [length, LANG.LENGTH_2_RG],
                "2_gt": [length, LANG.LENGTH_2_GT],
                "2_lt": [length, LANG.LENGTH_2_LT]
            }
		} 
	});
	
	function isInt(value) {
		return parseInt(value) !== value;
	}		
	function isNegInt(value) {
		return isInt(value) && (value < 0);
	}		
	function isPosInt(value) {
		return isInt(value) && (value > 0);
	}	
	function integer($element, delimiter) {
		var value = +($element.val()) ; 
		switch (delimiter) {
			case '*': 
				return isInt(value);
			case '+':
				return isPosInt(value);
			case '+0':
				return isPosInt(value) || 0;
			case '-':
				return isNegInt(value);
			case '-0':
				return isNegInt(value) || 0;
		}		
	}
	function range($element, delimiter, lvalue, rvalue) {
		var value = $element.val();
		return !rvalue ? lvalue === value : lvalue <= value <= rvalue;
	}
	function checked($element, delimiter, lvalue, rvalue) {
		var value = this.$('input[name=' + util.escape($element.attr('name'), '[]') + ']').filter(':checked').length;
		return !rvalue ? lvalue == value : lvalue <= value <= rvalue;
	}
	function length($element, delimiter, lvalue, rvalue, x2) {
		var value = $element.val();
		value = value.length + (x2 ? value.match(/[\u0391-\uFFE5]/g).length : 0);
		return !rvalue ? lvalue === value : lvalue <= value <= rvalue;
	}
	function match($element, delimiter, field) {
		var $field = this.$('[name=' + field + ']'),
			value = $element.val(), 
			rvalue = $field.val(),            
			name = $field.metadata('rule').name || $field.prev('label').text() || $field.closest('label').text();
		switch (delimiter) {
			case 'eq': 
				return (rvalue === value) || ('{0} and ' + name + ' should be same');
			case 'lt':
				return (rvalue > value) || ('{0}必须小于' + name);
			case 'gt':
				return (rvalue < value) || ('{0}必须大于' + name);
			case 'lte':
				return (rvalue >= value) || ('{0}必须小于或等于' + name);
			case 'gte':
				return (rvalue <= value) || ('{0}必须大于或等于' + name);
		}
	}	
});