var gluestick = gluestick || {};

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
		addEvent = glue.utils.addEvent;



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
			listeners.ids = listeners.ids || (listeners.ids {});
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


})(gluestick);