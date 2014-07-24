/** 
 *  VUI's `tabpanel` class, tabpanel is essentially a menu
 * 
 *  Datasource structure: [{alias: '', href: '#hello', selected: true, network: true, title: '', models: [{...}, ...]}, ...]
 *  
 *  Usage: 
 *  $(selector).tabpanel(options)
 *  
 *  Event:
 *  tabload tabloadfailed tabselect
 *
 *  Copyright(c) 2014 vip.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@vip.com>
 *  MIT Licensed 
 */
define(function(require, exports) {
	var 
	$ = require('jquery');
	require('jquery.ui.widget');
	require('../menu/menu');
	
    $.widget('vui.tabpanel', $.vui.menu, {
        options: {
            // Design is not reasonable, tabpanel should not have only a panel       
            // multiPanel: true, 
            dict: {
                network: 'network'
            },

            themes: {
                'default': {
                    style: {
                        menuGroup: '',
                        menu: '',
                        menuSelected: '',

                        panel: '',
                        scroller: ''
                    }
                }
            },

            prefix: 'tab',
            defaultHtml: '<p>Nothing. :)</p>',
            messages: {
                selectError: 'Not found.',
                noUpdate: 'No update.',
                sameTheme: 'Same theme.'
            }
        },
        widgetEventPrefix: 'tab',
        _requestInstances: {}, 
		"$active": $(), 
        // settings: keep in touch with ajaxSettings
        load: function (settings, e) {
            var 
            options = this.options,
            isHash = !settings.url.indexOf('#'),
            deferred = $.Deferred();

            if (isHash) {
                settings.context.append($(settings.url).show() || options.defaultHtml);
                deferred.resolve();
            } else {
                // Use global default settings
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
				// Exist already
                //$href = self.element.find('.' + style.menu + '[href="' + url + '"]').data('href'); // Why this?
				$href = options.container.find('[class|=' + options.classPrefix + '-item][href="' + url + '"]').data('href');
				// No panel exist
				if (!$href) {
                    $href = $('<div class="' + style.panel + '"></div>');
                    self.element.append($href);
                    $.data(e.target, 'href', $href);
                }
            }

            // Show first, then load
            this.$active.hide();
			$href.show();
			this.$active = $href;
			
            if (!self._requestInstances[url]) {
				e.type = 'select';
                if (self._trigger(e)) {
                    self._requestInstances[url] = true;
                    self.load({ url: url, context: $href }, e)
                        .done(function () {
							e.type = 'load';
                            self._trigger(e);
                            if (!cache)
                                delete self._requestInstances[url];
                        })
                        .fail(function (error) {
                            delete self._requestInstances[url];
							e.type = 'loadfailed';
                            self._trigger(e, error);
                        });
                }
            }
        }
    });
});