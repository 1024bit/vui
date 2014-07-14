/**
 *  VUI's base class, extend from jQuery UI
 * 
 *  @static { Method } widgetSetup(widgetName, options) - setup widget's default options 
 *
 *  Copyright(c) 2014 vip.com
 *  Copyright(c) 2014 Cherish Peng<cherish.peng@vipshop.com>
 *  MIT Licensed
 */
define("vui.widget", function(require, exports) {
	var 
	$ = require('jquery');
	require('jquery.ui.widget');
	
	$.widget('VUI.Widget', {
		options: {
			// Scene? just for the literial call: VUI.WidgetName(options)?
			element: null, 
			models: [], 
			themes: {
				'default': {
					// May be you just need an alternative
					// For stable DOM structure scene
					'style': {}, 
					// For un-stable DOM structure and no-event scene (May be imposssible)
					'template': {}
				}
			},             
			theme: 'default', 
			// Context for a[href], button[href] value func
			context: null, 
			message: {
				createError: 'Create widget error.'
			}
		}, 
		// Add id, parent, widgets attributes
		_createWidget: function(options, element) {
			var 
			self = this, 
			constructor = $[this.namespace][this.widgetName], 
			duckType;
			
			// Deep copy the prop from prototype chain which's type is one of object or array
			$.each(self, function(key, prop) {
				duckType = $.type(prop);
				if (!self.hasOwnProperty(key)) {
					if (duckType === 'object') {
						if (!$.isPlainObject(prop)) self[key] = prop;
						else self[key] = $.extend(true, {}, prop)
					} else if (duckType === 'array') {
						self[key] = [].concat(prop);
					}
				}
			});
			
			// instances: static prop, then you can manage thoes instances
			//if (!constructor.instances) {
			//	constructor.instances = [];
			//}
			//constructor.instances.push(this);
			
			if (options && (options.element instanceof $) && options.element.length) {
				element = options.element;
			}
						
			// Default value
			if (!this.options.prefix) 
				this.options.prefix = this.widgetName;

			this.element = $(element);
			this.element.addAttr('widget', this.widgetFullName);
			this.dom = this.element;
			
			this._super.call(this, options, element);

			this.enhance();
		}, 
		_create: function() {
			this._super.apply(this, arguments);
			this._render();
			this._attachEvent();
		}, 
		// Widget's event bind
		_attachEvent: function() {
			var 
			self = this, 
			options = this.options;

			this._on({
				'click a[href], button[href]': function(e) {
					var $target = $(e.target), 
						scheme = 'javascript:', fn, 
						href = $target.attr('href'), 
						js = href.indexOf(scheme), 
						context = options.context || this, 
						id;
						
					if (~$.inArray(href, ['', '#'])) return _leave();
					
					id = this._getSelectedId($target);
					
					//if (id === undefined) return;

					if (~js) {
						fn = href.slice(scheme.length);
						~fn.lastIndexOf(';') && (fn = fn.slice(0, -1));
						fn && context[fn] && context[fn](e, id);
						e.preventDefault();
					} else {
						return _leave();
					}
					
					function _leave() {
						var evt = $.Event(e);
						evt.type = 'leave';
						evt.target = e.target;
						// The third party can intercept default-behavior in the leave event
						self._trigger(evt, id);
						return !evt.isDefaultPrevented();					
					}
				}
			});			
		}, 
		_getCreateOptions: function() {
			return this.element.metadata(this.widgetName);
		},
		// Eg the selected item's id in the grid widget
		_getSelectedId: function($target) {}, 
		
		// Initialize sub widget
		// Markup driven
		// Consider this scene: <div widget="module tabpanel ..."/>
		enhance: function() {
			var self = this, $elems = this.element.find('[widget]'), widgetNames, $elem;
			$elems.each(function() {
				$elem = $(this);
				widgetNames = $elem.attr('widget').split(' ');
				$.map(widgetNames, function(widgetName) {
					if (!$elem.data(self.namespace + '-' + widgetName)) {
						$elem[widgetName]();
					}
				});
				
			});
		},
		// Paint widget
		_paint: function(models) {}, 
		// Render widget
		_render: function() {
			var 
			self = this, options = this.options, 
			expr = '[widget]',
			$elem = this.element,  
			namespace = this.namespace, 
			ns, widgetName, evtobj;
			
			this._paint(options.models);

			// Register widget, add parent, widgets, id props
			var $parent = this.element.parent().closest(expr);
			if (!$parent.length) $parent = $(document);
			this.widgets = {};
			widgetName = $parent.attr('widget');
			widgetName && (this.parent = $parent.data(namespace + '-' + widgetName));
			this.id = $elem.attr('uid') || $elem.attr('id') || $elem.attr('name') || 
				this.eventNamespace.slice(1);

			ns = this.widgetName + 's';
			
			!$[namespace][ns] && ($[namespace][ns] = {});
			this.id && ($[namespace][ns][this.id] = this);
			
			if (this.parent) {
				// Locate sub widget in the parent widget
				this.id && (this.parent.widgets[this.id] = this);
			}
		}, 
		// Change theme(Theme contains structure and style)
		changeTheme: function(name) {
			var 
			self = this, options = this.options, 
			from = options.themes[options.theme], to, 
			$elem, cls;
			
			// Same theme
			if (options.theme === name) {
				this.raise(options.message.sameTheme, 'notice');
				return;
			}
			to = options.themes[name];
			$.each(to, function(k, v) {
				cls = from[k];
				$elem = self.element.find('.' + cls);
				$elem.removeClass(cls);
				$elem.addClass(v);
			});
			options.theme = name;
		}, 
		// Update widget
		update: function(models) {
			if (!models) {
				this.raise(options.message.noUpdate, 'notice');
				return;
			}
			this.options.models = models;
			this._render();
		}, 
		// By default add event prefix
		_trigger: function(event, data, addPrefix) {
			var prop, orig, callback, type, namespaces;

			if ('string' === $.type(event)) {
				namespaces = event.split('.');
				event = namespaces.shift();
			}
			// Ensure the event is a new instance
			event = $.Event(event, {namespace: namespaces.join('.')});
			data = [].concat(data);
			addPrefix = (addPrefix !== undefined) ? addPrefix : true;
			type = event.type;
			callback = this[type];
			orig = event.originalEvent;
			
			if (orig) {
				// You may not want to append namespace to the event which export to the external
				orig.namespace = "";
				for (prop in orig) {
					if (!(prop in event)) {
						event[prop] = orig[prop];
					}
				}
			}
			type = (!type.indexOf(this.eventPrefix) ? type : (!addPrefix ? type : this.eventPrefix 
				+ type)).toLowerCase();
			event.type = type;
			
			if (!event.target) event.target = this.element[0];
			this.element.trigger(event, data);
			
			return !($.isFunction(callback) &&
				callback.apply(this, [event].concat(data)) === false ||
				event.isDefaultPrevented());
		}, 
		// Set the context to this.element
		$: function(selector, context) {
			return $(selector, context || this.element);
		},
		// Don't support `this.bindings`, use this._on stead
		on: function(suppressDisabledCheck, types, selector, data, handler) {
			var 
			instance = this, events = types, 
			delegateElement = this.widget() || this;
			
			if (typeof suppressDisabledCheck !== 'boolean') {
				handler = data;
				data = selector;
				selector = types;
				types = suppressDisabledCheck;
				suppressDisabledCheck = false;
			}
			
			if (data == null && handler == null) { 
				// (types, handler)
				handler = selector;
				data = selector = undefined;
			} else if (handler == null) { 
				if (typeof selector == 'string') { 
					// (types, selector, handler)
					handler = data;
					data = undefined;
				} else { 
					// (types, data, handler)
					handler = data;
					data = selector;
					selector = undefined;
				}
			}
			
			if ('string' === $.type(types)) {
				events = {};
				$.each(types.split(' '), function() {
					events[this] = handler;
				});
			}
			
			// jquery.ui.widget's _on method
			$.each(events, function(event, handler) {
				var match, eventName;
				function handlerProxy() {		
					if (!suppressDisabledCheck &&
						(instance.options.disabled === true ||
							$(this).hasClass("ui-state-disabled"))) {
						return;				
					}
					return (typeof handler === "string" ? instance[handler] : handler)
						.apply(instance, arguments);
				}

				// copy the guid so direct unbinding works
				if (typeof handler !== "string") {
					handlerProxy.guid = handler.guid =
						handler.guid || handlerProxy.guid || $.guid++;
				}

				match = event.match(/^(\w+)\s*(.*)$/);
				eventName = match[1] + instance.eventNamespace;
				selector = match[2] || selector;
				
				delegateElement.on(eventName, selector, data, handlerProxy);
			});
			
			return this;
		}, 	
		// N.B. $.fn.remove will remove all events and datas from the target
		destroy: function(keepData) {
			this._super.call(this);
			// Trigger widget's remove event
			this._trigger($.Event('remove'), this);
			// Remove attrs associate with widget
			//this.element.removeAttr('data-' + this.widgetName);
			this.element.removeAttr('widget', this.widgetName);
			// Destroy sub widget
			$.each(this.widgets, function() {
				this.destroy();
			});
			
			delete $[this.namespace][this.widgetName + 's'][this.id];
			this.parent && (delete this.parent.widgets[this.id]);
		},        
		// Raise a message
		raise: function(message) {
			var options = this.options, messages = [];
			if ($.type(message.message) === 'number') {
				$.each($.factorMod(message.messgae), function() {
					messages.push({type: message.type, message: options.message[options.mod[this + '']]});
				});
			} else {
				messages.push(message);
			}
			// type: error, warning, notice
			// Support multiple message
			this._trigger({type: 'message'}, messages);
		}	
	}); 
	
	/** 
	 *  $.VUI static props
	 */
	$.extend($.VUI, {
		// Setup widget's default options 
		widgetSetup: function(widgetName, options) {
			$.extend(true, $.VUI[widgetName].prototype.options, options);
		} 
	});
	
	// Keep name is lower case 
	var _bridge = $.widget.bridge;
	$.widget.bridge = function(name, object) {
		name = name.toLowerCase();
		return _bridge(name, object);
	}
});
