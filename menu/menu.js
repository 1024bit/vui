/** 
 *  VUI's `menu` class
 *  
 *  Inspiration:
 *  When the most deepest menu is focused, then the `actives` is changed
 *  When two menus are `xor`, then always one of them is hidden(include all sub menus) at the same time
 *  
 *  Datasource structure: 
 *  [{href: '#hello', selected: true, title: '', models: [{...}, ...]}, ...]
 *  
 *  Usage: 
 *  $(selector).menu(options)
 *  
 *  Event:
 *  menuselect
 *  
 *  Todo:
 *  Load menu data dynamically 
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
	
	$.widget('vui.menu', $.vui.widget, {
		options: {
			events: 'click', 
			animate: function() {}, 
			// Map the server's response data
			dict: {
				href: 'href', 
				title: 'title', 
				models: 'models', 
				selected: 'selected', 
				alias: 'alias'
			}, 
			// Skin
			themes: {
				'default': {
					// 1: tree, 0: flat
					layout: [], 
					// Output menu icon
					withIcon: [], 
					// XOR: just for same level, support array or string
					xor: true, 
					// By default, whether the sub-menu is expanded or not
					expand: false, 
					// Classname
					style: { 
						// Support array or string
						menu: '', 
						menuItem: '', menuSelected: '', menuHeader: '', 
						menuDivider: '', 
						menuShowIcon: '', menuHideIcon: '', menuIcon: ''
					}
				}
			}, 
			// Menu structure: 
			// 0: output top level menus + all sub-menu of actived top level menu
			// 1: only output top level menus; 
			// 2: All menus
			structure: 0, 
			// Menu container
			container: $()
		}, 
		actives: [], 
		level: 0, 
		_create: function() {
			var 
			options = this.options, 
			theme = options.themes[options.theme];
			_iterator(theme);

			options.container = options.container.length ? this.element.add(options.container) : this.element;
			options.events = options.events.split(' ');
			
			this._super.apply(this, arguments);
			this.element.find('#' + options.prefix + '-0').show();
			
			function _iterator(theme) {
				$.each(theme, function(name, prop) {
					if ('array' !== $.type(prop)) {
						if ('object' === $.type(prop)) 
							_iterator(prop);
						else theme[name] = [prop];
					}			
				});				
			}
		}, 
		_render: function() {
			var self = this;
			this._super.apply(this, arguments);
			// Get the max level
			this.options.container
				.last()
				.find('ul[level]')
				.each(function() {
					var level = $(this).attr('level');
					if (level > self.level) self.level = level;
				});
		}, 		
		// UI render
		_init: function () {
			var 
			options = this.options,
			style = options.themes[options.theme].style, 
			// Consider the rerender
			$active = $(this.actives[this.actives.length - 1]);

			if (!$active.length) {
				$active = this.element.find('#' + options.prefix + '-0 .' 
					+ options.classPrefix + '-selected-0');
			}
			$active.length && this.select($active, $active.length - 1);
		},
		// Select panel
		// Consider the dynamic datasource, don't support the digit index
		// select('#hello'), select(alias), select('http://www.vip.com'), select($('xxx'))
		select: function (href, level) {
			level = level || 0;
			var 
			options = this.options, 
			events = options.events,
			$menuItem, 
			styMenuItem = '.' + options.classPrefix + '-item-', 
			$ctnr = $(util.getOrLast(options.container, level)), router;

			if (href instanceof $) {
				$menuItem = href;
			} else {
				$menuItem = $ctnr.find((styMenuItem + level) + '[href="' + href + '"]');
				if (!$menuItem.length)
					$menuItem = $ctnr.find((styMenuItem + level) + '[alias="' + href + '"]');
			}

			if (!$menuItem.length) {
				this.raise(options.messages.selectError, 'error');
				return;
			}

			// while ($menuItem.length && ($.inArray($menuItem[0], actives) === -1)) {
			router = this._getRouter($menuItem, level);
			router[0].trigger((events[0] || 'click') + this.eventNamespace);
		},	
		_attachEvent: function() {
			var 
			self = this, options = self.options,   
			theme = options.themes[options.theme], 
			style = theme.style, 
			events = options.events, 
			evtty = '', 
			// Chain-Styled trigger
			styMenu = '.' + options.classPrefix + '-', 			
			styMenuItem = '.' + options.classPrefix + '-item-', 
			styMenuSelected = '.' + options.classPrefix + '-selected-', 
			clshdr = options.classPrefix + '-header-', 
			clsitm = options.classPrefix + '-item-', 
			clsactv = options.classPrefix + '-selected-', 
			clsicon = options.classPrefix + '-icon', 
			clsshowicon = options.classPrefix + '-show-icon', 
			actvcls, 
			i = 0, $ctnr;

			for (;i <= self.level; i++) {
				$ctnr = $(util.getOrLast(options.container, i));
				evtty = (events[i] || 'click');
				/*
				$ctnr.on('click' + self.eventNamespace, clsshowicon, function(e) {
					$(this).toggleClass(style.menuHideIcon);
					.toggle();
				});
				*/
				$ctnr.on(evtty + self.eventNamespace, styMenuItem + i, i, function(e, i, manual) {
					// Prevent dual event from triggering between click and select
					e.stopPropagation();
					e.preventDefault();

					// Passed by trigger and on
					i = i || e.data;
					// Manual trigger
					manual = (manual === false) ? false : true;
					
					var  
					// Sync theme
					$this = $(this), 
					level = i, bound = level + 1, 
					isArchor = $this.hasClass(clshdr + level),              
					$href, $next, $xor, hash, index, 
					xor = util.getOrLast(theme.xor, level), 					
					hideiconcls = util.getOrLast(style.menuHideIcon, level),
					withIcon = util.getOrLast(theme.withIcon, level);
					
					// <IE8, href="#" will return http://www.vip.com#
					hash = $this.attr('href');
					index = hash.indexOf('#');
					hash = hash.slice((index < 0) ? index + 1 : index);

					// Repeat click
					// if ($.inArray(this, actives) !== -1) return;

					if (xor) {
						$ctnr = $(options.container.slice(bound));
						$ctnr.each(function(i) {
							$xor = $(this).find(styMenu + (bound + i) + ':visible').hide();
							if (0 === i) {
								$xor = $(util.getOrLast(options.container, level))
									.find('[href=#' + $xor.attr('id') + ']');
								withIcon && $xor.find('.' + clsshowicon)
									.toggleClass(hideiconcls);
							}
						});
					}
					
					if (!isArchor) {
						router = self._getRouter($this, level);					
						$.each({'removeClass': self.actives, 'addClass': router}, 
							function(method, actives) {
								$.each(actives, function(idx, $active) {
									if (method === 'removeClass') {
										if ($active.is(':hidden')) return;
									}								
									actvcls = util.getOrLast(style.menuSelected, idx);
									if ((actvcls === '') && (idx === actives.length - 1)) {
										actvcls = util.getOrLast(style.menuSelected);
									} 
									$active[method](clsactv + idx);
									$active[method](actvcls);
								});							
							}
						);
						self.actives = router;
						
						// API, other widget can extend onSelect method, eg tabpanel
						if (self.onSelect) { 
							self.onSelect(e, {url: hash});
						} else {
							// Bubble select event, then the third party can listen
							e.type = 'select';
							console.log(e)
							self._trigger(e);
						}						
					} else {
						$ctnr = $(util.getOrLast(options.container, bound));
						$href = $ctnr.find(hash);
						
						withIcon && $this.find('.' + clsshowicon)
							.toggleClass(hideiconcls);
				
						// Just for tree
						if (manual && $href.is(':visible') && theme.layout[level]) {
							$href.hide();
							return;
						}
												
						$href.show();
						$next = $href.find(styMenuSelected + (bound));
						if ($next.length) {
							$next.trigger((events[bound] || 'click') + self.eventNamespace
								, [bound, false]);
						} 
					}
				});
				// For cleaning event
				if (i !== 0) {
					self.bindings = self.bindings.add($ctnr);
				}
			}
		},      
		// Unlimited level menu
		_draw: function(models) {
			var 
			self = this, options = this.options, 
			theme = options.themes[options.theme], 
			style = theme.style, 
			prefix = options.prefix, 
			dict = options.dict, 
			// htmls = [],        
			tabIndex = 0, $ctnr = null;
			
			function _draw(models, level, id, append) {
				level = level || 0; 
				id = id || (prefix + '-' + level);
				if (level > self.level) self.level = level;
				
				var 
				html = '<ul style="display:none" level="' + level + '" class="' 
					+ util.getOrLast(style.menu, level)  + ' ' + (options.classPrefix + '-' + level) 
						+ '" id="' + id + '">', 
				_models, link,  
				isArray, isTree, isSelected, gotoNxt, styMenuDivider, withIcon, 
				repeat = 0, repeatstr = '&nbsp;&nbsp;&nbsp;&nbsp;', 
				clsicon = options.classPrefix + '-icon', 
				clsshowicon = options.classPrefix + '-show-icon';
				
				$.map(theme.layout.slice(0, level), function(val) {
					if (val === 1) repeat++;
				});
				$.each(models, function(idx, model) {
					_models = model[dict.models];
					isArray = $.isArray(_models);
					isTree = theme.layout[level];
					isSelected = model[dict.selected];
					withIcon = theme.withIcon[level];
					styMenuDivider = util.getOrLast(style.menuDivider, level);
					gotoNxt = (options.structure === 2) || (options.structure === 0);
				
					link = id + '-' + idx;
					isArray && (model[dict.href] = '#' + link);
					!model[dict.alias] && (model[dict.alias] = model[dict.href]);
					
					html += '<li><a class="' 
						+ (options.classPrefix + '-item-' + level) 
						+ (' ' + util.getOrLast(style.menuItem, level)) 
						+ (isArray ? ((' ' + options.classPrefix + '-header-' + level) 
							+ (' ' + util.getOrLast(style.menuHeader, level))) : '') 
						+ (isSelected ? (' ' + options.classPrefix + '-selected-' + level 
							+ ' ' + util.getOrLast(style.menuSelected, level)) : '') 
						+ '"' + ' tabIndex="' + (tabIndex++) + '"';
					$.each(model, function(key, val) {
						switch (key) {
							case dict.models:
							case dict.selected:
								break;
							default: 
								html += ' ' + key + '="' + val + '"';
								break;
						}
					});
					html += '>' 
						+ (isArray ? '' : util.repeat(repeatstr, repeat)) 
						+ (withIcon ? '<i class="' + clsicon + ' ' 
							+ (isArray ? (clsshowicon + ' ' + style.menuShowIcon) 
								: style.menuIcon) 
							+ '"></i>' : '') 
						+ model[dict.title] 
						+ '</a>' 
						
						+ ((isTree && isArray && gotoNxt) ? _draw(_models, level + 1, link, true) : '')
						+ '</li>' 
						+ ((isArray && styMenuDivider) ? ('<li class="' + styMenuDivider + '"></li>') : '');
					!isTree && isArray && gotoNxt && _draw(_models, level + 1, link);
				});
				html += '</ul>';
				if (!append) {
					// htmls.push(html);
					$ctnr = options.container.eq(level);
					if ($ctnr.length) {
						$ctnr.prepend(html);
					} else {
						$(util.getOrLast(options.container, level)).append(html);
					}
				}
				return html;
			}
			_draw(models);           
		}, 
		// Get router
		_getRouter: function($menuItem, level) {
			var 
			router = [], 
			options = this.options, 
			style = options.themes[options.theme].style, 
			styMenu = '.' + options.classPrefix + '-', 
			styMenuItem = '.' + options.classPrefix + '-item-', 
			$menu, bound = level;
			
			while ($menuItem.length) {
				router.unshift($menuItem);
				$menu = $menuItem.closest(styMenu + bound);
				
				if (bound == 0) break;
				bound--;

				$menuItem = $(util.getOrLast(options.container, bound))
					.find(styMenuItem + bound + '[href="#' + $menu.attr('id') + '"]');
			}
			return router;
		}, 		
		// Expand
		expand: function() {}, 
		// Contract
		contract: function() {}
	});
});