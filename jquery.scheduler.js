/**
 * Widget Scheduler
 * Allow to shedule events in a day.
 * https://github.com/nectil/Scheduler

 * @author Jonathan Sanchez
 */

(function($) {
	$.widget("ui.scheduler", {
		getter: [],
    	options: {
			/**
			 * Begin of the day, is the first
			 */
			scheduleStart:'07:00',
			scheduleEnd:'20:00',
			overlap:true,
			newEventAdded:function($event, data){},
			eventChanged:function($event, data){},
			eventClicked:function($event, data){},
			initNewEvent:function(){
				return {};
			}
		},
		_init : function() {
			var self=this;
			this.element.addClass('ui-scheduler');
			
			// slotMinutes : hours are separated in x slots of 'slotMinutes' minutes
			if(this.options.slotMinutes){
				var slotMinutes = this.slotMinutes = this.options.slotMinutes;
			}else{
				// default slot height
				var slotMinutes = this.slotMinutes = 15;
			}
			
			// slotHeight is the height in pixel of a slot
			if(this.options.slotHeight){
				var slotHeight = this.slotHeight = this.options.slotHeight;
			}else{
				var slotHeight = this.slotHeight = 15;
			}
			
			this.scheduleStart = $.scheduler.convertStringToMinutes(this.options.scheduleStart);
			this.scheduleEnd   = $.scheduler.convertStringToMinutes(this.options.scheduleEnd);
			for (var i=this.scheduleStart; i < this.scheduleEnd; i+=this.slotMinutes) {
				
				if(i>=24*60){i=0;} // support night sheduling  f.i. 20:00 to 06:00

				var h=Math.round(i/60);
				if(h*60==i){
					this.element.append('<div class="time-slot separator" style="height:'+(this.slotHeight-1)+'px;"><div class="label">'+h+'</div></div>'); // slotMinutes -1 (for the border)
				}else{
					this.element.append('<div class="time-slot" style="height:'+(this.slotHeight-1)+'px;"></div>');
				}
			};
			
			this.container=$('<div class="container"></div>');
			this.element.append(this.container);
			
			$(this.options.events).each(function(i,obj){
				self.addEvent(obj);
			});
			self._computeOverlap();
			
			
			this.container.mousedown(function(evt){
				if(!$(evt.target).is('.event') && !$(evt.target).is('.event *')){
					//var slotMinutes = $.scheduler.slotMinutes;
					var top = Math.floor((evt.pageY - self.element.offset().top) / slotMinutes) * slotMinutes;
					var newEventData=self.options.initNewEvent();
					newEventData.start=$.scheduler.convertMinutesToString(top + self.scheduleStart);
					newEventData.end=$.scheduler.convertMinutesToString(top + self.scheduleStart + 30);
					var $event = self.addEvent(newEventData);
					$(self.element).mousemove(function(e){
						var height=Math.round((e.pageY - $event.offset().top) / slotMinutes) * slotMinutes;
						if(height >= slotMinutes){
							$event.height(height-2);
						}
					}).mouseup(function(){
						$event.data('duration', $event.height()+2);
						$event.data('data').duration=$.scheduler.convertMinutesToString($event.data('duration'));
						$event.data('end', $event.data('start') + $event.data('duration'));
						$event.data('data').end=$.scheduler.convertMinutesToString($event.data('end'));

						$(self.element).unbind('mousemove');
						$(self.element).unbind('mouseup');
						self._computeOverlap();
						// callback 
						self.options.newEventAdded($event,$event.data('data'));
					});
				}
			});
		},
		addEvent:function(data){
			var self=this;
			var $event=$('<div class="event"></div>');
			var $background;
			if(data.cssclass){
				$event.addClass(data.cssclass);
			}

			this.container.append($event);
			$background = $('<div class="background"></div>');
			if(data.backgroundclass){
				$background.addClass(data.backgroundclass);
			}

			if(data.title){
				$event.append('<h1>'+data.title+'</h1>');
			}
			if(data.desc){
				$event.append(data.desc);
			}
			$event.append($background);

			
			$event.data('start', $.scheduler.convertStringToMinutes(data.start));
			$event.data('end', $.scheduler.convertStringToMinutes(data.end));
			$event.data('duration', $event.data('end') - $event.data('start'));
			$event.data('data',data);
			$event.data('data').duration=$.scheduler.convertMinutesToString($event.data('duration'));

			$event.css({top:$event.data('start') - this.scheduleStart});
			$event.height($event.data('duration')-2);

			$event.click(function(){
				self.options.eventClicked($event,$event.data('data'));
			});
			$event.draggable({
				containment: this.element,
				grid: [0,this.slotMinutes],
				axis: 'y',
				// drag:function(){
				// 	$event.trigger('move');
				// },
				stop:function(){
					// $event.trigger('move');
					$event.data('start', $event.position().top + self.scheduleStart);
					$event.data('data').start=$.scheduler.convertMinutesToString($event.data('start'));

					$event.data('end', $event.data('start') + $event.data('duration'));
					$event.data('data').end=$.scheduler.convertMinutesToString($event.data('end'));

					self._computeOverlap();
					// callback 
					self.options.eventChanged($event,$event.data('data'));
				}
			});
			$event.resizable({
				containment: this.element,
				grid: [0,this.slotMinutes],
				// width:160,
				handles: 's',
				// resize:function(){
				// 	$event.trigger('resize');
				// },
				stop:function(){
					// $event.trigger('resize');
					$event.data('duration', $event.height()+2);
					$event.data('data').duration=$.scheduler.convertMinutesToString($event.data('duration'));
					$event.data('end', $event.data('start') + $event.data('duration'));
					$event.data('data').end=$.scheduler.convertMinutesToString($event.data('end'));
					self._computeOverlap();
					// callback
					self.options.eventChanged($event,$event.data('data'));
				}
			});
			// $event.bind('move',function(){});
			// $event.bind('resize',function(){});
			return $event;
		},
		_computeOverlap:function(){
			if(this.options.overlap){
				this._resolveOverlap();
			}else{
				this._truncOverlap();
			}

		},
		_truncOverlap:function(){
			var self=this;
			var sortedEvents = this.element.find('.event').sort(function(a, b) {
				return $(a).data('start') - $(b).data('start');
			});

			sortedEvents.each(function(i,obj){
				var $event=$(obj);
				var $prevEvent = $(sortedEvents[i-1]);
				
				if($prevEvent.length && $event.data('start') == $prevEvent.data('start')){
					// move the precending to the end of the current event and redo the job.
					$prevEvent.data('start', $event.data('end'));
					$event.data('data').start=$.scheduler.convertMinutesToString($event.data('start'));
					$prevEvent.data('end', $prevEvent.data('start') + $prevEvent.data('duration'));
					$event.data('data').end=$.scheduler.convertMinutesToString($event.data('end'));
					$prevEvent.css({top:$prevEvent.data('start') - self.scheduleStart});
					// $prevEvent.trigger('move');
					self._truncOverlap();
					return ;
				}
				if($prevEvent.length && $event.data('start') < $prevEvent.data('end')){
					// resize the precending event to stop to the current one start
					$prevEvent.data('end', $event.data('start'));
					$event.data('data').end=$.scheduler.convertMinutesToString($event.data('end'));
					$prevEvent.data('duration', $prevEvent.data('end') - $prevEvent.data('start'));
					$event.data('data').duration=$.scheduler.convertMinutesToString($event.data('duration'));
					$prevEvent.height($prevEvent.data('duration')-2);
					// $prevEvent.trigger('resize');
				}
				// console.log($(obj).data('data'));
			});
		},
		_resolveOverlap:function(){
			var self=this;
			var sortedEvents = this.element.find('.event').sort(function(a, b) {
				var diff=$(a).data('start') - $(b).data('start');
				if(diff!=0){
					return diff;
				}else{
					return $(b).data('end') - $(a).data('end');
				}
			});

			sortedEvents.each(function(i,obj){
				var $event=$(obj);
				var $prevEvent = $(sortedEvents[i-1]);
				var pe,found;
				
				if($prevEvent.length && $event.data('start') < $prevEvent.data('end')){
					var numOverlap = $prevEvent.data('numOverlap');
					var nbOverlap = $prevEvent.data('nbOverlap');
					found=false;
					$event.data('prev',$prevEvent);
					pe=$prevEvent;
					while(pe=pe.data('prev')){
						if($event.data('start') >= pe.data('end')){
							self.interlockEvent($event, pe.data('numOverlap'),nbOverlap);
							found=true;
							break;
						}
					}
					if(!found){
						nbOverlap++;
						self.interlockEvent($prevEvent,numOverlap,nbOverlap);
						self.interlockEvent($event,numOverlap+1,nbOverlap);
						pe=$prevEvent;
						while(pe=pe.data('prev')){
							self.interlockEvent(pe,pe.data('numOverlap'),nbOverlap);
						}
					}
				}else{
					self.interlockEvent($event,0,1);
				 	pe=$prevEvent;
					while(pe=pe.data('prev')){
						$event.data('prev',null);
						if($event.data('start') < pe.data('end')){
							$event.data('prev',$prevEvent);
							self.interlockEvent($event, $prevEvent.data('numOverlap'),$prevEvent.data('nbOverlap'));
							break;
						}
					}
				}
			});
		},
		interlockEvent:function($event,rank,nbRank){
			$event.data('numOverlap',rank);
			$event.data('nbOverlap',nbRank);
			$event.width((100-3) / nbRank + '%');
			$event.css({left : 3 + rank * (100-3) / nbRank + '%'});
		}
	});

	$.scheduler={
		convertStringToMinutes:function(hoursStr){
			var match=hoursStr.match(/\d{2}/g);
			var minutes=match[0] * 60 + match[1] * 1;
			return minutes;
		},
		convertMinutesToString:function(minutes){
			var str = this.zeroFill(Math.floor(minutes/60),2) + ':' + this.zeroFill(minutes%60,2);
			return str;
		},
		zeroFill:function(num,count)
		{
	       var numZeropad = num + '';
	       while(numZeropad.length < count) {
	           numZeropad = "0" + numZeropad;
	       }
	       return numZeropad;
		}
	};
})(jQuery);
