/** 
 * tabpanel组件属于menu组件的一种
 * 数据源结构: [{alias: '', href: '#hello', selected: true, network: true, title: '', models: [{...}, ...]}, ...]
 * 使用方法: 
 * $('xxx').tabpanel(options)
 * 事件: tabload tabloadfailed tabselect
 */
(function ($) {
    $.widget('hijax.tabpanel', $.hijax.menu, {
        options: {
            // 设计不合理, tabpanel不应只有一个面板        
            // multiPanel: true, 
            dict: {
                network: 'network'
            },

            // 皮肤
            themes: {
                'default': {
                    style: {
                        // 样式
                        menuGroup: 'tab-group',
                        menu: 'tab',
                        menuSelected: 'tab-selected',

                        panel: 'tab-panel',
                        scroller: 'tab-scroller'
                    }
                }
            },

            // 事件
            onSelect: function (e) { },
            onLoad: function (e) { },
            onLoadfailed: function (e, error) { },

            prefix: 'tab',
            defaultHtml: '<p>Nothing. :)</p>',
            messages: {
                selectError: 'Not found.',
                noUpdate: 'No update.',
                sameTheme: 'Same theme.'
            }
        },
        widgetEventPrefix: 'tab',
        events: 'select load loadfailed',
        _requestInstances: {},
        // settings: 与ajaxSettings保持一致
        load: function (settings, e) {
            var 
            options = this.options,
            isHash = !settings.url.indexOf('#'),
            deferred = $.Deferred();

            if (isHash) {
                settings.context.append($(settings.url).show() || options.defaultHtml);
                deferred.resolve();
            } else {
                // 使用全局默认配置
                $.ajax($.extend(true, { dataType: 'html' }, settings))
                    .done(function (html) {
                        this.html(html);
                        deferred.resolve(e);
                    })
                    .fail(function (jqXHR, textStatus, errorThrown) {
                        this.html(textStatus);
                        deferred.reject({ jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown });
                    });
            }
            return deferred.promise();
        },
        onSelect: function (e, data) {
            var 
            self = this, options = this.options,
            style = options.themes[options.theme].style,
            url = data.url,
            $href = $.data(e.target, 'href'),
            cache = $(e.target).attr('network') !== 'true';
            if (!$href) {
                $href = self.element.find('.' + style.menu + '[href="' + url + '"]').data('href');
				// 面板不存在
				if (!$href) {
                    $href = $('<div class="' + style.panel + '"></div>');
                    self.element.append($href);
                    $.data(e.target, 'href', $href);
                }
            }

            // 先显示, 再加载
            $href.show();
            self.actives.push($href[0]);
            if (!self._requestInstances[url]) {
                if (self._trigger('select', e)) {
                    self._requestInstances[url] = true;
                    self.load({ url: url, context: $href }, e)
                        .done(function () {
                            self._trigger('load', e);
                            if (!cache)
                                delete self._requestInstances[url];
                        })
                        .fail(function (error) {
                            delete self._requestInstances[url];
                            self._trigger('loadfailed', e, error);
                        });
                }
            }
        }
    });
})(jQuery);