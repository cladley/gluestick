var glue = glue || {};

(function(glue){

	glue.utils = {
		isFunction : function(obj){
			return typeof obj === "function";
		},
		isString : function(obj){
			return typeof obj === "string";
		},
		isObject : function(obj){
			return typeof obj === "object";
		},
		// unused so far
		isPrivate : function(propName){
			return propName.search('_') === 0;
		},
		unique : (function(){
			var id_counter = {};
			var counter = 0;

			return function(prefix){
				if(prefix){
					if(id_counter[prefix]){
						var i = id_counter[prefix];
						id_counter[prefix] = i += 1;
						return prefix + i;
					}else{
						id_counter[prefix] = 1;
						return prefix + id_counter[prefix];
					}
				}else{
					return counter++;
				}
			}

		})(),
		extend : function(to, from){
			for(var prop in from){
				if(from.hasOwnProperty(prop)){
					to[prop] = from[prop];
				}
			}
		},
		hasDBAttribute : function(node){
			return node.hasAttribute("data-bind");
		},
		getDecendents : function(element,pred){
			var elements = [];
			this.traverse(element, pred, elements);
			return elements;
		},
		// recursively find all elements which have a 
		// data-bind attribute set.
		traverse : function(node, pred, elements){

			if(pred(node)) elements.push(node);

			if(node.hasChildNodes()){
				var child = node.firstChild;

				while(child){
					// Check to see if its an element node
					if(child.nodeType === 1){
						this.traverse(child, pred, elements);
					}
					child = child.nextSibling;
				}
			}
		},

		fetch_elements : function(htmlObj){
			if(this.isString(htmlObj)){
				htmlObj = document.getElementById(htmlObj);
			}

			if(!htmlObj) throw new Error("Oh Crap");

			var elements = this.getDecendents(htmlObj, this.hasDBAttribute);
			return {htmlObj : htmlObj, elements : elements};
		},


		// TODO : make the event listening work for all browsers
		addEvent : function(obj, event, cb){
			obj.addEventListener(event,cb,false);
		}
	}




	// alias for utility methods
	var isFunction = glue.utils.isFunction,
		isString = glue.utils.isString,
		isObject = glue.utils.isObject,
		unique = glue.utils.unique,
		isPrivate = glue.utils.isPrivate,
		addEvent = glue.utils.addEvent,
		extend = glue.utils.extend;
		fetch_elements = glue.utils.fetch_elements;



	var createGSFunction = function(propertyName, value){
		var f = function(val){
			if (val && this.privateprops[propertyName] !== val){
				this.privateprops[propertyName] = val;
				if(this.propertyChanged){
					this.propertyChanged(propertyName, val, this._id);
				}
			}else{
				if(this.privateprops[propertyName])
					return this.privateprops[propertyName];
				else if(value){ // If no value set, then use default one.
					return value;
				}else{
					return "";
				}
			}
		}
		return f;
	}



	// Creates a constructor function with any observables created
	// as getter/setter functions.
	glue.create = function(className, props){
		var fn;
	
		var props = props || {};

		if(className && isString(className)){
			// Todo : attach className to function contructor somehow
		}else if(className && isObject(className)){
			props = className;
			className = "TODO : ";
		}

		fn = function(){
			this.privateprops = {};
			this.init.apply(this, arguments);
			this._id = unique('c');
		}

		// Create function for each observable property.
		// Each function acts as a getter/setter
		if(props.observables){
	
			for(var prop in props.observables){
				if(!isFunction(props.observables[prop])){
					if(!isPrivate(prop)){
						props[prop] = createGSFunction(prop, props.observables[prop]);
					}
				}
				fn.prototype[prop] = props[prop];
			}
			delete props.observables;
		}

		// add the rest of the properties to the constructors prototype
		for(var prop in props){
			if(props.hasOwnProperty(prop)){
				fn.prototype[prop] = props[prop];
			}
		}

		// create an init function if there isn't one already
		if(fn.prototype.init === undefined){
			fn.prototype.init = function(){};
		}
		return fn;
	};

	// use this as a mixin to give ordinary objects and HTML elements
	// databinding power.
	var extender = {

		addListener : function(obj,objProp,myProp){
			if(!this.gluedProperties)
				this.gluedProperties = {};

			// create a container for objects interested in this
			// particular property 'myProp'
			if(!this.gluedProperties[myProp]){
				this.gluedProperties[myProp] = {};
			}

			// If we are dealing with an input element, then we register for
			// its change event, so that we know when the user has changed
			// the value, so that we can update our listeners
			if(this instanceof HTMLInputElement){
				if(myProp === 'value'){
					addEvent(this,'change',this.handleChangeEvent)
				}
			}

			var listeners = this.gluedProperties[myProp];
			listeners.ids = listeners.ids || (listeners.ids = {});
			listeners.cache = listeners.cache || (listeners.cache = []);

			// Keep id of each object that is interested in me.
			if(!listeners.ids[obj._id]){
				listeners.ids[obj._id] = "on";
				// Remember the instance thats interested in me and its property that we
				// have bound to.
				listeners.cache.push({id : obj._id, instance : obj, property: objProp })
			}
		},
		handleChangeEvent : function(e){
			if(e.type === "change"){
				this.propertyChanged("value", this.value, this._id);
			}
		},
		// propertyChanged is called when ever an observable property has been 
		// updated or and html input element fires its change event
		propertyChanged : function(myProp,newValue, byWho){

			// if the change didn't come from me, then i called the 
			// setter on my property which in turn, calls propertyChanged
			// again on me, so that my listeners can get updated. It cascades
			// through the binding network
			if(byWho !== this._id){
				if(isFunction(this[myProp])){
					this[myProp](newValue);
					return;
				}else{
					this[myProp] = newValue;
				}
			}

			// Go through all that are interested in this property change
			var l = this.gluedProperties[myProp];
			var lnrs = l.cache;
			var i,
				k = lnrs.length;

			for(i = 0; i < k; i++){
				var c = lnrs[i];
				if(l.ids[c.id] === "on"){
					// Make sure that we aren't updating the object that 
					// changed the property, so that we don't go around in 
					// circles
					if(byWho !== c.id){
						c.instance.propertyChanged(c.property, newValue, this._id);
					}
				}
			}
		}


	};


	// object for all data-binding methods
	var databinding = {
		createBinding : function(htmlEl,obj){
			// Check first to see if either object has been extended
			// with the extender mixin, if not, do so then
			if(!htmlEl._id){
				extend(htmlEl,extender);
				htmlEl._id = unique('html');
			}
			if(!obj._id || !obj.addListener){
				extend(obj, extender);
			}

			var data_bind_string = htmlEl.getAttribute('data-bind');
			var props = data_bind_string.split(":").map(function(e){
				return e.trim();
			});
			var htmlProp = props[0];
			var objProp = props[1];

			if(htmlProp === "collection"){

				var scpt = htmlEl.getElementsByTagName('script')[0];
				if(!scpt || scpt.type !== "text/template")
					throw new Error("a template needs to be included to render.");

				
				// Attach the template and the parent to the object we are
				// binding to, so that when we add new objects to our collection
				// then the collection can use its template to render to the parent

				var parent = scpt.parentNode;
				var template = scpt.innerHTML;
				var items;
				// if its an actual collection object passed in or is the
				// collection a property of the object that has been passed in
			
				if(obj.length){
					items = obj;
				}	
				else{
					items = obj[objProp];
				}

				var htmlFrag = document.createDocumentFragment(),
					i,
					k = items.length;

				for(i = 0; i < k; i++){
					// create a temp element, so that we can pass in 
					// a string and then pull out the elements straight 
					// away
					var tmp =  document.createElement('tbody');
					tmp.innerHTML = template;
					var element = tmp.firstElementChild;

					// Create a binding between this newly created element
					// and an object from the collection.
					glue.stick(element, items[i]);
					// save reference to the ui because if this item is remove
					// from the collection at a later stage, we can remove the 
					// actual html associated with it
					items[i].ui = element;
					htmlFrag.appendChild(element);
				} 
				parent.appendChild(htmlFrag);



			}else{
				htmlEl[htmlProp] = obj[objProp]();
			}

			this.setBinding(htmlEl, obj, htmlProp, objProp);

		},
		setBinding : function(htmlEl, obj, htmlProp, objProp){
			// TODO: Maybe some sort of oneway/twoway sort of thing,
			// or onetime only
			htmlEl.addListener(obj, objProp, htmlProp);
			obj.addListener(htmlEl, htmlProp, objProp);
		},
		removeBinding : function(obj1,obj2,prop){
		
			var o = obj1.gluedProperties[prop];
			if(!o){
				throw new Error("Unknown property passed in.");
			}

			var i,
				k = o.cache.length;
	
			if(obj2._id in o.ids){
				for(var i = 0; i < k; i++){
					var rmObj = o.cache[i];
					if(rmObj.id === obj2._id){
						o.cache.splice(i,1);
					}
				}
				delete o.ids[obj2._id];
			}
		},

		// Public method
		stick : function(htmlObj,obj){
			
			var elObj = glue.utils.fetch_elements(htmlObj);
			var elements = elObj.elements;
			htmlObj = elObj.htmlObj;

			if(elements){
				var i,
					k = elements.length;

				for(i = 0; i < k; i++){
					this.createBinding(elements[i], obj);
				}
			}

		},
		// Public method
		unstick : function(htmlObj, obj){
		
			var elObj = glue.utils.fetch_elements(htmlObj);
			var elements = elObj.elements;

			htmlObj = elObj.htmlObj;

			if(elements){
				var i,
					k = elements.length;
				for(i = 0; i < k; i++){
				
					var e = elements[i];
					var data_bind_string = e.getAttribute('data-bind');
					var props = data_bind_string.split(":").map(function(e){
						return e.trim();
					});
					var htmlProp = props[0];
					var objProp = props[1];

					
					this.removeBinding(e, obj, htmlProp);
					this.removeBinding(obj, e, objProp);
				}
			}
		}

	};

	glue.stick = databinding.stick.bind(databinding);
	glue.unstick = databinding.unstick.bind(databinding);



	window.db = databinding;

})(glue);