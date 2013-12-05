(function ($) {
    $.widget('hijax.accordion', $.hijax.widget, {
    	options: {
    		events: 'click',//click, mouseenter
			model: '',
			current: 1, //0:all hide,1:all show,first:1st show
			themes: {
				'default': {
					style: {
						box:'accordion',
						title: 'header', 
						content: 'text',
						titleon:'titleon',
						contenton:'contenton'
					}
				}
			}

		}, 
		_attachEvent: function() {
			var 
            options = this.options, 
            events = options.events,
            style = options.themes[options.theme].style,
            header = $('.'+style.title,this.element);


            if(events==='click'){
	            this._on( header, {
				  "click": function(event) {
				  	var that = $(event.target), thatnext = $(event.target).next();			  	
				  	$('.'+style.titleon).not(that).removeClass(style.titleon);				  	
				  	$('.'+style.contenton).not(thatnext).removeClass(style.contenton).stop().slideUp();
				    thatnext.stop().toggle('fast',function(){				    	
				    	that.toggleClass(style.titleon);
				  		thatnext.toggleClass(style.contenton);
				    });
				  }
				});
			}
			if(events==='mouseenter'){
				this._on(header,{
					"mouseenter":function(event){
						var that = $(event.target), thatnext = $(event.target).next(),timeout;	
						if (timeout) {
							clearTimeout(timeout);
							timeout = null;
						}
						timeout = setTimeout(function() { 
					  		$('.'+style.titleon).not(that).removeClass(style.titleon);				  	
					  		$('.'+style.contenton).not(thatnext).removeClass(style.contenton).stop(true,true).slideUp();
					  		thatnext.addClass(style.contenton).stop(true,true).slideDown();
					  		that.addClass(style.titleon);

							clearTimeout(timeout);
							timeout = null;
						}, 500);	

					}
				})
			}
			/*
			if(events==='mouseover'){
				this._on(header,{
					"mouseover":function(event){
						var that = $(event.target), thatnext = $(event.target).next(),timeout;	
						if (timeout) {
							clearTimeout(timeout);
							timeout = null;
						}
						timeout = setTimeout(function() { 
					  		$('.'+style.titleon).not(that).removeClass(style.titleon);				  	
					  		$('.'+style.contenton).not(thatnext).removeClass(style.contenton).stop(true,true).slideUp();
					  		thatnext.addClass(style.contenton).stop(true,true).slideDown();
					  		that.addClass(style.titleon);

							clearTimeout(timeout);
							timeout = null;
						}, 500);	

					}
				})
			}
			*/

		},
		_paint: function() {			
			var 
            options = this.options, 
            style = options.themes[options.theme].style, 
            data = options.data,
            current = options.current,

			html = '';
			console.log(data.length);
			$.each(data,function(i,v){
				//console.log(v.title);
				html+='<div class="'+style.title+'">'+v.title+'</div><div class="'+style.content+'" style="display:none;">'+v.content+'</div>';				
			});
			this.element.addClass(style.box).html(html);

			var 
            header = $('.'+style.title,this.element),
            content = $('.'+style.content,this.element);

			switch(current){
				case 'first':			
					header.eq(0).addClass(style.titleon);
					content.eq(0).addClass(style.contenton).show();
				break;
				case 0:
					content.hide();
				break;
				case 1:
					content.show();
				break;
				default:
					header.eq(0).addClass(style.titleon);
					content.eq(0).addClass(style.contenton);					
				break;
			}

		}

    });
}(jQuery));