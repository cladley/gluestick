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
		}
	}

	// alias for utility methods
	var isFunction = glue.utils.isFunction,
		isString = glue.utils.isString,
		isObject = glue.utils.isObject,
		unique = glue.utils.unique,
		isPrivate = glue.utils.isPrivate;


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
			debugger;
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







})(gluestick);