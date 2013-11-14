/** 
 * 组件应能够适应UI设计师
 * 数据源结构: [{href: '#hello', selected: true, title: '', models: [{...}, ...]}, ...]
 * 使用方法: 
 * $('xxx').menu(options)
 */
(function($) {
    $.widget('hijax.menu', $.hijax.widget, {
        options: {
            events: 'click', 
			animate: function() {}, 
            // 针对第三方数据结构与预期不符, 可使用此映射表矫正, 避免修改源码
            dict: {
                href: 'href', 
                title: 'title', 
                models: 'models', 
                selected: 'selected', 
				alias: 'alias'
            }, 
            // 皮肤
            themes: {
                'default': {
                    // 布局: 1-树形, 0-平级
                    layout: [], 
					// 生成菜单icon
					withIcon: [], 
					// 互斥: 只针对相同级别; 支持数组或字符
					xor: true, 
					// 子菜单是否展开
					expand: false, 
                    // 样式
                    style: { 
						// 支持数组或字符
                        menu: '', 
						menuItem: '', menuSelected: '', menuHeader: '', 
						menuDivider: '', 
						menuShowIcon: '', menuHideIcon: '', menuIcon: ''
                    }
                }
            }, 
			// 菜单结构: 0: 只生成顶级菜单 + 顶级激活菜单项下各级子菜单; 1: 只生成顶级菜单; 2: 所有菜单
			structure: 0, 
			// type: jQuery, 对象各级子菜单存放的容器
			container: $()
        }, 
        actives: [], 
        level: 0, 
        _create: function() {
            var 
            options = this.options, 
            style = options.themes[options.theme].style;
			$.each(style, function(name, prop) {
				if ($.type(prop) === 'string') {
					style[name] = [prop];
				}			
			});

			options.container.length && (options.container = this.element.add(options.container));
			options.events = options.events.split(' ');
			
			$.hijax.widget.prototype._create.apply(this, arguments);
			this.element.find('#' + options.prefix + '-0').show();
        }, 
        // UI渲染; 与UI结构相关的选项: models
        _init: function () {
            var 
            options = this.options,
            style = options.themes[options.theme].style, 
			// 考虑组件被重新渲染的情况
            $active = $(this.actives[this.actives.length - 1]);
			
            if (!$active.length) {
                $active = this.element.find('#' + options.prefix + '-0 .' + this.namespace + '-menu-selected-0');
			}
            $active.length && this.select($active, $active.length - 1);
        },
        // 选择指定面板; 考虑到动态数据源, 不支持使用数字索引
        // select('#hello'), select(alias), select('http://www.youdomain.com'), select($('xxx'))
		select: function (href, level) {
			level = level || 0;
            var 
            options = this.options, 
            events = options.events,
            $menuItem, 
			styMenuItem = '.' + this.namespace + '-menu-item-', 
			$ctnr = $(this._get(options.container, level)), router;

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
        // 注册事件
        _attachEvent: function() {
            var 
            self = this, options = self.options,   
			theme = options.themes[options.theme], 
			style = theme.style, 
            events = options.events, 
            evtty = '', 
			// 链式反应
			styMenu = '.' + self.namespace + '-menu-', 			
			styMenuItem = '.' + self.namespace + '-menu-item-', 
			styMenuSelected = '.' + self.namespace + '-menu-selected-', 
			clshdr = self.namespace + '-menu-header-', 
			clsitm = self.namespace + '-menu-item-', 
			clsactv = self.namespace + '-menu-selected-', 
			clsicon = self.namespace + '-menu-icon', 
			clsshowicon = self.namespace + '-menu-show-icon', 
			actvcls, 
			i = 0, $ctnr;

            for (;i <= self.level; i++) {
				$ctnr = $(self._get(options.container, i));
				evtty = (events[i] || 'click');
				/*
				$ctnr.on('click' + self.eventNamespace, clsshowicon, function(e) {
					$(this).toggleClass(style.menuHideIcon);
					.toggle();
				});
				*/
				$ctnr.on(evtty + self.eventNamespace, styMenuItem + i, i, function(e, i, manual) {
					// 避免click与select事件重复
					e.stopPropagation();
					e.preventDefault();

					// 分别通过trigger和on传入
					i = i || e.data;
					// 手动触发
					manual = (manual === false) ? false : true;
					
					var  
					// 同步主题
					$this = $(this), 
					level = i, 
  
					isArchor = $this.hasClass(clshdr + level),                 
					$href, hash, index, $next, bound, xor = self._get(theme.xor, level), $xor;
					
					// IE8以下, href="#" 将返回http://yourdomain#
					hash = $this.attr('href');
					index = hash.indexOf('#');
					hash = hash.slice((index < 0) ? index + 1 : index);
					
					bound = level + 1;

					// 重复点击
					// if ($.inArray(this, actives) !== -1) return;
					if (!isArchor) {
						router = self._getRouter($this, level);
						$.each({'removeClass': self.actives, 'addClass': router}, function(method, actives) {
							$.each(actives, function(idx, $active) {
								if (method === 'removeClass') {
									if ($active.is(':hidden')) return;
								}								
								actvcls = self._get(style.menuSelected, idx);
								if ((actvcls === '') && (idx === actives.length - 1)) {
									actvcls = self._get(style.menuSelected);
								} 
								$active[method](clsactv + idx);
								$active[method](actvcls);
								
							});							
						})
						self.actives = router;

					} else {
						$ctnr = $(self._get(options.container, bound));
						$href = $ctnr.find(hash);

						theme.withIcon[level] && $this.find('.' + clsshowicon).toggleClass(self._get(style.menuHideIcon, level));
						// 只适用树
						if (manual && $href.is(':visible') && theme.layout[level]) {
							$href.hide();
							return;
						}

						if (self.actives[level] && xor) {
							$xor = $ctnr.find(styMenu + bound + ':visible').hide();
							$xor = $(self._get(options.container, level)).find('[href=#' + $xor.attr('id') + ']');
							theme.withIcon[level] && $xor.find('.' + clsshowicon).toggleClass(self._get(style.menuHideIcon, level));
						}					
						
						$href.show();
						$next = $href.find(styMenuSelected + (bound));
						
						if ($next.length) {
							$next.trigger((events[bound] || 'click') + self.eventNamespace, [bound, false]);
						} 
						return;
					}

					// 接口, 其他组件可扩展onSelect方法, 比如tabpanel
					if (self.onSelect) { 
						self.onSelect(e, {url: hash});
					} else {
						// 抛出select事件, 第三方代码可根据需要侦听
						self._trigger('select', e);
						
					}
				});
				// 方便事件注销
				if (i !== 0) {
					self.bindings = self.bindings.add($ctnr);
				}
			}
			
        },      
        // 无限级子菜单
        _paint: function(models) {
            var 
            self = this, options = this.options, 
            theme = options.themes[options.theme], 
            style = theme.style, 
            prefix = options.prefix, 
            dict = options.dict, 
            // htmls = [],        
            tabIndex = 0, $ctnr = null;
			
            function _paint(models, level, id, append) {
                level = level || 0; 
                id = id || (prefix + '-' + level);
                if (level > self.level) self.level = level;
                
                var 
                html = '<ul style="display:none" level="' + level + '" class="' + self._get(style.menu, level)  + ' ' + (self.namespace + '-menu-' + level) + '" id="' + id + '">', 
                _models, link,  
                isArray, isTree, isSelected, gotoNxt, styMenuDivider, withIcon, 
				repeat = 0, repeatstr = '&nbsp;&nbsp;&nbsp;&nbsp;', 
				clsicon = self.namespace + '-' + prefix + '-icon', 
				clsshowicon = self.namespace + '-' + prefix + '-show-icon';
                
                $.map(theme.layout.slice(0, level), function(val) {
					if (val === 1) repeat++;
				});
				$.each(models, function(idx, model) {
                    _models = model[dict.models];
                    isArray = $.isArray(_models);
                    isTree = theme.layout[level];
                    isSelected = model[dict.selected];
					withIcon = theme.withIcon[level];
					styMenuDivider = self._get(style.menuDivider, level);
					gotoNxt = (options.structure === 2) || (options.structure === 0);
				
                    link = id + '-' + idx;
                    isArray && (model[dict.href] = '#' + link);
                    !model[dict.alias] && (model[dict.alias] = model[dict.href]);
                    
                    html += '<li><a class="' + (self.namespace + '-menu-item-' + level) + (' ' + self._get(style.menuItem, level)) + (isArray ? ((' ' + self.namespace + '-menu-header-' + level) + (' ' + self._get(style.menuHeader, level))) : '') + (isSelected ? (' ' + self.namespace + '-menu-selected-' + level + ' ' + self._get(style.menuSelected, level)) : '') + '"' + ' tabIndex="' + (tabIndex++) + '"';
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
						+ (isArray ? '' : repeatstr.repeat(repeat)) 
						+ (withIcon ? '<i class="' + clsicon + ' ' + (isArray ? (clsshowicon + ' ' + style.menuShowIcon) : style.menuIcon) + '"></i>' : '') 
                        + model[dict.title] 
						+ '</a>' 
						
                        + ((isTree && isArray && gotoNxt) ? _paint(_models, level + 1, link, true) : '')
                        + '</li>' 
						+ ((isArray && styMenuDivider) ? ('<li class="' + styMenuDivider + '"></li>') : '');
                    !isTree && isArray && gotoNxt && _paint(_models, level + 1, link);
                });
                html += '</ul>';
                if (!append) {
					// htmls.push(html);
					$ctnr = options.container.eq(level);
					$ctnr = $ctnr.length ? $ctnr : self.element;
					$ctnr.append(html);
				}
                return html;
            }
            _paint(models);           
        }, 
		_get: function(arr, idx) {
			if ((idx === undefined) || (arr[idx] === undefined)) {
				return arr[arr.length - 1];
			}
			return arr[idx];
		}, 
		// 生成路由
		_getRouter: function($menuItem, level) {
			var 
			router = [], 
            options = this.options, 
			style = options.themes[options.theme].style, 
            // actives = this.actives, 
            $menuItem, $selectedMenu, $menu, 
			styMenu = '.' + this.namespace + '-menu-', 
			styMenuItem = '.' + this.namespace + '-menu-item-', 
			styMenuSelected = '.' + this.namespace + '-menu-selected-', 
			clsactv = this.namespace + '-menu-selected-', 
			actvcls, 
			bound = level;
			
			while ($menuItem.length) {
				router.unshift($menuItem);
				$menu = $menuItem.closest(styMenu + bound);
				styMenuSelected = styMenuSelected + bound;
				clsactv = clsactv + bound;
				
                if (!$menuItem.hasClass(clsactv)) {
                    $selectedMenu = $menu.find(styMenuSelected);
					actvcls = this._get(style.menuSelected, bound);
                    $selectedMenu.removeClass(actvcls);
                    $menuItem.addClass(actvcls);
                }
				
                if (bound == 0) break;
				bound--;

                $menuItem = $(this._get(options.container, bound)).find(styMenuItem + bound + '[href="#' + $menu.attr('id') + '"]');
            }
			return router;
		}, 		
		// 扩展
		expand: function() {
			var options = this.options;
		}, 
		// 收缩
		contract: function() {
		
		}
    });
})(jQuery);