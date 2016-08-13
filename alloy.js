'use strict';

var Alloy = (function alloy_wrapper()
{
    // creating ALLOY namespace
    var Alloy =
    {
        runningMode: 0 // production: 0, qa:1, dev:2, debug:3
        , version: "0.41"
    };
    var $internals = {}; // alloy internal namespaces
    var exports = []; // compiler export

    // injecting plugin
    Alloy.inject = function(func, context)
    {
        func.apply(context || window, [$internals]);
    }
    exports['Alloy.inject'] = Alloy.inject;
    
    //////////////////////////////////////////////////////////////////////////
// checks if part of the string equals another string
String.prototype.equals = function (string, startingIndex, ignoreCase)
{
    if (!startingIndex) startingIndex = 0;
    if (startingIndex + string.length > this.length) return false;

    var ndx = 0;
    var max = startingIndex + string.length;
    for (var i = startingIndex; i < max; ++i, ++ndx)
    {
        var c1 = this.charCodeAt(i);
        var c2 = string.charCodeAt(ndx);
        if (c1 == c2) continue;
        if (!ignoreCase) return false;
        // lower case
        if (c1 > 90) c1 -= 32; // (90 is capital Z, 32 is the diff between upper and lower case)
        if (c2 > 90) c2 -= 32; // (90 is capital Z, 32 is the diff between upper and lower case)
        if (c1 != c2) return false;
    }
    return true;
}
String.prototype.startsWith = function (sub)
{
    if (this.length < sub.length) return false;
    for (var i = 0; i < sub.length; ++i)
    {
        if (this.charAt(i) !== sub.charAt(i)) return false;
    }
    return true;
};
String.prototype.endsWith = function (sub)
{
    if (this.length < sub.length) return false;
    var subNdx = sub.length - 1;
    for (var i = this.length - 1; i > this.length - 1 - sub.length; --i)
    {
        if (sub.charAt(subNdx--) !== this.charAt(i)) return false;
    }
    return true;
};
String.prototype.contains = function (txt)
{
    return this.indexOf(txt) !== -1;
};
String.prototype.Trim = function (sub)
{
    if (sub)
    {
        var startAt = this.startsWith_repeat(sub);
        if (startAt < this.length)
        {
            var endAt = this.endsWith_repeat(sub);

            if (startAt != 0 || endAt != this.length - 1)
                return this.substring(startAt, endAt + 1);
            else
                return this.toString();
        }
        else return "";
    }
    else
    {
        // removing from start
        var index = 0;
        var endIndex = this.length;
        for (; /\s/.test(this.charAt(index)) && index < endIndex; ++index) { };
        
        // empty string
        if (index == endIndex) return "";

        // removing from end
        for (; /\s/.test(this.charAt(endIndex - 1)) ; --endIndex) { };

        if (index == 0 && endIndex == this.length) return this + ""; // new string
        return this.substring(index, endIndex);
    }
};
String.prototype.startsWith_repeat = function (sub)
{
    if (this.length < sub.length) return 0;
    var x = 0;
    var i = 0;
    for (; i < this.length; i++)
    {
        if (this.charAt(i) != sub.charAt(x))
        {
            i -= x;
            break;
        }
        if (x == sub.length - 1)
            x = 0;
        else
            x++;
    }
    return i;
}

String.prototype.endsWith_repeat = function (sub)
{
    if (this.length < sub.length) return this.length;
    var x = sub.length - 1;
    var i = this.length - 1;

    for (; i > 0; i--)
    {
        if (this.charAt(i) != sub.charAt(x))
        {
            i += x;
            break;
        }
        if (x == 0)
            x = sub.length - 1;
        else
            x--;
    }
    return i;
}


//////////////////////////////////////////////////////////////////////////
// Array
/*
if (!Array.prototype.indexOf)
{
    Array.prototype.indexOf = function(what, fromIndex)
    {
        if (this === null) return -1; // this is null
        var l = this.length;
        if (!l) return -1; // empty array
        fromIndex = (+fromIndex | 0) || 0; // fromIndex may be a string

        // going over all items
        while (l-- !== fromIndex)
            if (this[l] === what) return l;
        return -1;
    }
}

if (!Array.prototype.contains)
{
    Array.prototype.contains = function(what)
    {
        return this.indexOf(what) !== -1;
    }
}
*/;
    ///////////////////////////////////////////////////////////////////////////////////////////////////
Alloy.Base = function Class(){};
// method responsible of executing each base's constructor
Alloy.Base.polymorphismCtor = function (scope, args)
{
     // recursively invoking all base's ctors
     if (this.mBase !== null && typeof(this.mBase.prototype.polymorphismCtor) === 'function')
     {
          this.initBase.apply(this, args);
          this.mBase.prototype.polymorphismCtor(scope, args);
     }

     // invoking my constructor
     this.ctor.apply(scope, args);
};
// extending method
Alloy.Base.extend = function (obj)
{
    // derived c'tor - calling base c'tor and then calling its c'tor
    var derived = function ()
    {
        // enforcing abstraction
        if (typeof (obj) === 'object' && obj.abstractClass && this instanceof derived) throw ("Trying to create an instance of an abstract class");

        // making sure derived has implemented all base's abstract methods
        if (this.mBase !== null && typeof (this.mBase.abstractClass) === 'object')
        {
            for (var m in this.mBase.abstractClass)
            {
                //if (this.mBase.abstractClass[m] === null || typeof(this.mBase.abstractClass[m]) === 'undefined') continue;
                if (typeof (this[m]) !== 'function') throw ("un-implemented abstract method: " + m);
            }
        }

        this.polymorphismCtor(this, arguments);

        // updating creation array (class name)
        if (Alloy.runningMode > 2) profiler.registerObjectCreation(this);
    }

    // copying static
    for (var n in obj)
    {
        switch (n)
        {
            case "name":
            case "prototype":
            case "abstractClass":
                continue;
        }
        derived[n] = obj[n];
    }

    //	copying prototype
    for (var n in this.prototype)
    {
        derived.prototype[n] = this.prototype[n];
    }

    // copying 'prototype' from object
    if (obj._prototype) for (var n in obj._prototype)
    {
        derived.prototype[n] = obj._prototype[n];
    }

    // creating abstract object
    // which holds all abstract methods
    // copying base's abstract methods
    if (typeof (obj) === 'object' && obj.abstractClass) derived.abstractClass = {};

    // copying polymorphism ctor
    derived.prototype.polymorphismCtor = Alloy.Base.polymorphismCtor;
    // copying extend ability
    derived.extend = this.extend;
    // setting base
    derived.prototype.mBase = this;

    // setting derived class name
    if (typeof (obj) !== 'object' || typeof (obj.name) !== 'string') throw ("Class name is missing (ctorObject.name)");
    var className = obj.name.replace(/^\s+|\s+$/g, "")
    if (!className) throw ("Invalid class name");
    derived.prototype.__className__ = derived.__className__ = className;

    return derived;
};
Alloy.Base.__className__ = "Base Class";
Alloy.Base.prototype.__className__ = "Base Class";
// object's base
Alloy.Base.prototype.mBase = null;
// is disposed
Alloy.Base.prototype.mIsDisposed = false;
// object's ctor
Alloy.Base.prototype.ctor = function(){};
// object's dtor
Alloy.Base.prototype.dtor = function ()
{
     delete this.mBase;
};
Alloy.Base.prototype.initBase = function ()
{
};
Alloy.Base.prototype.isDisposed = function ()
{
     return this.mIsDisposed;
};
Alloy.Base.prototype.executeBaseMethod = function (methodName, args)
{
     if (!this.mBase) throw ("Alloy.Base.prototype.executeBaseMethod: no base!");
     this.mBase.prototype[methodName].apply(this, args || []);
};
Alloy.Base.prototype.dispose = function ()
{
     if (this.mIsDisposed) return false;

     // updating flag
     this.mIsDisposed = true;

     // running dtor
     var result = this.dtor.apply(this, arguments);
     // if dispose was canceled
     if (result === false)
     {
          this.mIsDisposed = false;
          return false;
     }


     // updating profiler
     if (Alloy.runningMode > 2) profiler.registerObjectDisposal(this);

     // running dtor in base
     var current = this.mBase;
     while (current !== null)
     {
          current.prototype.dtor.apply(this, arguments);
          current = current.prototype.mBase;
     }

     // running an overall dispose which deletes everything
     // in the object
     this.__dispose__();

     return true;
};
 Alloy.Base.prototype.__dispose__ = function ()
 {
     for (var i in this)
     {
         try
         {
             switch (i)
             {
                 case "mBase":
                 case "__dispose__":
                 case "polymorphismCtor":
                 case "extend":
                 case "__className__":
                     continue;
                     break;
             }
             if (typeof (this[i]) === 'undefined' || this[i] === null) continue;
             if (typeof (this[i]) !== 'function' && typeof (this[i]) !== 'object') continue;
             if (typeof (this[i].dispose) === 'function') this[i].dispose();

             if (this[i] instanceof Array)
             {
                 for (var j in this[i])
                 {
                     if (this[i][j] && typeof (this[i][j].dispose) === 'function') this[i][j].dispose();
                 }
             }
             delete this[i];
         }
         catch (e)
         {
             if (Alloy.runningMode > 1) alert("base::__dispose__: error disposing:" + i);
         }
     }
 };

// method that checks if an object's derived of a base
Alloy.Base.prototype.isDerivedOf = function (base, dontCountInstanceOfBase)
{
     dontCountInstanceOfBase = dontCountInstanceOfBase === true;

     if (dontCountInstanceOfBase && this.__className__ === base.__className__) return false;
     if (this.__className__ === base.__className__) return true;

     var result = false;
     var current = this.mBase;
     while (current !== null && !result)
     {
          if (base.__className__ === current.__className__) result = true;

          current = current.prototype.mBase;
     }

     return result;
};
Alloy.Base.isDerivedOf = function (_object, base)
{
     if (_object === null) return false;
     if (typeof(_object) !== 'object' || typeof(_object.isDerivedOf) !== 'function') return false;
     return _object.isDerivedOf(base);
};;
    /**************************************
Event CLASS
**************************************/
Alloy.Event = Alloy.Base.extend({ name: "Event" });
Alloy.Event.prototype.ctor = function ()
{
    this.mCount = 0;
}
Alloy.Event.prototype.dtor = function ()
{
    /// deleting handlers ///
    if (this.handlers !== null)
    {
        var l = this.handlers.length;
        for (var i = 0; i < l; ++i)
        {
            if (this.handlers[i] !== null) this.handlers[i].dispose();
        }
        delete this.handlers;
    }
    this.handlers = null;
}

///////// VARIABLES
Alloy.Event.prototype.handlers = null;
Alloy.Event.prototype.mCount = 0;
Alloy.Event.prototype.mRemovedHandler = false;

///////// METHODS
Alloy.Event.prototype.dispatch = function ()
{
    if (this.isDisposed()) return;
    if (this.handlers === null) return;

    //// applying all handlers ////
    var l = this.handlers.length;
    for (var i = 0; i < l; ++i)
    {
        // there's a chance that this object (event) is disposed
        // by one of the handlers
        if (this.isDisposed()) return;

        // invoking handler
        var handler = this.handlers[i];
        try
        {
            if (!handler) continue; // handler was removed
            if (handler.isDisposed()) // handler was disposed but not removed
            {
                this.mRemovedHandler = true;
                this.handlers[i] = null;
            }
            else // handler is valid, executing
                handler.handle.apply(handler, arguments);
        }
        catch (e)
        {
            if (Alloy.runningMode) throw (e);
        }
    }

    // there's a chance that this object (event) is disposed
    // by one of its handlers
    if (this.isDisposed()) return;

    //// cleaning 'disposed' handlers ////
    if (this.mRemovedHandler) this.cleanDisposedHandlers();
}

Alloy.Event.prototype.cleanDisposedHandlers = function ()
{
    if (!this.mRemovedHandler) return;
    var l = this.handlers.length;
    for (var i = 0; i < l; ++i)
    {
        if (this.handlers[i] === null)
        {
            this.handlers.splice(i, 1);
            --i;
            --l;
        }
    }
    this.mRemovedHandler = false; // setting flag
}
Alloy.Event.prototype.clear = function ()
{
    if (!this.handlers) return;
    var l = this.handlers.length;
    for (var i = 0; i < l; ++i) // disposing all handlers
        this.handlers[i].dispose();
    this.handlers = null;
}
Alloy.Event.prototype.addHandlerObject = function (handlerObj)
{
    if (this.isDisposed()) return;
    if (this.handlers === null) this.handlers = new Array();

    /// verifying the handler doesn't exist already
    var l = this.handlers.length;
    for (var i = 0; i < l; ++i)
    {
        var handle = this.handlers[i];
        if (handle !== null && handle.func === handlerObj.func && handle.context === handlerObj.context) return;
    }

    // adding the handler
    this.handlers.push(handlerObj);
    ++this.mCount;

    // cleaning disposed handlers
    this.cleanDisposedHandlers();

    return handlerObj;
}

Alloy.Event.prototype.addHandler = function (func, context)
{
    if (this.isDisposed()) return;
    if (this.handlers === null) this.handlers = new Array();

    /// verifying the handler doesn't exist already
    var l = this.handlers.length;
    for (var i = 0; i < l; ++i)
    {
        var handle = this.handlers[i];
        if (handle !== null && handle.func === func && handle.context === context) return;
    }

    // adding the handler
    var handler = new Alloy.Handler(func, context);
    this.handlers.push(handler);
    ++this.mCount;
    func = null;
    context = null;

    // cleaning disposed handlers
    this.cleanDisposedHandlers();

    return handler;
}

Alloy.Event.prototype.removeHandlerObject = function (handler)
{
    if (this.handlers === null) return;
    var l = this.handlers.length;
    var handleObject = null;
    var i;
    for (i = 0; i < l; ++i)
    {
        if (this.handlers[i] === handler)
        {
            --this.mCount;
            this.handlers[i] = null;
            break;
        }
    }
    this.mRemovedHandler = true; // raising flag
    handler.dispose();
}

Alloy.Event.prototype.removeHandler = function (func, context)
{
    if (this.handlers === null) return;

    context = context || null;
    var l = this.handlers.length;
    var handleObject = null;
    var i;
    for (i = 0; (i < l && handleObject === null) ; ++i)
    {
        if (this.handlers[i] !== null && this.handlers[i].func === func && this.handlers[i].context === context)
        {
            handleObject = this.handlers[i];
            this.handlers[i] = null;
            --this.mCount;
            break;
        }
    }
    this.mRemovedHandler = true;  // raising flag
    if (handleObject !== null) handleObject.dispose();

    func = null;
    context = null;
}

//remove all handerls
Alloy.Event.prototype.removeAllHandlers = function ()
{
    //if now handlers exit
    if (this.handlers === null) return;

    //set handlers object to null; (removes all handlers);
    this.handlers = null;
}

Alloy.Event.prototype.count = function ()
{
    return this.mCount;
}

///////////////////////////////////////
/**************************************
Handler Class
**************************************/
///////////////////////////////////////
Alloy.Handler = Alloy.Base.extend({ name: "Alloy.Handler" });
Alloy.Handler.toHandler = function (func)
{
    if (Alloy.Base.isDerivedOf(func, Alloy.Handler)) return func;
    return new Alloy.Handler(func);
}
Alloy.Handler.prototype.ctor = function (func, context)
{
    func = func || null;
    context = context || null;

    if (typeof (func) !== 'function')
    {
        if (Alloy.runningMode > 1) debugger;
        throw ('Error creating event handler: no function is passed');
    }

    this.func = func;
    this.context = context;

    return this;
}
Alloy.Handler.prototype.dtor = function ()
{
    delete this.func;
    delete this.context;
    this.func = null;
    this.context = null;
}
Alloy.Handler.prototype.handle = function ()
{
    if (!this.func && Alloy.runningMode) debugger;
    return this.func.apply(this.context, arguments);
}
Alloy.Handler.prototype.handleArgumentArray = function ()
{
    if (arguments.length === 0) throw ("invalid use of Alloy.Handler.handleArgumentArray");
    if (typeof (arguments[0].length) !== 'number') throw ("invalid array in Alloy.Handler.handleArgumentArray");
    return this.func.apply(this.context, arguments[0] instanceof Array ? arguments[0] : [arguments[0]]);
}
Alloy.Handler.prototype.func = null;
Alloy.Handler.prototype.context = null;

/**************************************
Timer Class
**************************************/
Alloy.Timer = Alloy.Base.extend({ name: "Alloy.Timer" });
Alloy.Timer.prototype.ctor = function (handler, disposeAfterElapsed)
{
    if (!Alloy.Base.isDerivedOf(handler, Alloy.Handler)) throw ("Alloy.Timer.ctor: invalid handler");
    this.mHandler = handler;

    // to dispose after timer elapsed
    this.mDisposeAfterTimerElapsed = disposeAfterElapsed !== false;

    this.mParams = new Array();
    if (arguments.length <= 2) return;

    for (var i = 2; i < arguments.length; ++i)
        this.mParams.push(arguments[i]);
}
Alloy.Timer.prototype.dtor = function ()
{
    this.start = null;
    if (this.mTimer)
    {
        clearTimeout(this.mTimer);
        this.mTimer = null;
    }
}
Alloy.Timer.prototype.start = function (interval)
{
    if (typeof (interval) !== 'number') throw ("Timer interval illegal");

    // saving params
    if (arguments.length > 1)
    {
        this.mParams = new Array();
        for (var i = 1; i < arguments.length; ++i)
            this.mParams.push(arguments[i]);
    }

    // running timeout
    var thisObject = this;
    this.mTimer = setTimeout(function ()
    {
        if (thisObject.mTimer === null) return;
        thisObject.timerElapsed.apply(thisObject, new Array());
    }, interval);
}
Alloy.Timer.prototype.timerElapsed = function ()
{
    this.mHandler.handleArgumentArray(this.mParams);
    if (this.mDisposeAfterTimerElapsed) this.dispose(); // disposing
}
Alloy.Timer.prototype.cancel = function ()
{
    if (this.mTimer === null) return;
    clearTimeout(this.mTimer);
    this.mTimer = null;
}

Alloy.Timer.prototype.isRunning = function ()
{
    return this.mTimer !== null;
}

Alloy.Timer.prototype.mDisposeAfterTimerElapsed = true;
Alloy.Timer.prototype.mTimer = null;
Alloy.Timer.prototype.mHandler = null;
Alloy.Timer.prototype.mParams = null;
;
    $internals.Utils =
{
    clone: function Alloy_clone(obj, deep)
    {
        var target;
        if (obj === null) return null;
        if (obj instanceof Array) // array
        {
            target = new Array(obj.length);
            var l = obj.length;
            while (l--)
            {
                if (deep)
                    target[l] = Alloy.clone(obj[l], true);
                else
                    target[l] = obj[l];
            }
            return target;
        }
        else if (typeof (obj) == 'object') // object
        {
            target = {};
            for (var i in obj)
            {
                if (deep)
                    target[i] = Alloy.clone(obj[i], true);
                else
                    target[i] = obj[i];
            }
            return target;
        }
        else // simple type
            return obj;
    }
    , compare: function Alloy_compare(obj1, obj2)
    {
        if (typeof (obj1) != typeof (obj2)) return false;

        if (obj1 instanceof Array) // array
        {
            if (!(obj2 instanceof Array)) return false;

            var l = obj1.length;
            if (obj2.length != l) return false;

            while (l--)
                if (!this.compare(obj1[l], obj2[l])) return false;
            return true;
        }
        else if (typeof (obj1) == 'object') // object
        {
            for (var l in obj1)
                if (!this.compare(obj1[l], obj2[l])) return false;
            return true;
        }
        else // simple type
            return obj1 == obj2;
    }
    , compareArrays: function (arr1, arr2)
    {
        if (!arr1)
        {
            if (!arr2) return true;
            return false;
        }
        if (!arr2) return false;

        var l = arr1.length;
        if (l !== arr2.length) return false;

        while (l--)
            if (arr1[l] !== arr2[l]) return false;

        return true;
    }
    , inArray: function Alloy_inArray(arr, val, length)
    {
        var l = length || arr.length;
        while (l--)
        {
            if (arr[l] === val) return true;
        }
        return false;
    }
    , insertUniqueToArray: function Alloy_insertUniqueToArray(arr, val)
    {
        var l = arr.length
        while (l--)
        {
            if (arr[l] === val) return;
        }
        arr.push(val);
    }
    , priorToIE9: (function Alloy_priorToIE9()
    {
        var _index;
        if ((_index = navigator.appVersion.indexOf("MSIE ")) !== -1)
        {
            _index += 5;
            var c = navigator.appVersion.charAt(_index);
            return c == '8' || c == '7' || c == '6';
        }
        return false;
    })()
    , priorToIE11: (function priorToIE11()
    {
        var _index;
        return navigator.appVersion.indexOf("MSIE ") !== -1;
    })()
    , removeElement: function Alloy_removeElement(element)
    {
        element.parentNode.removeChild(element);
    }
    , replaceDomElement: function replaceDomElement(target, source)
    {
        var p = source.parentNode;
        if (!p) return target;
        //p.insertBefore(target, source);
        //p.removeChild(source);
        p.replaceChild(target, source);

        return target;
    }
    , copyAttributes: function alloy_copyAttributes(source, target, override)
    {
        var attrLen = source.attributes.length;
        if (source.attributes) while (attrLen--)
            {
            var attrib = source.attributes[attrLen];
            if (!override && target.getAttribute(attrib.name)) continue;
            target.setAttribute(attrib.name, attrib.value);
        }
    }
    , eval: function alloy_eval(str)
    {
        try
        {
            return eval(str);
        }
        catch (e)
        {
            return null;
        }

    }

    , compileCSS: function Alloy_compileCSS(styleContent)
    {
        var styleNode = document.createElement('style');
        styleNode.type = "text/css";
        document.getElementsByTagName('head')[0].appendChild(styleNode);

        if ($internals.Utils.priorToIE11 && styleNode.styleSheet)
        {
            styleNode.styleSheet.cssText = styleContent;
        }
        else
        {
            var styleTextNode = document.createTextNode(styleContent);
            styleNode.appendChild(styleTextNode);
        }
        return styleNode;
    }

    , isNSexists: function (_namespace)
    {
        var _split = _namespace.split(".");
        var obj = window;
        for (var i = 0; i < _split.length; ++i)
        {
            obj = obj[_split[i]];
            if (typeof (obj) === 'undefined' || !obj) return false;
        }
        return true;
    }
};

// public interface
Alloy.contains = $internals.Utils.inArray;
Alloy.insertUnique = $internals.Utils.insertUniqueToArray;
Alloy.clone = $internals.Utils.clone;
Alloy.compare = $internals.Utils.compare;;
    exports['Alloy.$di'] = Alloy.$di = (function Alloy_DI()
{
    var ALREADY_DOWNLOADED = {};
    var cache = {};
    var downloadFile = function Alloy_di_downloadFile(path, handler)
    {
        Alloy.ajax({
            url: path
            , method: "GET"
            , timeout: 5000
            , handler: function (status, text)
            {
                handler(status, text);
            }
        });
    }

    var refactorScriptToTemplate = window.myReplace = function(text)
    {
        var lastPos = 0;
        var ndx = text.indexOf("<script ", lastPos); // searching for <script
        if (ndx == -1) return text;
        var newText = new Array(5); // minimum size

        while (ndx != -1)
        {
            // inserting diff
            newText.push(text.substring(lastPos, ndx));

            // end of <script >
            var endNdx = text.indexOf(">", ndx);
            if (endNdx === -1) return text; // invalid text

            // searching for alloy-tag
            var tagNdx = text.indexOf(" alloy-tag=", ndx);

            // alloy-tag is inside <script> tag
            if (tagNdx > ndx && tagNdx < endNdx)
            {
                newText.push("<div ie-hack='1' ");
                lastPos = ndx + "<script ".length;

                // searching for the correct <\/script>
                var scriptEndNdx = endNdx;
                var scriptStNdx = endNdx;
                do
                {
                    // searching for the next <script> CLOSING TAG
					var tmpNdx;
					do
					{
						tmpNdx = text.indexOf("/script>", scriptEndNdx);
						if (tmpNdx === -1) return text; // invalid text
						// if that's a closing script, breaking
						if (text.charAt(--tmpNdx) == '<')  break;
						else scriptEndNdx = tmpNdx + 5;
						
					} while (true);
					
					// checking to see wether another <script> tag is between the found closing tag and the one above
                    var inlineScriptNdx = text.indexOf("<script", scriptStNdx);
                    if (inlineScriptNdx !== -1 && inlineScriptNdx < tmpNdx)
                    {
                        scriptStNdx = inlineScriptNdx += 4;
                        scriptEndNdx = tmpNdx + 10; // "<\/script>".length
                    }
                    else
                    {
                        // inserting diff
                        newText.push(text.substring(lastPos, tmpNdx));
                        newText.push("<\/div>");
                        lastPos = tmpNdx + 10; // "<\/script>".length
                        break;
                    }
                } while (true);
            }
            ndx = text.indexOf("<script ", lastPos);
        }

        // adding the end
        newText.push(text.substring(lastPos));


        return newText.join('');
    }

    var compileHTML = function compileHTML(templateName, text)
    {
        if (!text) return "File is empty";

        // IE8, refactoring code (replacing <script alloy-tag=> with <alloy-template alloy-tag=>).
        if ($internals.Utils.priorToIE9) text = refactorScriptToTemplate(text);

        // creating DIV to process text
        var div = document.createElement("div");
        div.innerHTML = text;

        try
        {
            // going over all div childNodes to try and find
            // template nodes
            var processed = false;
            var error = null;
            for (var i = 0; i < div.childNodes.length; ++i)
            {
                var cn = div.childNodes[i];
                if (cn.nodeName === "ALLOY-TEMPLATE") // given template
                {
                    processed = true;
                    var x = cn.getAttribute("alloy-tag");
                    if (!x) continue;
                    $internals.Templates.set(x, cn.innerHTML);
                }
                // script tag
                else if (cn.nodeName === "SCRIPT")
                {
                    processed = true;
                    var x = cn.getAttribute("type");
                    if (x === "text/alloy") // alloy template
                    {
                        x = cn.getAttribute("alloy-tag");
                        if (!x) continue;
                        $internals.Templates.set(x, cn.innerHTML);
                    }
                    else
                    {
                        error = compileScript(cn.innerHTML);
                    }
                }
				// div (template) in IE8
				else if ($internals.Utils.priorToIE9 && cn.nodeName === "DIV" && cn.getAttribute("ie-hack") === '1')
				{
					processed = true;
                    var x = cn.getAttribute("alloy-tag");
                    if (!x) continue;
                    $internals.Templates.set(x, cn.innerHTML);
				}
                else if (cn.nodeName === "STYLE")
                {
                    processed = true;
                    $internals.Utils.compileCSS(text);
                }
            }

            // didn't find any templates or scopes.
            // assuming file contains only 1 template
            if (templateName && !processed) $internals.Templates.set(templateName, text);

            return error;
        }
        catch (e) { return "Failed processing HTML file: " + e; }
    }
    var compileScript = function compileScript(script)
    {
        try
        {
            // first: trying to add as <script> tag (fastest)
            var scriptTag = document.createElement('script');
            scriptTag.type = 'text/javascript';
            scriptTag.charset = 'utf-8';
            scriptTag.id = 'testing';
            scriptTag.defer = true;
            scriptTag.async = true;
            scriptTag.text = script;
            document.getElementsByTagName('head')[0].appendChild(scriptTag);
            return null;
        }
        catch (e)
        {
            try
            {
                // trying to eval
                eval(script);
                return null;
            }
            catch(e)
            {
                try
                {
                    // try to (eval)
                    eval("("  + script + ")");
                    return null;
                }
                catch(e)
                {
                    return e;
                }
            }
        }
    }

    /// getting multiple files, and firing 1 handler when it's ready
    /* ["path","path","path","path","path", ...]
    */
    return function Alloy_$di(arr, handler)
    {
        // received array
        var resultArr = new Array(arr.length);
        var totalReceived = 0;
        var fileHandler = function (index, status, text)
        {
            // inserting file to array
            resultArr[index] = {status: status, text:text};

            // not all files received
            if (++totalReceived !== arr.length) return;

            // ALL files are here. processing
            for (var i = 0; i < arr.length; ++i)
            {
                var arrItem = resultArr[i];
                var path = arr[i];

                // file was already downloaded
                if (arrItem.text === ALREADY_DOWNLOADED)
                {
                    arrItem.status = true;
                }
                // request failed
                else if (arrItem.status !== Alloy.Com.SUCCESS)
                {
                    arrItem.status = false;
                    arrItem.error = "Request failed";
                }
                // scripts
                else if (path.endsWith(".js"))
                {
                    arrItem.error = compileScript(arrItem.text);
                    if (!arrItem.error) arrItem.status = true;
                    else arrItem.status = false;
                }
                // styles
                else if (path.endsWith(".css"))
                {
                    $internals.Utils.compileCSS(arrItem.text);
                    arrItem.status = true;
                }
                // templates and etc.
                else
                {
                    arrItem.error = compileHTML(arrItem.name, arrItem.text);
                    if (!arrItem.error) arrItem.status = true;
                    else arrItem.status = false;
                }

                // removing text
                arrItem.text = null; 
                // pointing out file was downloaded
                if (arrItem.status) cache[arrItem.path] = ALREADY_DOWNLOADED;
            }

            handler(resultArr);
        };


        // processed files
        var generatedHandler;
        for (var i = 0; i < arr.length; ++i)
        {
            generatedHandler = (function (i) { return function (status, text) { fileHandler(i, status, text) } })(i);

            // IF file was already downloaded
            var cacheValue = cache[arr[i]];
            if (cacheValue)
                generatedHandler(Alloy.Com.SUCCESS, cacheValue);
            // need to download file
            else
                downloadFile(arr[i], generatedHandler);
        }
    };
})();;
    $internals.Templates = (function Alloy_initTemplates()
{
    var handleTemplate = function handleTemplate(name, html)
    {
        // trimming
        var pos = 0;
        while (pos < html.length)
        {
            var c = html.charCodeAt(pos);
            if (c == 9 || c == 32 || c == 10 || c == 13)
            {
                ++pos;
                continue;
            }
            break;
        }
        var endPos = html.length;
        while (endPos > pos)
        {
            var c = html.charCodeAt(endPos - 1);
            if (c == 9 || c == 32 || c == 10 || c == 13)
            {
                --endPos;
                continue;
            }
            break;
        }

        // creating document fragment
        var div = document.createElement("div");
        div.innerHTML = html.substring(pos, endPos);
        var fragment = document.createDocumentFragment();
        var l = div.childNodes.length;
        for (var j = 0; j < l; ++j) fragment.appendChild(div.firstChild);

        // if we need to add custom tags
        if (recursiveFunc)
        {
            document.createElement(name);
            document.createElement(name.toUpperCase());
            document.createElement(name.toLowerCase());
            recursiveFunc(fragment);
        }

        // adding to dictionary
        templates[name.toUpperCase()] = fragment;
    }


    var recursiveFunc = null;
    if ($internals.Utils.priorToIE9)
    {
        recursiveFunc = function recursiveFunc_(dom)
        {
            if (dom.nodeName.charAt(0) == '#') return;

            // creating relevant dom elements
            document.createElement(dom.nodeName);
            document.createElement(dom.nodeName.toLowerCase());
            document.createElement(dom.nodeName.toUpperCase());
            if (dom.tagName)
            {
                document.createElement(dom.tagName);
                document.createElement(dom.tagName.toLowerCase());
                document.createElement(dom.tagName.toUpperCase());
            }

            // iterating children
            var l = dom.childNodes.length;
            while (l--) recursiveFunc_(dom.childNodes[l]);
        }

        // special
        //document.createElement("ALLOY-EMBEDDED-DATA"); 
        document.createElement("alloy-embedded-data");
        document.createElement("alloy-template");
        //document.createElement("ALLOY-TEMPLATE");
    }

    // alloy-embedded-data should appear on screen
    $internals.Utils.compileCSS("alloy-embedded-data {display:none}");
    $internals.Utils.compileCSS("ALLOY-EMBEDDED-DATA {display:none}");
    

    // building templates
    var templates = {};
    var scripts = document.getElementsByTagName('script');
    for (var i = 0 ; i < scripts.length; i++)
    {
        if (scripts[i].getAttribute("type") != 'text/alloy') continue;
        var tag = scripts[i].getAttribute("alloy-tag");

        handleTemplate(tag, scripts[i].innerHTML);
        $internals.Utils.removeElement(scripts[i--]); // removing from DOM
    }

    return {
        get: function getTemplate(domElement)
        {
            var templateName;
			// getting template name
			if (typeof(domElement) === 'string')
			{
				templateName = domElement.toUpperCase();
			}
			else
			{
				templateName = domElement.attributes ? domElement.getAttribute("alloy-template") : null;
				if (!templateName) templateName = domElement.tagName;
				if (!templateName) return null;
				templateName = templateName.toUpperCase();
			}

            // taking from templates
            return templates[templateName];
        }
        , set: function(tag, html)
        {
            handleTemplate(tag, html);
        }
        , exists: function(tag)
        {
            return templates[tag.toUpperCase()] !== undefined;
        }
    };

})();

// public interface
Alloy.injectTemplate = $internals.Templates.set;;
    var lastId = 0;
/////////////////////////////////////////////////////////////////////////////////
/// MODEL TRIE NODE
var ModelTrieNode = $internals.ModelTrieNode = function ModelTrieNode(word, parent, type)
{
    this.word = word;
    this.parent = parent;
    this.id = ++lastId;
    this.type = type || 0;
}
ModelTrieNode.prototype.toHtml = function(builder)
{
    if (!builder) builder = [];
    var value = typeof (this.modelValue) === 'object' ? 'object' : this.modelValue;
    builder.push("<span>" + this.word + "=" + value + " (" + this.id + ")" + "<span>");
    if (this.nodes) for(var i=0;i<this.nodes.length;++i)
    {
        builder.push("<div style='padding:5px 45px'>");
        this.nodes[i].toHtml(builder);
        builder.push("</div>");
    }
    return builder;
}
ModelTrieNode.prototype.tryCreateNode = function (word)
{
    // adding to trie
    var parsedValue = parseInt(word, 10);
    var key;
    if (isNaN(parsedValue)) key = word;
    else key = parsedValue;

    // searching in hash
    if (this.nodesHash)
    {
        var index = this.nodesHash[key];
        if (index || index === 0) return this.nodes[index];
    }
    else // creating arrays
    {
        this.nodesHash = {};
        this.nodes = [];
    }
    
    // creating new node
    var newNode = new ModelTrieNode(key, this, 0);
    this.nodesHash[key] = this.nodes.length;
    this.nodes.push(newNode);
    return newNode;
}
ModelTrieNode.prototype.createLoopIterationNode = function(id)
{
    var node = this.tryCreateNode(id);
    node.type = 2; // loop
    return node;
}
ModelTrieNode.prototype.createFixedValueNode = function(value)
{
    var key = "$$" + (this.nodes ? this.nodes.length : 0);
    if (!this.nodesHash)
    {
        this.nodesHash = {};
        this.nodes = [];
    }

    // creating new node
    var newNode = new ModelTrieNode(key, this, 1);
    newNode.modelValue = value;
    this.nodesHash[key] = this.nodes.length;
    this.nodes.push(newNode);
    return newNode;
}
ModelTrieNode.prototype.addDependency = function(domPointer, expression)
{
    if (!this.dependents) this.dependents = [];
    this.dependents.push({domPointer: domPointer, expression: expression});
}
ModelTrieNode.prototype.addDependentScope = function (scope)
{
    if (!this.dependentScopes) this.dependentScopes = [];
    this.dependentScopes.push(scope);
}
ModelTrieNode.prototype.addPriorNode = function(node)
{
    if (!this.priorUpdateNodes) this.priorUpdateNodes = [];
    this.priorUpdateNodes.push(node);
}
ModelTrieNode.prototype.id = -1; // node id (for debugging)
ModelTrieNode.prototype.type = 0; // 0: scope dependent, 1: fixed value, 2: loop content
ModelTrieNode.prototype.word = null; // node word (path)
ModelTrieNode.prototype.parent = null; // node's parent
ModelTrieNode.prototype.generation = 0; // update generation
ModelTrieNode.prototype.nodes = null; // child nodes array, to easily iterate
ModelTrieNode.prototype.nodesHash = null; // child nodes hash, to find if child exists o(1)
ModelTrieNode.prototype.dependents = null; // dependents array
ModelTrieNode.prototype.modelValue = null; // node value
ModelTrieNode.prototype.dependentScopes = null; // dependent scopes array
ModelTrieNode.prototype.pendingUpdateNodes = null; // nodes that waits for this node to finish
ModelTrieNode.prototype.priorUpdateNodes = null; // trienode that must be updated before current


/////////////////////////////////////////////////////////////////////////////////
/// ACTIVE LOOP
var ActiveLoop = $internals.ActiveLoop = function ActiveLoop(loopContent, trieNode, parent, index)
{
    this.loopContent = loopContent;
    this.trieNode = trieNode;
    this.parent = parent;
    this.index = index;
    if (!this.parent)
        this.depth = 1;
    else
        this.depth = this.parent.depth+ 1;
}
ActiveLoop.prototype.loopContent = null;
ActiveLoop.prototype.depth = -1;
ActiveLoop.prototype.index = -1;
ActiveLoop.prototype.trieNode = null;
ActiveLoop.prototype.parent = null;

/////////////////////////////////////////////////////////////////////////////////
/// DOM POINTER
var DomPointer = $internals.DomPointer = function DomPointer(element, attribute, contentInfo)
{
    this.element = element;
    this.attribute = attribute;
    this.contentInfo = contentInfo;
    this.id = ++lastId;

    //DEBUG
    //if (this.element.nodeName.charAt(0) !== '#') this.element.setAttribute("alloy-id", this.id);
}
DomPointer.prototype.addDependent = function(modelNode, expression)
{
    if (!this.dependents) this.dependents = [];
    this.dependents.push({ modelNode: modelNode, expression: expression });
}
DomPointer.prototype.element = null;
DomPointer.prototype.attribute = null;
DomPointer.prototype.contentInfo = null;
DomPointer.prototype.id = -1;
DomPointer.prototype.updateCycle = 0;
DomPointer.prototype.dependents = null;

/////////////////////////////////////////////////////////////////////////////////
// LOOP Content
var LoopContent = $internals.LoopContent = function LoopContent()
{
    this.id = ++lastId;
    this.collectionName = { start: -1, end: -1 };
};
LoopContent.prototype.filter = null;
LoopContent.prototype.id = null;
LoopContent.prototype.sorter = null;
LoopContent.prototype.elementName = null;
LoopContent.prototype.collectionName = null;
LoopContent.prototype.limit = null;
LoopContent.prototype.thisIndex = -1;
LoopContent.prototype.parentLoop = null;
LoopContent.prototype.iterator = null;
LoopContent.prototype.count = 0;

// Text Content
var TextContent = $internals.TextContent = function TextContent(value)
{
    this.value = value;
};
TextContent.prototype.value = null;

/////////////////////////////////////////////////////////////////////////////////
/// Expression
var Expression = $internals.Expression = function Expression(type, index) { if (type) { this.type = type; } if (index !== undefined) { this.index = index;} };
Expression.prototype.index = null;
Expression.prototype.type = null;
Expression.prototype.compiled = null;

/////////////////////////////////////////////////////////////////////////////////
/// This OBJECT
var This = $internals.This = function This(trieNode, parentIndex)
{
    this.trieNode = trieNode;
    this.parentIndex = parentIndex;
}
This.prototype.trieNode = null;
This.prototype.parentIndex = -1;

//////////////////////////////////////////////////////////////////////
///// Loop sorter
function Sorter(sortValue, dir)
{
    this.dir = dir;
    this.sortValue = sortValue;

    // creating merge sort
    this.mergeSort = new Alloy.MergeSort();

    // creating merge sort for string
    this.mergeSortString = new Alloy.MergeSort_String();
    // overriding method
    if (sortValue)
        this.mergeSortString.$comparer = function MergeSort_$comparer(a, b)
        {
            return Alloy.MergeSort_String.strCmp(a[sortValue], b[sortValue]);
        }
    else
        this.mergeSortString.$comparer = function MergeSort_$comparer(a, b)
        {
            return Alloy.MergeSort_String.strCmp(a, b);
        }
}
$internals.Sorter = Sorter;
// STATIC
Sorter.map = [];
Sorter.getSorter = function Sorter_getSorter(sortValue, dir)
{
    var key = sortValue + "_" + dir;
    var sorter = Sorter.map[key];
    if (!sorter) sorter = Sorter.map[key] = new Sorter(sortValue, dir);
    return sorter;
}
// INTERNAL
Sorter.prototype.sort = function Sorter_sort(collection)
{
    // no collection or nothing to sort
    if (!collection || collection.length < 2) return collection;

    // string merge
    if ((this.sortValue && typeof (collection[0][this.sortValue]) == 'string')
        || typeof (collection[0]) === 'string')
        this.mergeSortString.sort(collection, this.dir !== 'asc');
    else
        this.mergeSort.sort(collection, this.dir !== 'asc');

    return collection;
}
Sorter.prototype.sortValue = null;
Sorter.prototype.dir = null;
Sorter.prototype.mergeSort = null;
Sorter.prototype.mergeSortString = null;

;
    $internals.Parsers = {
    
    //////////////////////////////////////////////
    // MEMORY RE-USED OBJECTS
    __parseTextReusedObject: null
    ,__evalLoopFilterBuilder: null
    ,__getAlloyTextObjects: null
    , __getAlloyCompiledObjects: null
    , __refCount: 0
    ,initMemoryObjects: function ()
    {
        if (++this.__refCount !== 1) return;

        this.__parseTextReusedObject = { html: null, results: null, resultsLength: 0 };
        this.__getAlloyTextObjects = [];
        this.__getAlloyCompiledObjects = [];
    }

    , createCompiledObject: function()
    {
        return { value: null, textResultsCount: 0, textResults: [], compiled: null };
    }

    , createTextObject: function ()
    {
        return { value: null, modelNode: null, varName: null };
    }

    ,clearMemoryObjects: function()
    {
        if (--this.__refCount !== 0) return;

        this.__parseTextReusedObject = null;
        this.__evalLoopFilterBuilder = null;
        this.__getAlloyTextObjects = null;
        this.__getAlloyCompiledObjects = null;
    }

    //////////////////////////////////////////////
    // ARRAYS
    ,variableCharacters: (function ()
    {
        var arr = [];
        // A-Z
        for (var i = 65; i <= 90; ++i)
            arr[i] = 1;
        // a-z
        for (var i = 97; i <= 122; ++i)
            arr[i] = 1;
        // 0-9
        for (var i = 48; i <= 57; ++i)
            arr[i] = 1;

        // $
        arr[36] = 1;
        // _
        arr[95] = 1;

        return arr;
    })()

    ,tokenStartCharacters: (function ()
    {
        var arr = [];
        // A-Z
        for (var i = 65; i <= 90; ++i)
            arr[i] = 1;
        // a-z
        for (var i = 97; i <= 122; ++i)
            arr[i] = 1;
        // $ VALUE
        arr[36] = 1;

        return arr;
    })()

    ,variableCharacters_fullPath: (function ()
    {
        var arr = [];
        // A-Z
        for (var i = 65; i <= 90; ++i)
            arr[i] = 1;
        // a-z
        for (var i = 97; i <= 122; ++i)
            arr[i] = 1;
        // 0-9
        for (var i = 48; i <= 57; ++i)
            arr[i] = 1;
        // _
        arr[95] = 1;
        //.
        arr[46] = 1;
        // $
        arr[36] = 1;

        return arr;
    })()

    , safeWords: (function ()
    {
        var arr = [];
        arr['switch'] = 1;
        arr['in'] = 1;
        arr['for'] = 1;
        arr['return'] = 1;
        arr['window'] = 1;
        arr['true'] = 1;
        arr['false'] = 1;
        arr['eval'] = 1;
        arr['if'] = 1;
        arr['else'] = 1;

        return arr;
    })()

    //////////////////////////////////////////////
    // getting value between {{ }} according to scope
    // the function returns dependencyTrieNode OR [dependencyTrieNodes] 
    , getAlloyValue: function getAlloyValue(value, valueStart, valueEnd, scope, thisIndex, memoryObjectIndex)
    {
        memoryObjectIndex = memoryObjectIndex || 0;

        var result = this.getAlloyValue_text(memoryObjectIndex, value, valueStart, valueEnd, scope, thisIndex);
        if (result)
        {
            var compiledObject = this.getReturnedCompiledValue(memoryObjectIndex);
            compiledObject.value = result.value;
            compiledObject.compiled = null;
            compiledObject.textResultsCount = 1;

            // adding nodes
            if (0 === compiledObject.textResults.length)
                compiledObject.textResults.push(result);
            else
                compiledObject.textResults[0] = result;

            return compiledObject;
        }
        else
        {
            return this.getAlloyValue_compiled(memoryObjectIndex, value, valueStart, valueEnd, scope, thisIndex);
        }
    }
    , getReturnedTextValue: function(objectIndex)
    {
        // creating a new text object if needed
        if (this.__getAlloyTextObjects.length === objectIndex)
            this.__getAlloyTextObjects.push(this.createTextObject());
        return this.__getAlloyTextObjects[objectIndex];
    }
    , getReturnedCompiledValue: function (objectIndex)
    {
        // creating a new text object if needed
        if (this.__getAlloyCompiledObjects.length === objectIndex)
            this.__getAlloyCompiledObjects.push(this.createCompiledObject());
        return this.__getAlloyCompiledObjects[objectIndex];
    }
    , getAlloyValue_text: function getAlloyValue_text(memoryObjectIndex, value, valueStart, valueEnd, scope, thisIndex)
    {
        var pos = valueStart;
        
        // trimming
        for (; pos < valueEnd && value.charAt(pos) === ' '; ++pos) { }
        for (; valueEnd >= valueStart && value.charAt(valueEnd - 1) === ' '; --valueEnd) { }

        var prevPos = pos;
        var stack_this = scope.$stack.$this;
        thisIndex = thisIndex === undefined ? stack_this.length - 1 : thisIndex;
        var This;
        var firstSegment = true, inIterator=false;
        var stringEnd = valueEnd + 1;
        var unknownValue, c;
        var tmpIndex, tmpNode, tmpPos, activeLoop;
        
        
        var modelTrieNode = scope.$dependencies;
        var obj; //stack_this[thisIndex].trieNode.modelValue; // default is 'this'

        for (; pos !== stringEnd; ++pos)
        {
            // 
            if (pos !== valueEnd)
            {
                c = value.charCodeAt(pos);

                // illegal character
                if (!$internals.Parsers.variableCharacters_fullPath[c]) return false;
            }

            // reached '.' or end of value
            if (c === 46 || pos === valueEnd)
            {
                // first . we see, trying to fit known objects
                if (firstSegment)
                {
                    var loopCount = scope.$stack.$activeLoops.count;
                    firstSegment = false;
                    if(value === '$phase')
                    {
                        obj = scope.$phase;
                        modelTrieNode = scope.$dependencies.tryCreateNode("$phase");
                        modelTrieNode.modelValue = obj;
                    }
                    else if (value.equals("this", prevPos))
                    {
                        obj = stack_this[thisIndex].trieNode.modelValue;
                        modelTrieNode = stack_this[thisIndex].trieNode; // updating path
                        modelTrieNode.modelValue = obj;
                    }
                    else if (value.equals("embedded", prevPos))
                    {
                        modelTrieNode = modelTrieNode.tryCreateNode("$embedded"); // updating path
                        obj = scope.$embedded;
                        modelTrieNode.modelValue = obj;
                    }
                    else if (value.equals("model", prevPos))
                    {
                        modelTrieNode = modelTrieNode.tryCreateNode("$model"); // updating path
                        obj = scope.$model; // scope's model
                    }
                    else if (value.equals("scope", prevPos))
                    {
                        modelTrieNode = modelTrieNode.tryCreateNode("$model"); // updating path
                        obj = scope.$model; // scope's model
                    }
                    else if (value.equals("window", prevPos))
                    {
                        obj = window;
                        modelTrieNode = scope.$dependencies.createFixedValueNode(obj);
                    }
                    else if (value.equals("$parent", prevPos))
                    {
                        var parentIndex = thisIndex ? stack_this[thisIndex].parentIndex : 0;
                        modelTrieNode = stack_this[parentIndex].trieNode; // updating path
                        obj = modelTrieNode.modelValue;
                    }
                    else if (value.equals("$iterator", prevPos))
                    {
                        inIterator = true;
                        obj = undefined;
                        modelTrieNode = null;
                    }
                    else // unknown
                    {
                        unknownValue = value.substring(prevPos, pos);

                        // searching in active loop
                        if (loopCount !== 0)
                        {
                            do
                            {
                                activeLoop = scope.$stack.$activeLoops.array[loopCount];

                                // loop item
                                if (activeLoop.loopContent.elementName === unknownValue)
                                {
                                    modelTrieNode = activeLoop.trieNode;
                                    obj = modelTrieNode.modelValue;
                                    break;
                                }
                                // loop iterator name
                                else if (activeLoop.loopContent.iterator === unknownValue)
                                {
                                    obj = activeLoop.index;
                                    modelTrieNode = scope.$dependencies.createFixedValueNode(obj);
                                    break;
                                }

                                // going up
                                if (--loopCount === 0) break;

                            } while (true);
                        }

                        // searching in this
                        if (obj === undefined)
                        {
                            This = stack_this[thisIndex].trieNode; // taking self object
                            obj = This.modelValue[unknownValue]; // taking value from model
                            modelTrieNode = This.tryCreateNode(unknownValue); // updating path

                            // 
                            modelTrieNode.modelValue = obj;
                        }
                    }
                }
                else
                {
                    // in iterator parsing
                    if (inIterator)
                    {
                        activeLoop = scope.$stack.$activeLoops.array[loopCount];

                        // previous item
                        if (value.equals("back", prevPos))
                        {
                            // if NOT the first item in iteration
                            if (loopCount && activeLoop.index)
                            {
                                tmpNode = activeLoop.trieNode.parent;
                                tmpIndex = tmpNode.nodesHash[activeLoop.index - 1];
                                modelTrieNode = tmpNode.nodes[tmpIndex];
                                obj = modelTrieNode.modelValue;
                            }
                        }
                        // current index
                        else if (value.equals("index", prevPos))
                        {
                            if (loopCount)
                            {
                                obj = activeLoop.index;
                                modelTrieNode = scope.$dependencies.createFixedValueNode(obj);
                            }
                        }
                        // current
                        else if (value.equals("current", prevPos))
                        {
                            if (loopCount)
                            {
                                modelTrieNode = activeLoop.trieNode;
                                obj = modelTrieNode.modelValue;
                            }
                        }
                        // depth
                        else if (value.equals("depth", prevPos))
                        {
                            if (loopCount)
                            {
                                obj = loopCount;
                                modelTrieNode = scope.$dependencies.createFixedValueNode(obj);
                            }
                        }
                        // count
                        else if (value.equals("count", prevPos))
                        {
                            if (loopCount)
                            {
                                modelTrieNode = activeLoop.loopContent.countNode;
                                obj = modelTrieNode.modelValue;
                            }
                        }

                        // removing inIterator flag
                        inIterator = false;
                    }
                    // regular object
                    else
                    {
                        unknownValue = value.substring(prevPos, pos);
                        if (obj) obj = obj[unknownValue];
                        if (modelTrieNode)
                        {
                            // fixed value
                            if (modelTrieNode.type === 1)
                                modelTrieNode = modelTrieNode.createFixedValueNode(obj); // updating path
                            else // normal, loop
                            {
                                modelTrieNode = modelTrieNode.tryCreateNode(unknownValue); // updating path
                                modelTrieNode.modelValue = obj; // setting object value
                            }
                        }
                    }
                }

                // skipping '.'
                prevPos = pos + 1;
            }
        }


        // no trie node.. using $temp
        if (modelTrieNode === null)
            modelTrieNode = scope.$dependencies.createFixedValueNode(undefined);

        // setting params
        var returnObject = this.getReturnedTextValue(memoryObjectIndex);
        returnObject.value = obj;
        returnObject.modelNode = modelTrieNode;

        return returnObject;
    }

    , getAlloyValue_compiled: function getAlloyValue_compiled(memoryObjectIndex, value, valueStart, valueEnd, scope, thisIndex)
    {
        // checking if already processed
        var term = value.substring(valueStart, valueEnd);
        var compiledObject = scope.$compiledEval[term];
        if (!compiledObject)
        {
            compiledObject = {};
            var str = ["0, (function(vars){return "];
            compiledObject.vars = $internals.Parsers.parseExpression(term, str); // getting arguments
            str.push(";})");

            compiledObject.func = $internals.Utils.eval(str.join(''));
            scope.$compiledEval[term] = compiledObject;
        }
        
        // getting arguments
        var result;
        var varArgument = {};
        var vars = compiledObject.vars;
        var returnCompiledObject = this.getReturnedCompiledValue(memoryObjectIndex);
        returnCompiledObject.textResultsCount = 0;
        if (vars)
        {
            var l = vars.length;
            while (l--)
            {
                result = $internals.Parsers.getAlloyValue_text(memoryObjectIndex, vars[l], 0, vars[l].length, scope, thisIndex);
                if (!result) throw ('Alloy: unable to get value = ' + vars[l]);
                result.varName = vars[l]; // adding argument name
                
                // adding to vars
                varArgument[vars[l]] = result.value;

                // adding to result object
                if (returnCompiledObject.textResultsCount === returnCompiledObject.textResults.length)
                    returnCompiledObject.textResults.push($internals.Utils.clone(result, false));
                else
                    returnCompiledObject.textResults[returnCompiledObject.textResultsCount] = $internals.Utils.clone(result, false);
                returnCompiledObject.textResultsCount++;
            }
        }

        // setting values
        returnCompiledObject.value = compiledObject.func(varArgument);
        returnCompiledObject.compiled = compiledObject.func;
        return returnCompiledObject;
    }

    // parsing loop statement
    // e.g: item in items | where item.name > 2 | sortAsc name
    , parseLoopStatement: function parseLoopStatement(value)
    {
        var pos = 0;
        var nextPos;

        var loopContent = new LoopContent();

        // parse element and collection
        for (; value.charAt(pos) === ' '; ++pos) { } // skip whitespace
        for (nextPos = pos + 1; value.charAt(nextPos) !== ' ' ; ++nextPos) { } // get element end pos
        loopContent.elementName = value.substring(pos, nextPos);

        for (pos = nextPos + 1; value.charAt(pos) === ' '; ++pos) { } // skip whitespace - find 'in' element start
        if (!value.equals("in ", pos)) throw "invalid syntax";

        for (pos += 3; value.charAt(pos) === ' '; ++pos) { } // skip whitespace - find collection name
        for (nextPos = pos; nextPos < value.length && value.charAt(nextPos) !== ' ' && value.charAt(nextPos) !== '|'; ++nextPos) { } // find collection end (space or pipe)
        loopContent.collectionName.start = pos;
        loopContent.collectionName.end = nextPos;

        pos = nextPos;
        for (; pos < value.length && value.charAt(pos) === ' '; ++pos) { } // skip whitespace
        
        // FINISHED - no filter or sorting
        if (pos === value.length) return loopContent;

        do
        {
            // verify pipe closing of previous segment
            if (value.charAt(pos) !== '|') throw "invalid syntax";
            ++pos;

            for (; value.charAt(pos) === ' '; ++pos) { }; // skip whitespace

            // find syntax word to indicate type of segment
            for (nextPos = pos + 1; nextPos < value.length && value.charAt(nextPos) !== ' '; ++nextPos) { }
            var segmentType = value.substring(pos, nextPos);

            for (pos = nextPos + 1; pos < value.length && value.charAt(pos) === ' '; ++pos) { } // skip whitespace
            // find segment end -- double pipe checking to allow logical OR operator
            for (nextPos = pos + 1; nextPos < value.length ; ++nextPos)
            {
                if (value.charAt(nextPos) === '|' )
                {
                    if ( value.charAt(nextPos + 1) === '|') 
                    {
                        ++nextPos; // skip logical OR
                        continue;
                    }
                    break;
                }
            } // find collection end (space or pipe)
            var trimmedEndPos;
            for (trimmedEndPos = nextPos; trimmedEndPos < value.length && value.charAt(trimmedEndPos - 1) === ' '; --trimmedEndPos) { } // trimming spaces at end of value
            
            if (segmentType === "WHERE")
            {
                loopContent.filter = value.substring(pos, trimmedEndPos);
            }
            else if (segmentType === "ITERATOR")
            {
                loopContent.iterator = value.substring(pos, trimmedEndPos);
            }
            else if (segmentType === "SORTASC")
            {
                loopContent.sorter = Sorter.getSorter(value.length > pos ? value.substring(pos, trimmedEndPos) : null, "asc");
            }
            else if (segmentType === "SORTDESC")
            {
                loopContent.sorter = Sorter.getSorter(value.length > pos ? value.substring(pos, trimmedEndPos) : null, "desc");
            }
            else if (segmentType === "LIMIT")
            {
                loopContent.limit = { start: pos, end: trimmedEndPos };
            }
            pos = nextPos;

        } while (pos < value.length);

        return loopContent;
    }

    , parseText: function parseText(html, scope, thisIndex, preDefinedValues)
    {
        // parsing content
        if (!html) return html;
        
        this.__parseTextReusedObject.resultsLength = 0; // resetting array length
        var builder = null;
        var startIndex = 0;
        var lastEndPos = 0;
        
        while (startIndex < html.length)
        {
            startIndex = html.indexOf("{{", lastEndPos);
            if (startIndex === -1)
            {
                if (!builder) break;  // nothing to replace
                builder.push(html.substring(lastEndPos));
                break;
            }

            // adding string in between signatures
            if (!builder) builder = [];

            builder.push(html.substring(lastEndPos, startIndex));

            // search for end signature
            lastEndPos = html.indexOf("}}", startIndex);
            if (lastEndPos === -1)
            {
                builder.push(html.substring(startIndex));
                break;
            }
            if (html.charAt(lastEndPos + 2) === '}')
                ++lastEndPos;

            // inserting predefined values
            if (preDefinedValues)
            {
                var value = preDefinedValues[this.__parseTextReusedObject.resultsLength];
                // eval function
                if (value !== undefined && value.compiled) value = value.compiled(value.vars);
                // inserting to builder
                builder.push(value); 
            }
            // getting value
            else
            {
                // getting alloy value (using this.__getAlloyCompiledObjects at the end)
                var parseInfo = $internals.Parsers.getAlloyValue(html, startIndex + 2, lastEndPos, scope, thisIndex, this.__parseTextReusedObject.resultsLength);

                // adding value to builder
                builder.push(parseInfo.value);
            }
            ++this.__parseTextReusedObject.resultsLength; // updating value index

            lastEndPos += 2; // skipping end signature for next loop;
        }

        if (!builder) this.__parseTextReusedObject.html = html;
        else this.__parseTextReusedObject.html = builder.join(''); // joining new HTML

        // using the array
        this.__parseTextReusedObject.results = this.__getAlloyCompiledObjects;

        return this.__parseTextReusedObject;
    }

    // parsing eval expression
    , parseExpression: function parseExpression(expression, builder, fixedVars)
    {
        var usedValues = [];
        var skipLocalVariables = [];
        var state = 0; //
        var c, quoteChar, token;
        var tokenStart = 0, chainStart = 0, firstChainTokenEnd;
        var lastInsertEndPos = 0;;
        var i = 0, len = expression.length;
        var inReferenceChain = false;
        do
        {
            switch (state)
            {
                case 0: //waitForToken
                    for (; i < len; i++)
                    {
                        c = expression.charCodeAt(i);
                        if (c === 123)  // detect { to indicate scope depth
                        {
                            skipLocalVariables.push(null); // add a placeholder to indicate a scope started (padding between local variables)
                            continue;
                        }
                        if (c === 125)  // detect } to indicate scope depth
                        {
                            while (skipLocalVariables.pop() !== null) { }; // pop all local variables until a scope padding is found
                            continue;
                        }
                        // detect A-Z CHARACTER to indicate token start
                        if ($internals.Parsers.tokenStartCharacters[c])
                        {
                            tokenStart = i;
                            state = 1; break; // inToken State
                        }
                        if (c > 47 && c < 58)
                        { // detect a number - NUMERIC LITERAL START
                            ++i;
                            state = 6; break; //numericLiteral
                        }
                        if (c === 34 || c === 39)
                        {  // detect a qupte - STRING LITERAL START
                            ++i;
                            quoteChar = c;
                            state = 5; break; // stringliteral State
                        }
                    }
                    break;
                case 1: // inToken State
                    for (; i < len; i++)
                    {
                        c = expression.charCodeAt(i);
                        // detect end of token (non alphanumeric) 
                        if (!$internals.Parsers.variableCharacters[c])
                        {
                            // if not currently in a reference chain - ADD TOKEN REFERENCE
                            if (!inReferenceChain)
                            {
                                // checking if token is a known variable (we can technically skip this)
                                var token = expression.substring(tokenStart, i);
                                // if token is a reserved word indicating next token is not a possible variable (only if token is delimited by a space)
                                if (c === 32 && (token === "new" || token === "function" || token === "var"))
                                {
                                    ++i; state = 2; break; // inDeclaration state
                                }
                                // add token if found in variables table and is not overridden in local scope
                                if (!$internals.Parsers.safeWords[token] && !$internals.Utils.inArray(skipLocalVariables, token))
                                {
                                    builder.push(expression.substring(lastInsertEndPos, tokenStart), "vars['");
                                    lastInsertEndPos = tokenStart; // next time insert from current token (including)
                                }
                            }
                            
                            // if period '.' - detect reference chains
                            switch (c)
                            {
                                case 46: // period .

                                    // chain has started
                                    if (!inReferenceChain)
                                    {
                                        chainStart = tokenStart;
                                        firstChainTokenEnd = i;
                                        inReferenceChain = true;
                                    }

                                    tokenStart = ++i; // new token
                                    //state = 0; // waitForToken
                                    break;
                                default:
                                    if (inReferenceChain) // during chain
                                    {
                                        // if first chain token is a fixed var, keeping it
                                        if (fixedVars && (token = expression.substring(chainStart, firstChainTokenEnd))
                                            && $internals.Utils.inArray(fixedVars, token))
                                        {
                                            builder.push(token);
                                            builder.push("']");
                                            builder.push(expression.substring(firstChainTokenEnd, i));

                                            lastInsertEndPos = i;

                                            // inserting to used values
                                            $internals.Utils.insertUniqueToArray(usedValues, token);
                                        }
                                        else
                                        {
                                            // setting tokenEndIndex
                                            // if c is '(', tokenEndIndex should be chain's previous member
                                            // else, tokenEndIndex is i
                                            var tokenEndIndex = c === 40 ? tokenStart - 1 : i;

                                            token = expression.substring(chainStart, tokenEndIndex);
                                            if (!token.startsWith("window."))
                                            {
                                                builder.push(token);
                                                builder.push("']");
                                                lastInsertEndPos = tokenEndIndex;

                                                // inserting to used values
                                                $internals.Utils.insertUniqueToArray(usedValues, token);
                                            }
                                        }
                                    }
                                    else if (!$internals.Parsers.safeWords[token] && !$internals.Utils.inArray(skipLocalVariables, token))
                                    {
                                        // adding token to builder
                                        builder.push(token);
                                        builder.push("']");
                                        lastInsertEndPos = i;

                                        // inserting to used values
                                        $internals.Utils.insertUniqueToArray(usedValues, token);
                                    }
                                    inReferenceChain = false; // Omer : is this true? reference chain only after period? 

                                    // ' single quote, "" double quote
                                    if (c === 39 || c === 34)
                                    {
                                        quoteChar = c;
                                        state = 5;  // stringliteral State
                                    }
                                    else // change state: wait for next token
                                        state = 0; // waitForToken

                                    break;
                            }
                            break; // state change
                        }
                    }
                    break;
                case 5: // stringliteral State
                    var inEscateSequence = false;
                    for (; i < len; i++)
                    {
                        if (inEscateSequence)
                        {
                            inEscateSequence = false;
                            continue;
                        }
                        c = expression.charCodeAt(i);
                        if (c === 92) inEscateSequence = true; // detect \ for escape sequence
                        if (c === quoteChar) // detect closing string literal quote (single or double)
                        {
                            ++i; state = 0; break; // waitForToken
                        }
                    }
                    break;
                case 6: // NUMERIC LITEAL
                    var inEscateSequence = false;
                    for (; i < len; i++)
                    {
                        c = expression.charCodeAt(i);
                        if ((c > 57 || c < 48) && c !== 46) // allow numbers and period
                        {
                            ++i; state = 0; break; // waitForToken
                        }
                    }
                    break;
                case 2: // // inDeclaration state
                    // skip whitespaces until token
                    for (; i < len && expression.charCodeAt(i) === 32; i++) { };
                    tokenStart = i;
                    for (; i < len; i++)
                    {
                        c = expression.charCodeAt(i);
                        if (!((c > 96 && c < 123) || // lower alpha (a-z)
                                (c > 64 && c < 91) || // upper alpha (A-Z)
                                (c > 47 && c < 58))) // numeric (0-9)
                        {
                            var token = expression.substring(tokenStart, i);
                            skipLocalVariables.push(token); // add a placeholder to indicate a scope started (padding between local variables)
                            state = 0; break; // waitForToken
                            // not skipping character - allow IDLE state to handle scope '{' and other special characters
                        }
                    }
                    break;
            }
        } while (i < len);

        // process a token at the end of the input string
        if (state === 1) // inToken State
        {
            if (!inReferenceChain)
            {
                token = expression.substring(tokenStart, i);
                if (!$internals.Parsers.safeWords[token])
                {
                    if (!$internals.Utils.inArray(skipLocalVariables, token))
                    {
                        builder.push(expression.substring(lastInsertEndPos, tokenStart), "vars['");
                        builder.push(token);
                        builder.push("']");
                        lastInsertEndPos = i; // next time insert from current token (including)
                        $internals.Utils.insertUniqueToArray(usedValues, token);
                    }
                }
            }
            else
            {
                // inserting diff. (not sure we need it)
                if (lastInsertEndPos !== chainStart) { builder.push(expression.substring(lastInsertEndPos, chainStart)); }

                // if first chain token is a fixed var, keeping it
                if (fixedVars && (token = expression.substring(chainStart, firstChainTokenEnd))
                    && $internals.Utils.inArray(fixedVars, token))
                {
                    builder.push(token);
                    builder.push("']");
                    builder.push(expression.substring(firstChainTokenEnd, i));
                    lastInsertEndPos = i;
                }
                else
                {
                    token = expression.substring(chainStart, i);
                    if (!token.startsWith("window."))
                    {
                        // inserting token
                        builder.push(token);
                        builder.push("']");
                        lastInsertEndPos = i;
                    }
                    else // 
                        lastInsertEndPos = chainStart;
                }
                
                if (!$internals.Parsers.safeWords[token] && !token.startsWith("window")) $internals.Utils.insertUniqueToArray(usedValues, token);
            }
        }

        if (lastInsertEndPos !== len)
            builder.push(expression.substring(lastInsertEndPos, len));

        return usedValues;
    }
};;
    $internals.Binder = (function()
{
    //////////////////////////////////////////////////////////////////
    // Internals (private static methods)
    function bindLoop(loopStatement, domElement, scope, thisIndex)
    {
        // creating comment
        var comment = document.createComment(loopStatement);
        $internals.Utils.replaceDomElement(comment, domElement);

        var loopContent = $internals.Parsers.parseLoopStatement(loopStatement);
        var getLoopCollectionResult, collection;

        // collection
        if (loopContent.collectionName.start !== -1)
        {
            getLoopCollectionResult = $internals.Parsers.getAlloyValue(loopStatement, loopContent.collectionName.start, loopContent.collectionName.end, scope, thisIndex);
            collection = getLoopCollectionResult.value;
        }
        
        // creating dom pointer
        var ex;
        var domPointer = new DomPointer(domElement, null, loopContent);

        // adding dependency in collection
        var modelNode = getLoopCollectionResult.textResults[0].modelNode.createLoopIterationNode(loopContent.id);
        modelNode.addDependency(domPointer, new Expression('loop'));

        // setting loopContent values
        loopContent.thisIndex = thisIndex;
        loopContent.parentLoop = scope.$stack.$activeLoops.array[scope.$stack.$activeLoops.count];
        loopContent.repeatedElement = domElement;
        loopContent.commentElement = comment;

        // depending on parent loop's update
        if (loopContent.parentLoop)
            modelNode.addPriorNode(loopContent.parentLoop.trieNode);
        
        // limit
        if (loopContent.limit)
        {
            var firstChar = loopStatement.charCodeAt(loopContent.limit.start);
            if (firstChar >= 48 && firstChar <= 57) // is a number
                loopContent.limit = loopStatement.substring(loopContent.limit.start, loopContent.limit.end) | 0; // 32-bit number
            else
            {
                // adding dependency (currently supporting 1 simple-value only)
                var getInfo = $internals.Parsers.getAlloyValue(loopStatement, loopContent.limit.start, loopContent.limit.end, scope, thisIndex);
                if (getInfo.value !== undefined)
                {
                    // setting limit
                    loopContent.limit = getInfo.value;

                    var alloyValueObject = getInfo.textResults[0];
                    // creating expression
                    var exp = new Expression('loop-limit');
                    if (getInfo.compiled)
                    {
                        exp.compiled = getInfo.compiled;
                        exp.varName = alloyValueObject.varName;
                    }

                    // adding dependency
                    alloyValueObject.modelNode.addDependency(domPointer, exp);

                    // this modelNode must be updated BEFORE loop's
                    modelNode.addPriorNode(alloyValueObject.modelNode);
                }
            }
        }
        
        // preparing filter
        if (loopContent.filter)
        {
            getLoopFilter(loopContent, modelNode, scope, thisIndex);
            compileLoopFilterVars(loopContent.filter, scope);
        }

        // setting initial value
            modelNode.modelValue = collection = $internals.Utils.clone(collection, false);
        
        // looping
        scope.$stack.$activeLoops.count++;
        if (collection && collection.length)
        {
            var processedItems = prepareLoopArray(collection, loopContent, modelNode);

            // building UI
            for (var i = 0; i < processedItems; ++i)
                loopItem(scope, loopContent, modelNode, collection[i], i);
        }

        // resetting pointer
        scope.$stack.$activeLoops.count--;
    }


    function loopItem(scope, loopContent, collectionDependencyNode, collectionItem, index)
    {
        // creating dependency node
        var childDependencyNode = collectionDependencyNode.tryCreateNode(index);
        childDependencyNode.modelValue = collectionItem;

        // setting current loop node
        var parentLoop = scope.$stack.$activeLoops.array[scope.$stack.$activeLoops.count - 1];
        var activeLoop = new ActiveLoop(loopContent, childDependencyNode, parentLoop, index);
        if (scope.$stack.$activeLoops.array.length === scope.$stack.$activeLoops.count)
            scope.$stack.$activeLoops.array.push(activeLoop);
        else
            scope.$stack.$activeLoops.array[scope.$stack.$activeLoops.count] = activeLoop;

        // looping over repeated items
        var clonedElement = loopContent.repeatedElement.cloneNode(true);
        loopContent.commentElement.parentNode.insertBefore(clonedElement, loopContent.commentElement);
        clonedElement = main(clonedElement, scope, loopContent.thisIndex);

        // adding dependency between childNode and dom elements
        childDependencyNode.addDependency(new DomPointer(clonedElement),  new Expression('ui-item'));
    }

    function prepareLoopArray(collection, loopContent, loopModelNode)
    {
            var l = collection.length;
            var processedItems = 0;
            var collectionItem;
            var skippedElements = 0;

        // first iteration - filtering items
        var elementName = loopContent.elementName;
            for (var i = 0; i < l; ++i)
            {
                collectionItem = collection[i];

                // moving item
                if (skippedElements) collection[i - skippedElements] = collectionItem;

                // filtering
                if (loopContent.filter)
                {
                    // setting 'collection item' vars
                    loopContent.filter.compiledVars[0][elementName] = collectionItem;

                    // filtering func
                    if (!loopContent.filter.func.apply(null, loopContent.filter.compiledVars))
                    {
                        ++skippedElements;
                        continue;
                    }
                }

                // limit
                ++processedItems;
                if (loopContent.limit && processedItems === loopContent.limit) break;
            }

        // shrinking array
        if (processedItems !== collection.length)
            collection = collection.slice(0, processedItems);

        // updating count
        if (!loopContent.countNode)
            loopContent.countNode = loopModelNode.createFixedValueNode(processedItems);
        else
            loopContent.countNode.modelValue = processedItems;

        // sorting?
        if (loopContent.sorter)
            loopModelNode.modelValue = collection = loopContent.sorter.sort(collection);

        // 
        return processedItems;
    }


    function optionItem(selectElement, optionsTrieNode, index, collectionItem, selected)
    {
        var opt = document.createElement("option"); // creating element
        if (typeof (collectionItem) === 'object') // object
        {
            opt.innerHTML = collectionItem.html || collectionItem.text || collectionItem.value; // html
            opt.value = collectionItem.value || collectionItem.text || collectionItem.html; // value
            if (selected == collectionItem.value) opt.selected = true; // setting selected
        }
        else // regular value
        {
            opt.innerHTML = opt.value = collectionItem;
            if (selected == collectionItem) opt.selected = true; // setting selected
        }

        // dependency of items
        var trieNode = optionsTrieNode.tryCreateNode(index);
        trieNode.addDependency(new DomPointer(opt), new Expression('ui-item'));

        // inserting into dom
        selectElement.appendChild(opt);
    }
    function attributes(domElement, scope, thisIndex)
    {
        var attributesCount = domElement.attributes.length;
        if (!attributesCount) return;
        var attrib, i, modelNode, events, ex, getValueResult, alloyValueObject;

        // image: replacing 'alloy-src' with 'src'
        if (domElement.nodeName === "IMG")
        {
            attrib = domElement.getAttribute("alloy-src");
            if (attrib)
            {
                domElement.setAttribute("src", "{{" + attrib + "}}");
                domElement.removeAttribute("alloy-src");
            }
        }

        // fixing onclick
        //if (domElement.nodeName === "A" && !domElement.getAttribute("onclick"))
        //    domElement.setAttribute("onclick", "return false;");

        while (attributesCount--)
        {
            attrib = domElement.attributes[attributesCount];
            if (!attrib) continue; // attribute 'alloy-src' might have been removed so count may not be accurate
            switch (attrib.name)
            {
                case "alloy-phase":
                    var phase = attrib.value;
                    if (scope.$phase !== null && scope.$phase !== phase)
                        domElement.style.display = 'none';
                    else
                    {
                        if (domElement.style.removeProperty)
                            domElement.style.removeProperty('display');
                        else if (domElement.style.removeAttribute)
                            domElement.style.removeAttribute('display');
                        else
                            domElement.style.display = '';
                    }

                    // creating node + dependency
                    modelNode = scope.$dependencies.tryCreateNode("$phase");
                    modelNode.modelValue = scope.$phase;
                    modelNode.addDependency(new DomPointer(domElement, attrib), new Expression('phase'));

                    break;
                case "alloy-if":
                    if (!attrib.value) break;
                    getValueResult = $internals.Parsers.getAlloyValue(attrib.value, 0, attrib.value.length, scope, thisIndex);
                    
                    var domPointer = new DomPointer(domElement, attrib);
                    var ll = getValueResult.textResultsCount;
                    while (ll--)
                    {
                        alloyValueObject = getValueResult.textResults[ll];

                        // creating expression
                        var exp = new Expression();
                        exp.type = 'if';
                        exp.index = 0;
                        if (getValueResult.compiled)
                        {
                            exp.compiled = getValueResult.compiled;
                            exp.varName = alloyValueObject.varName;
                        }

                        // adding dependency
                        domPointer.addDependent(alloyValueObject.modelNode, exp);
                        alloyValueObject.modelNode.addDependency(domPointer, exp);
                    }
                    
                    if (!getValueResult.value)
                    {
                        domElement.style.display = 'none';
                    }
                    else
                    {
                        if (domElement.style.removeProperty)
                            domElement.style.removeProperty('display');
                        else if (domElement.style.removeAttribute)
                            domElement.style.removeAttribute('display');
                        else
                            domElement.style.display = '';
                    }
                        
                    break;
                // ALL OTHER ATTRIBUTES
                default:
                    var attribName = attrib.name;
                    if (attribName.startsWith("alloy-"))
                    {
                        // DOM EVENTS
                        if (attribName.equals("bind-event-", "alloy-".length))
                        {
                            var evName = attribName.substring("alloy-bind-event-".length);
                            if (!evName) break;
                            var attribValue = attrib.value;
                            // invalid syntax
                            if (!attribValue.contains("(") && attribValue.contains(")"))
                            {
                                console.log("Alloy.bind-event: invalid syntax. missing (): " + attribValue);
                                break;
                            }

                            // getting bindData
                            var bindData = getBindEventData(evName, attribValue, scope, scope, thisIndex);
                            if (!bindData) break;
                            
                            // creating event handler
                            var eventHandler = (function eventFunc_creator(_scope, _thisIndex, _element, _bindData)
                            {
                                return function eventHandler(e)
                                {
                                    var scope = _scope;
                                    var element = _element;
                                    var bindData = _bindData;
                                    var thisIndex = _thisIndex;

                                    // adding variables
                                    var params = [];
                                    var evParamIndex = bindData.vars.length;
                                    while (evParamIndex--)
                                    {
                                        var varInfo = bindData.vars[evParamIndex];
                                        if (evParamIndex)
                                        {
                                            // event
                                            if (varInfo.name === 'e' || varInfo.name === 'event')
                                                params[varInfo.name] = e;
                                            // parent 'this'
                                            else if (varInfo.name === '$parent')
                                            {
                                                var parentIndex = thisIndex ? _scope.$stack.$this[thisIndex].parentIndex : 0;
                                                //console.log("this index:" + thisIndex + ", parent:" + parentIndex);
                                                params[varInfo.name] = _scope.$stack.$this[parentIndex].trieNode.modelValue;
                                            }
                                            else if (varInfo.name === "$domElement")
                                                params[varInfo.name] = element;
                                            else
                                                params[varInfo.name] = varInfo.modelTrieNode.modelValue;
                                        }
                                        else
                                            params[varInfo.name] = function () { scope[varInfo.name].apply(scope, arguments); }
                                    }
                                    
                                    // firing event
                                    var res = bindData.func(params);

                                    // handling event result
                                    if (res === undefined)
                                    {
                                        // if link doesn't change the page, we return false
                                        // to prevent 'beforeUnload' event to be fired. 
                                        var tar = element.getAttribute("target");
                                        if (tar && tar !== "_self" && tar !== "self") return false;

                                        var href = element.getAttribute("href");
                                        if (!href) return false;
                                        if (href.startsWith("#")) return false;
                                        if (href.startsWith("javascript:")) return false;
                                    }
                                }

                            })(scope, thisIndex, domElement, bindData);

                            // registering to event
                            if (window.addEventListener)
                                domElement.addEventListener(evName, eventHandler);
                            else
                                domElement.attachEvent("on" + evName, eventHandler);

                            // adding to event (to dispose later)
                            scope.$registeredDomEvents.push({ name: evName, element: domElement, func: eventHandler });
                        }
                        // SCOPE EVENTS (PARENT SCOPE IS REGISTERING)
                        else if (attribName.equals("bind-scope-event-", "alloy-".length))
                        {
                            var parentScope = scope.$parent;
                            if (!parentScope) break;
                            var evName = attribName.substring("alloy-bind-scope-event-".length);
                            if (!evName) break;
                            var attribValue = attrib.value;

                            // invalid syntax
                            if (!attribValue.contains("(") && attribValue.contains(")"))
                            {
                                console.log("Alloy.bind-event: invalid syntax. missing (): " + attribValue);
                                break;
                            }

                            // getting bindData
                            var bindData = getBindEventData(evName, attribValue, scope, parentScope, thisIndex);
                            if (!bindData) break;

                            // registering event
                            scope.regiesterHandler(evName, function ()
                            {
                                // this == temp object (bottom of this method)
                                var mthis = this;

                                var params = [];
                                params[0] = arguments; // event params
                                var customParams = params[1] = []; // custom params
                                
                                // adding variables
                                var evParamIndex = bindData.vars.length;
                                while (evParamIndex--)
                                {
                                    var varInfo = bindData.vars[evParamIndex];
                                    if (evParamIndex)
                                        params[varInfo.name] = varInfo.modelTrieNode.modelValue;
                                    else
                                        params[varInfo.name] = function () { mthis.scope.$parent[varInfo.name].apply(mthis.scope.$parent, params); }
                                }
                                customParams['scope'] = this.scope;
                                    
                                // firing event
                                bindData.func(params);

                            }, {scope: scope, bindData: bindData});
                        }
                        // skipping un-handled attributes
                        else break;
                    }
                    
                    // parsing value
                    getValueResult = bindText(domElement, attrib, attrib.value,scope, thisIndex)
                    if (getValueResult !== null) attrib.value = getValueResult;
                    break;
            }
        }

        // internal events (2 way binding)
        var eventFunc, $this;
        switch (domElement.tagName)
        {
            case "SELECT":
                var optionsDomPointer, optionsCollection, optionsTrieNode, selectedValueTrieNode;

                // getting options
                attrib = domElement.getAttribute("alloy-options");
                if (!attrib) break;

                //////////////////////////////////////////////////////////////////////////////////////////
                ////////// BUILDING OPTIONS

                getValueResult = $internals.Parsers.getAlloyValue(attrib, 0, attrib.length, scope, thisIndex);
                if (getValueResult.compiled) throw ("Alloy options must be plain value: " + attrib);

                // adding dependency
                optionsTrieNode = getValueResult.textResults[0].modelNode.createLoopIterationNode(++lastId);
                optionsDomPointer = new DomPointer(domElement, null, new Expression('options'));
                optionsTrieNode.addDependency(optionsDomPointer, optionsDomPointer.contentInfo);

                // no collection
                optionsCollection = getValueResult.value;
                domElement.innerHTML = ""; // resetting children

                if (optionsCollection)
                {
                    // creating children
                    var collectionLen = optionsCollection.length;
                    for (var i = 0; i < collectionLen; ++i)
                        optionItem(domElement, optionsTrieNode, i, optionsCollection[i]);

                    //////////////////////////////////////////////////////////////////////////////////////////
                    ////////// SELECTED VALUE
                    attrib = domElement.getAttribute("alloy-options-selected");
                    if (attrib)
                    {
                        if (attrib.startsWith('{{') && attrib.endsWith('}}'))
                        {
                            getValueResult = $internals.Parsers.getAlloyValue(attrib, 2, attrib.length - 2, scope, thisIndex);
                            attrib = getValueResult.value;

                            // setting dependency
                            modelNode = getValueResult.textResults[0].modelNode;
                            modelNode.addDependency(optionsDomPointer, new Expression('options-selected'));
                            optionsDomPointer.contentInfo.value = -1;

                            // options node is dependent
                            optionsTrieNode.addPriorNode(modelNode);

                            // optionsTrieNode now points to selected value
                            selectedValueTrieNode = modelNode;
                        }

                        // marking selected option
                        var collectionLen = optionsCollection.length;
                        var selectedOption;
                        while (collectionLen--)
                        {
                            // option.value is string
                            if (domElement.childNodes[collectionLen].value != attrib) continue;
                            selectedOption = domElement.childNodes[collectionLen];
                            selectedOption.selected = true;

                            optionsDomPointer.contentInfo.value = domElement.childNodes[collectionLen].value;
                        }

                        // adding value to options contentInfo
                        //optionsDomPointer.contentInfo.value = collectionLen;
                    }
                }

                //////////////////////////////////////////////////////////////////////////////////////////
                ////////// REGISTERING EVENT
				var that = domElement;
                eventFunc = function (e)
                {
                    // updating pointers
                    var value = that[that.selectedIndex].value;
                    optionsDomPointer.contentInfo.value = value;
                    
                    if (selectedValueTrieNode)
                    {
                        selectedValueTrieNode.modelValue = value;
                        updateModelValue(scope, selectedValueTrieNode, value);
					}
                }

                // registering to event
                if (window.addEventListener)
                    domElement.addEventListener("change", eventFunc);
                else
                    domElement.attachEvent("onchange", eventFunc);
                break;
            case "INPUT":
                var t = domElement.type.toLowerCase();
                if (!domElement.getAttribute("alloy-this")) break; // only handling cases were explicitly given 'this'

                // setting UI
                $this = scope.$stack.$this[thisIndex];
				var that = domElement;
				
                // add dependency (for model -> UI updates)
                var ex = new Expression(t, 0);
                $this.trieNode.addDependency(new DomPointer(domElement, null, ex), ex);

                switch(t)
                {
                    case "checkbox":
                        domElement.checked = domElement.defaultChecked = $this.trieNode.modelValue === true;

                        // registering DOM events (for UI -> model updates)
                        eventFunc = function (e)
                        {
                            // updating model
                            updateModelValue(scope, $this.trieNode, that.checked);
                        }
                        if (window.addEventListener)
                            domElement.addEventListener("click", eventFunc);
                        else
                            domElement.attachEvent("onclick", eventFunc);

                        break;
                    case "radio":
                        domElement.checked = domElement.defaultChecked = ($this.trieNode.modelValue === domElement.value) || ($this.trieNode.modelValue + "" === domElement.value);
                        // registering DOM events (for UI -> model updates)
                        eventFunc = function (e)
                        {
                            // updating model
                            updateModelValue(scope, $this.trieNode, that.value);
                        }

                        if (window.addEventListener)
                            domElement.addEventListener("click", eventFunc);
                        else
                            domElement.attachEvent("onclick", eventFunc);

                        break;
                    case "text":
                        eventFunc = function (e)
                        {
                            // updating model
                            updateModelValue(scope, $this.trieNode, that.value.Trim());
                        }

                        domElement.value = $this.trieNode.modelValue; // setting value
                        if (window.addEventListener)
                            domElement.addEventListener("keyup", eventFunc);
                        else
                            domElement.attachEvent("onkeyup", eventFunc);
                        break;
                }
                break;
        }
    };

    function getLoopFilter(loopContent, loopTrieNode, scope, thisIndex)
    {
        loopContent.filter;
        var compiledObject = {};
        var str = ["0, (function(vars){return "];
        compiledObject.vars = $internals.Parsers.parseExpression(loopContent.filter, str, [loopContent.elementName]); // getting arguments
        str.push(";})");
        compiledObject.func = $internals.Utils.eval(str.join(''));

        // getting parameters
        var evParamIndex = compiledObject.vars.length;
        while (evParamIndex--)
        {
            var paramResult = $internals.Parsers.getAlloyValue(compiledObject.vars[evParamIndex], 0, compiledObject.vars[evParamIndex].length, scope, thisIndex);
            compiledObject.vars[evParamIndex] = {
                name: compiledObject.vars[evParamIndex],
                modelTrieNode: paramResult.textResults[0].modelNode
            };

            // adding dependency
            if (compiledObject.vars[evParamIndex].name !== loopContent.elementName)
                loopTrieNode.addPriorNode(compiledObject.vars[evParamIndex].modelTrieNode);
        }

        loopContent.filter = compiledObject;
    }

    function compileLoopFilterVars(filterObject, scope)
    {
        // creating object
        if (!filterObject.compiledVars) filterObject.compiledVars = [{}];

        // looping over vars and creating relevant object
        var evParamIndex = filterObject.vars.length;
        while (evParamIndex--)
        {
            var paramRes = filterObject.vars[evParamIndex];
            filterObject.compiledVars[0][paramRes.name] = paramRes.modelTrieNode.modelValue;
        }
        filterObject.compiledVars[0]['scope'] = scope;
    }

    function getBindEventData(eventName, eventHandler, dataScope, functionScope, thisIndex)
    {
        // parsing request and vars
        var compiledObject = {};
        var str = ["0, (function(vars){return "];
        compiledObject.vars = $internals.Parsers.parseExpression(eventHandler, str); // getting arguments
        str.push(";})");
        compiledObject.func = $internals.Utils.eval(str.join(''));

        // first vars is ALWAYS function name.
        // Thus, verifying there's a method
        if (typeof(functionScope[compiledObject.vars[0]]) !== 'function')
        {
            console.log("Alloy.bind-event: missing method '" + compiledObject.vars[0] + "' as registered for " + eventName + " event");
            return null;
        }
        
        // getting parameters
        var evParamIndex = compiledObject.vars.length;
        while (evParamIndex--)
        {
            if (evParamIndex)
            {
                var paramResult = $internals.Parsers.getAlloyValue(compiledObject.vars[evParamIndex], 0, compiledObject.vars[evParamIndex].length, dataScope, thisIndex);
                compiledObject.vars[evParamIndex] = {
                    name: compiledObject.vars[evParamIndex],
                    modelTrieNode: paramResult.textResults[0].modelNode
                };
            }
            else
            {
                compiledObject.vars[evParamIndex] = {
                    name: compiledObject.vars[evParamIndex]
                };
            }
        }

        return compiledObject;
    }

    function updateModelValue(scope, modelTrieNode, value)
    {
        // updating model value (from parent)
        var parentNode = modelTrieNode.parent;
        parentNode.modelValue[modelTrieNode.word] = value;

        // updating
        scope.update();
    }

    function bindText(element, attrib, value, scope, selfIndex)
    {
        if (!value) return null;

        // parsing text
        var parseResult = $internals.Parsers.parseText(value, scope, selfIndex);
        if (parseResult.html === value) return null; // nothing has changed

        // creating dom pointer
        var domPointer = new DomPointer(element, attrib, value);

        // adding to modelTrieNode
        var l = parseResult.resultsLength;
        var parsedItem, alloyValueObject;
        while (l--)
        {
            parsedItem = parseResult.results[l]; // this.__getAlloyCompiledObject
            var ll = parsedItem.textResultsCount; 
            while (ll--)
            {
                alloyValueObject = parsedItem.textResults[ll];

                // creating expression
                var exp = new Expression();
                exp.type = 'text';
                exp.index = l;
                if (parsedItem.compiled)
                {
                    exp.compiled = parsedItem.compiled;
                    exp.varName = alloyValueObject.varName;
                }

                // adding dependency
                domPointer.addDependent(alloyValueObject.modelNode, exp);
                alloyValueObject.modelNode.addDependency(domPointer, exp);
            }
        }

        return parseResult.html;
    }

    function main(domElement, scope, thisIndex)
    {
        var mainStack = new Array(20);
        var stackLastIndex = 0;
        var stackItem;

        // stack variables
        var newScope, $This, template, childIndex, templateSrc;
        var pendingLoad = null;

        // inserting first item
        mainStack[0] = new Array(4); // #0 - domElement, #1 - thisIndex, #2 - handled, #3 - childIndex
        mainStack[0][0] = domElement;
        mainStack[0][1] = thisIndex;
        mainStack[0][2] = false;
        mainStack[0][3] = 0;

        do
        {
            // taking item
            stackItem = mainStack[stackLastIndex];
            
            // copying variables
            domElement = stackItem[0];
            thisIndex = stackItem[1];
            childIndex = stackItem[3];

            // setting variables
            template = null;
            templateSrc = null;
            newScope = null;

            ///////////////////////////////////////////////////////////////////////////
            // handling dom element
            if (!stackItem[2])
            {
                stackItem[2] = true; // marking as handled

                while (true) // to allow breaking
                {
                    // skipping comments
                    if (domElement.nodeName === '#comment') break;

                    // parsing #text nodes
                    if (domElement.nodeName === "#text")
                    {
                        var bindResult = bindText(domElement, null, domElement.nodeValue, scope, thisIndex)
                        if (bindResult !== null) domElement.nodeValue = bindResult;
                        break;
                    }

                    // processing attributes with special behaviour
                    if (domElement.attributes.length)
                    {
                        // loop statement
                        var loopStatement = domElement.getAttribute("alloy-loop");
                        if (loopStatement)
                        {
                            // removing attribute
                            domElement.removeAttribute("alloy-loop");

                            // we need to update parent's childIndex as children may be added in the loop
                            var childNodesToProcess;
                            var previousStackItem = mainStack[stackLastIndex - 1];
                            if (stackLastIndex !== 0)
                                // children left to process = totalChildren - processedChildren
                                childNodesToProcess = previousStackItem[0].childNodes.length - previousStackItem[3];

                            // loop
                            bindLoop(loopStatement, domElement, scope, thisIndex);

                            // to avoid handling child nodes
                            stackItem[3] = childIndex = domElement.childNodes.length; 

                            // updating parent's childIndex
                            if (stackLastIndex !== 0)
                                previousStackItem[3] = previousStackItem[0].childNodes.length - childNodesToProcess;
                                
                            break;
                        }

                        // getting 'this'
                        var newThis = domElement.getAttribute("alloy-this");
                        if (newThis)
                        {
                            var getValueResult = $internals.Parsers.getAlloyValue(newThis, 0, newThis.length, scope, thisIndex);
                            if (getValueResult.compiled) throw ("Invalid alloy-this: " + newThis + ". It must be a simple value");
                            if (getValueResult.value !== undefined)
                            {
                                // adding new This
                                var $this = scope.$stack.$this;
                                $this.push(new This(getValueResult.textResults[0].modelNode, thisIndex));
                                stackItem[1] = thisIndex = $this.length - 1;
                            }
                        }

                        // alloy-src (downloading source)
                        if (domElement.nodeName !== "IMG") templateSrc = domElement.getAttribute("alloy-src");

                        // alloy-scope
                        newScope = domElement.getAttribute("alloy-scope");
                        if (newScope && newScope !== "binded")
                        {
                            newScope = $internals.Utils.eval("(" + newScope + ")");
                            if (newScope) newScope = new newScope(scope.$stack.$this[thisIndex].trieNode.modelValue);
                        }
                    }

                    // handling template
                    if (domElement.tagName) template = $internals.Templates.get(domElement);
                    if (template)
                    {
                        // static scope?
                        if (!newScope)
                        {
                            newScope = getScopeClass(domElement.tagName, scope, thisIndex);

                            // static binding to element ID
                            if (!newScope && domElement.id) newScope = getScopeClass('#' + domElement.id, scope, thisIndex);
                        }

                        // not a new scope, template is handled here
                        if (!newScope || newScope === "binded")
                        {
                            newScope = false; // setting correct state

                            //////////////////////////////////////////////////////////////////////////
                            // creating final dom (also called template dom as we use the template as our dom)
                            
                            // duplicating template
                            var templateDom = template.cloneNode(true);

                            // building this template instance (merging overrides)
                            // comparing domElement's childNodes with template's
                            templateRefactoring(templateDom, domElement.childNodes, 0);

                            // finding first child to process (skipping
                            var firstChild = templateDom.firstChild;
                            while (firstChild.nodeName == '#comment')
                                firstChild = firstChild.nextSibling;
                            while (true)
                            {
                                // <element>
                                if (firstChild.nodeName.charAt(0) !== '#') break;

                                // trimming to make sure child is text and not just whitespaces
                                var tmpNodeValue = firstChild.nodeValue;
                                var tmpPos =0;
                                for(;tmpPos<tmpNodeValue.length;++tmpPos)
                                {
                                    var c = tmpNodeValue.charCodeAt(tmpPos);
                                    if (c == 9 || c == 32 || c == 10 || c == 13) continue;
                                    break;
                                }
                                // if all is whitespace
                                if (tmpPos == tmpNodeValue.length) firstChild = firstChild.nextSibling;
                                else break;
                            }

                            // copying attributes
                            if (firstChild.nodeName.charAt(0) !== '#')
                                $internals.Utils.copyAttributes(domElement, firstChild, true);

                            // replacing element @ parent
                            $internals.Utils.replaceDomElement(templateDom, domElement);
                            stackItem[0] = domElement = firstChild;

                            // template is a textnode, reprocessing
                            if (firstChild.nodeName === "#text") continue;
                        }
                    }
                    // we need to download source
                    else if (templateSrc)
                    {
                        domElement.removeAttribute("alloy-src");

                        if (!pendingLoad) pendingLoad = [];
                        pendingLoad.push(stackItem, templateSrc); // inserting stackItem and template source

                        // downloading file
                        //console.log("downloading: " + templateSrc);
                        /*
                        Alloy.$di([{ type: "meta", path: templateSrc }], function ()
                        {
                            laterProcess
                        });
                        */
                    }

                    //////////////////////////////////////////////////////////////////
                    // new scope
                    if (newScope)
                    {
                        // setting false to dynamic scope
                        domElement.setAttribute("alloy-scope", "binded");

                        // binding model
                        $This = scope.$stack.$this[thisIndex];

                        // adding dependency
                        $This.trieNode.addDependentScope(newScope);

                        // we need to update parent's childIndex as children may be added in the loop
                        var childNodesToProcess;
                        var previousStackItem = mainStack[stackLastIndex - 1];
                        if (stackLastIndex !== 0)
                            // children left to process = totalChildren - processedChildren
                            childNodesToProcess = previousStackItem[0].childNodes.length - previousStackItem[3];

                        // adding to collection, ...
                        newScope.$parent = scope;
                        newScope.$name = domElement.tagName;
                        scope.$childScopes.push(newScope);

                        // getting scope name
                        var scopeName = domElement.getAttribute("alloy-scope-name");
                        if (scopeName)
                        {
                            if (!scope.$childScopesByName) scope.$childScopesByName = [];
                            scope.$childScopesByName[scopeName] = newScope;
                        }

                        // binding
                        scope.childScopeCreated(newScope, domElement);
                        stackItem[0] = domElement = newScope.bind(domElement);

                        // to avoid handling child nodes
                        stackItem[3] = childIndex = domElement.childNodes.length;

                        // updating parent's childIndex
                        if (stackLastIndex !== 0)
                            previousStackItem[3] = previousStackItem[0].childNodes.length - childNodesToProcess;
                        
                        break;
                    }

                    //////////////////////////////////////////////////////////////////
                    // attributes
                    attributes(domElement, scope, thisIndex);

                    break;

                } // closing while(true)
            } // closing dom handling

            ///////////////////////////////////////////////////////////////////////////
            // CHILDREN 

            // no more children
            if (childIndex === domElement.childNodes.length)
            {
                stackLastIndex--;

                //mainStack[stackLastIndex--] = null;
            }
            else // adding next child
            {
                var childNode = domElement.childNodes[childIndex];
                stackItem[3]++;

                // getting child stack item
                var childStackItem;
                if (++stackLastIndex > mainStack.length)
                {
                    childStackItem = new Array(4);
                    mainStack.push(childStackItem);
                }
                else
                {
                    childStackItem = mainStack[stackLastIndex];
                    if (!childStackItem) childStackItem = mainStack[stackLastIndex] = new Array(4);
                }

                // updating it
                childStackItem[0] = childNode;
                childStackItem[1] = thisIndex;
                childStackItem[2] = false;
                childStackItem[3] = 0;
            }

        } while (stackLastIndex !== -1);

        return mainStack[0][0]; // returning element
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Helpers
    function templateRefactoring(templateNode, instanceChildNodes, instanceChildIndex)
    {
        var templateChildNodes = templateNode.childNodes
            , templateLength = templateChildNodes.length
            , tempChildNode
            , instanceLength = instanceChildNodes.length
            , childNode
            , cIndex
            , placeholder;

        while (templateLength--)
        {
            tempChildNode = templateChildNodes[templateLength];
            if (!tempChildNode.tagName) continue; // skipping textnodes, comments, etc

            // taking placeholder
            placeholder = tempChildNode.getAttribute("alloy-placeholder-id");
            if (placeholder)
            {
                // searching for relevant placeholder
                for (cIndex = instanceChildIndex; cIndex < instanceLength; ++cIndex)
                {
                    childNode = instanceChildNodes[cIndex];
                    if (!childNode.tagName) continue; // skipping textnodes, comments, etc

                    // if found a match
                    if (childNode.getAttribute("alloy-placeholder-id") === placeholder)
                    {
                        childNode.removeAttribute("alloy-placeholder-id"); // removing attribute

                        // copying attributes from currentElement to domElement
                        //$internals.Utils.copyAttributes(templateChildNode, domChildNode);

                        // replacing DOM elements
                        $internals.Utils.replaceDomElement(childNode, tempChildNode);

                        // updating index
                        instanceChildIndex = cIndex;
                        break;
                    }
                }
            }
            else // going to its children
            {
                templateRefactoring(tempChildNode, instanceChildNodes, instanceChildIndex);
            }
        }
    }
    function getScopeClass(tagName, scope, thisIndex)
    {
        if (scope.$tagToScopeClass)
        {
            var model = scope.$stack.$this[thisIndex].trieNode.modelValue;

            // checking in scope
            var tmpScope = scope.$tagToScopeClass[tagName];
            if (tmpScope) return new tmpScope(model);
        }


        // checking in global binding
        tmpScope = Alloy.Scope.$staticBinding[tagName];
        if (tmpScope) return new tmpScope(model);

    };
    function evalEmbeddedData(domElement, scope)
    {
        var embeddedDataName;
        try
        {
            // getting name to 
            embeddedDataName = domElement.getAttribute("alloy-data-target") || null;
            // evaluating
            var evalued = eval("(" + domElement.innerHTML + ")");

            // adding to embedded data
            if (!embeddedDataName) scope.$embedded = evalued;
            else scope.$embedded[embeddedDataName] = evalued;
        }
        catch (e)
        {
            throw ("Alloy.bind() - error evaluating embedded-data: " + domElement.innerHTML);
        }

        // replacing with comment
        var comment = document.createComment(domElement.innerHTML);
        $internals.Utils.replaceDomElement(comment, domElement);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Builder static
    function clearMemory(scope)
    {
        scope.$stack.$activeLoops = null;
        scope.$compiledEval = null;
        $internals.Parsers.clearMemoryObjects();
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // INTERFACE
    return {
        bind: function bind(domElement, scope)
        {
            ////////////////////////////////////////////////////////////////////
            // searching for alloy-embedded-data (needed for 'beforeBind' event)
            var l = domElement.childNodes.length;
            for (var i = 0; i < l; ++i)
            {
                var d = domElement.childNodes[i];
                if (d.nodeName.charAt(0) == '#') continue;
                if (d.nodeName === "ALLOY-EMBEDDED-DATA" || d.nodeName === "alloy-embedded-data")
                    evalEmbeddedData(d, scope);
                break;
            }

            // before bind event
            scope.beforeBind();

            // creating objects
            scope.$dependencies = new ModelTrieNode();
            scope.$compiledEval = {};
            scope.$registeredDomEvents = [];
            scope.$updateCycle = 0;

            // creating stack object
            scope.$childScopes = [];
            var modelDepNode = scope.$dependencies.tryCreateNode("$model");
            modelDepNode.modelValue = scope.$model;
            scope.$stack = {
                // array of models
                $this: [new This(modelDepNode, -1)]
                // holding active loop item
                , $activeLoops: {array: [null], count: 0}
            };
            $internals.Parsers.initMemoryObjects();

            // bind
            var p = domElement.parentNode;
            var nextSibling = domElement.nextSibling;
            $internals.Utils.removeElement(domElement);
            scope.$domElement = main(domElement, scope, 0);
            if (nextSibling)
                p.insertBefore(scope.$domElement, nextSibling);
            else
                p.appendChild(scope.$domElement);

            // clearing memory
            clearMemory(scope);

            // after bind event (set timeout so that DOM finish processing)
            setTimeout(function () { scope.afterBind(scope.$domElement); }, 0);

            return scope.$domElement;
        }
        , update: function update(scope)
        {
            if (!scope.$domElement) return;
            if (scope.$updating) return;

            // before update handler
            scope.beforeUpdate();

            scope.$updating = true;
            scope.window = window;
            scope.$stack.$activeLoops = { array: [null], count: 0 };
            scope.$compiledEval = {};
            $internals.Parsers.initMemoryObjects();

            // updating 'scope.$model' self
            var stack = new Array(20); // estimating value
            stack[0] = new Array(5); // #0 - modelNode, #1 - model, #2 - childIndex, #3 - pendingNodes index, #4 - priorNodes index
            stack[0][0] = scope.$dependencies;
            stack[0][1] = scope;
            stack[0][2] = 0;
            stack[0][3] = 0;
            stack[0][4] = -1;

            var stackLastIndex = 0;
            var updateCycle = ++scope.$updateCycle;
            var postLoopUpdate = []; // all keys to update
            var postLoopUpdateIndices = {}; // hashtable to take keys faster
            var l, arrayItem, domPointer, arr;
            
            do
            {
                var item = stack[stackLastIndex];
                var modelTrieNode = item[0];
                var model = item[1];
                
                // if node has prior nodes
                if (item[4] !== -1)
                {
                    arr = modelTrieNode.priorUpdateNodes;
                    l = item[4];
                    do
                    {
                        arrayItem = arr[l];
                        if (arrayItem.generation === updateCycle) continue;

                        // adding node to prior Node array
                        if (!arrayItem.pendingUpdateNodes) arrayItem.pendingUpdateNodes = [];
                        arrayItem.pendingUpdateNodes.push({ node: modelTrieNode, model: model });

                        break; // breaking loop

                    } while (--l !== -1);

                    item[4] = l; // updating prior index
                }

                // if model wasn't processed in this cycle
                if (item[4] === -1 && modelTrieNode.generation !== updateCycle)
                {
                    // fixed value
                    if (modelTrieNode.type === 1) model = modelTrieNode.modelValue;

                    // if it has dependent
                    if (modelTrieNode.dependentScopes || modelTrieNode.dependents)
                    {
                        var valueChanged;
                        if (modelTrieNode.type === 1)
                            valueChanged = true;
                        else if (model instanceof Array)
                            valueChanged = !$internals.Utils.compareArrays(model, modelTrieNode.modelValue); // shallow copy diff
                        else
                            valueChanged = model !== modelTrieNode.modelValue;
                         
                        var expression, postUpdateObj, evalObj;
                        arr = modelTrieNode.dependentScopes;

                        // updating scope models
                        if (valueChanged && arr)
                        {
                            l = arr.length;
                            while (l--) arr[l].setModel(model);
                        }

                        // updating dom objects
                        arr = modelTrieNode.dependents;
                        if (arr)
                        {
                            l = arr.length;
                            while (l--)
                            {
                                arrayItem = arr[l];
                                domPointer = arrayItem.domPointer;
                                expression = arrayItem.expression;

                                switch(expression.type)
                                {
                                    case "if":
                                    case "text":
                                        // if value wasn't changed AND domPointer doesn't need to change
                                        if (!valueChanged && domPointer.updateCycle != updateCycle) break;

                                        postUpdateObj = postLoopUpdateIndices[domPointer.id];
                                        if (!postUpdateObj) // creating object
                                        {
                                            // adding to hash
                                            postUpdateObj = postLoopUpdateIndices[domPointer.id] = { domPointer: domPointer, values: [] };
                                            // adding to array
                                            postLoopUpdate.push(postUpdateObj);
                                            // updating update cycle
                                            domPointer.updateCycle = updateCycle;
                                            
                                            // going over other expressions 
                                            if (domPointer.dependents)
                                            {
                                                var dpd = domPointer.dependents;
                                                var dpdl = domPointer.dependents.length;
                                                var dpdi;

                                                while (dpdl--)
                                                {
                                                    dpdi = dpd[dpdl];
                                                    if (dpdi.modelNode === modelTrieNode) continue;
                                                    
                                                    // node was NOT processed in this update cycle yet
                                                    if (dpdi.modelNode.generation !== updateCycle) continue;

                                                    // eval
                                                    if (dpdi.expression.compiled)
                                                    {
                                                        evalObj = postUpdateObj.values[dpdi.expression.index];
                                                        if (!evalObj) evalObj = postUpdateObj.values[dpdi.expression.index] = { compiled: dpdi.expression.compiled, vars: {} };
                                                        evalObj.vars[dpdi.expression.varName] = dpdi.modelNode.modelValue;
                                                    }
                                                    // model
                                                    else
                                                        postUpdateObj.values[dpdi.expression.index] = dpdi.modelNode.modelValue;
                                                }
                                            }
                                        }

                                        // eval
                                        if (expression.compiled)
                                        {
                                            evalObj = postUpdateObj.values[expression.index];
                                            if (!evalObj) evalObj = postUpdateObj.values[expression.index] = {compiled: expression.compiled, vars: {}};
                                            evalObj.vars[expression.varName] = model;
                                        }
                                        // model
                                        else
                                            postUpdateObj.values[expression.index] = model;
                                        break;
                                    case "loop-limit":
                                        if (!valueChanged) break;
                                        domPointer.contentInfo.limit = model; // updating loops limit
                                        break;
                                    case "loop":
                                        var processedItems = 0;
                                        var loopContent = domPointer.contentInfo;
                                        var ll, collectionItem;

                                        // if there's a collection
                                        if (model)
                                        {
                                            // sorting (and updating model)
                                            item[1] = model = $internals.Utils.clone(model);

                                            // taking care of parent loop
                                            if (loopContent.parentLoop)
                                            {
                                                var d = scope.$stack.$activeLoops.count = loopContent.parentLoop.depth + 1;
                                                var activeLoop = loopContent.parentLoop;
                                                while (--d)
                                                {
                                                    if (scope.$stack.$activeLoops.array.length === d)
                                                        scope.$stack.$activeLoops.array.push(activeLoop);
                                                    else
                                                        scope.$stack.$activeLoops.array[d] = activeLoop;

                                                    activeLoop = activeLoop.parent;
                                                }
                                            }
                                            else
                                                scope.$stack.$activeLoops.count = 1;

                                            // iterating collection
                                            ll = model.length;
                                            var skippedElements = 0;
                                            var elementName = loopContent.elementName;
                                            if (loopContent.filter) compileLoopFilterVars(loopContent.filter, scope);

                                            // preparing array
                                            var processedItems = prepareLoopArray(model, loopContent, modelTrieNode);

                                            // building UI
                                            for (var i = 0; i < processedItems; ++i)
                                                {
                                                // adding necessary item (by checking if trie has childnode with that index)
                                                if (!modelTrieNode.nodesHash || modelTrieNode.nodesHash[i] === undefined)
                                                {
                                                    loopItem(scope, loopContent, modelTrieNode, model[i], i);
                                                    valueChanged = true;
                                                }
                                            }
                                        }

                                        ///////////////////////////////////////////
                                        // removing UI items

                                        var tmpIndex, toRemoveArr, nodeToRemove;

                                        // TODO - unregister events

                                        if (modelTrieNode.nodes)
                                        {
                                            var tmpIndex = 0,
                                                newNodes = undefined,
                                                newHash = undefined;

                                            // checking if we need to remove items
                                            var lll = modelTrieNode.nodes.length;
                                            while (lll--)
                                            {
                                                nodeToRemove = modelTrieNode.nodes[lll];
                                                if (typeof (nodeToRemove.word) === 'number' && nodeToRemove.word >= processedItems) break;
                                            }
                                            if (lll !== -1)
                                            {
                                                valueChanged = true; // marking object as changed

                                                newNodes = new Array(modelTrieNode.nodes.length);
                                                newHash = {};

                                                for (lll = 0; lll < modelTrieNode.nodes.length; ++lll)
                                                {
                                                    nodeToRemove = modelTrieNode.nodes[lll];
                                                    // node is legit
                                                    if (typeof (nodeToRemove.word) !== 'number' || nodeToRemove.word < processedItems)
                                                    {
                                                        newNodes[tmpIndex] = nodeToRemove;
                                                        newHash[nodeToRemove.word] = tmpIndex++;
                                                    }
                                                    // node is to be removed
                                                    else
                                                    {
                                                        // disposing scopes
                                                        toRemoveArr = nodeToRemove.dependentScopes;
                                                        if (toRemoveArr)
                                                        {
                                                            ll = toRemoveArr.length;
                                                            while (ll--) toRemoveArr[ll].dispose(); // disposing scopes
                                                        }

                                                        // disposing ui
                                                        toRemoveArr = nodeToRemove.dependents;
                                                        if (toRemoveArr)
                                                        {
                                                            ll = toRemoveArr.length;
                                                            while (ll--)
                                                            {
                                                                // only removing 'ui-item' elements
                                                                if (toRemoveArr[ll].expression.type !== 'ui-item') continue;
                                                                $internals.Utils.removeElement(toRemoveArr[ll].domPointer.element);
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            // setting newNodes
                                            if (lll !== -1 && modelTrieNode.nodes && tmpIndex !== modelTrieNode.nodes.length)
                                            {
                                                valueChanged = true; // marking object as changed
                                                modelTrieNode.nodesHash = newHash;
                                                modelTrieNode.nodes = newNodes;
                                                modelTrieNode.nodes.splice(tmpIndex, modelTrieNode.nodes.length - tmpIndex);
                                            }
                                        }
                                        break;
                                    case "options-selected":
                                        if (!valueChanged) break;
                                        domPointer.contentInfo.value = model; // updating selected value
                                        break;
                                    case "options":
                                        // if there's a collection
                                        if (model)
                                        {
                                            // iterating collection
                                            ll = model.length;
                                            for (var i = 0; i < ll; ++i)
                                            {
                                                var pos = modelTrieNode.nodesHash ? modelTrieNode.nodesHash[i] : undefined;

                                                // adding necessary item (by checking if trie has childnode with that index)
                                                if (pos === undefined)
                                                    optionItem(domPointer.element, modelTrieNode, i, model[i], expression.value);
                                                else if (expression.value == model[i] || expression.value == model[i].value) // setting selected
                                                    modelTrieNode.nodes[pos].dependents[0].domPointer.element.selected = true;
                                            }
                                        }
                                        
                                        // removing from UI and TRIE
                                        if ((!model && modelTrieNode.modelValue) // if now there's no collection, but there was previously
                                            || (modelTrieNode.modelValue && modelTrieNode.nodes && model.length < modelTrieNode.nodes.length)) // there was an array and processed items is SMALLER than what was before
                                        {
                                            var tmpIndex = model.length;
                                            var depIndex = modelTrieNode.nodesHash[tmpIndex];
                                            while (!isNaN(depIndex))
                                            {
                                                delete modelTrieNode.nodesHash[tmpIndex]; // removing from hash
                                                var nodeToRemove = modelTrieNode.nodes[depIndex];
                                                var toRemoveArr = nodeToRemove.dependentScopes;

                                                // disposing scopes
                                                if (toRemoveArr)
                                                {
                                                    ll = toRemoveArr.length;
                                                    while (ll--) toRemoveArr[ll].dispose(); // disposing scopes
                                                }
                                                // disposing ui
                                                //TODO - unbind events. to do so, will need to redesign the way we save events
                                                toRemoveArr = nodeToRemove.dependents;
                                                if (toRemoveArr)
                                                {
                                                    ll = toRemoveArr.length;
                                                    while (ll--)
                                                    {
                                                        // only removing 'ui-item' elements
                                                        if (toRemoveArr[ll].expression.type !== 'ui-item') continue;
                                                        $internals.Utils.removeElement(toRemoveArr[ll].domPointer.element);
                                                    }
                                                }
                                                depIndex = modelTrieNode.nodesHash[++tmpIndex];
                                            }

                                            // removing all childnodes from trie
                                            if (tmpIndex) modelTrieNode.nodes.splice(processedItems, tmpIndex);
                                        }

                                        break;
                                    case "checkbox":
                                        if (!valueChanged) break;
                                        domPointer.element.checked = domPointer.element.defaultChecked = model;
                                        break;
                                    case "phase":
                                        var phase = domPointer.attribute.value;
                                        if (scope.$phase !== null && scope.$phase !== phase)
                                            domPointer.element.style.display = 'none';
                                        else
                                        {
                                            if (domPointer.element.style.removeProperty)
                                                domPointer.element.style.removeProperty('display');
                                            else if (domPointer.element.style.removeAttribute)
                                                domPointer.element.style.removeAttribute('display');
                                            else
                                                domPointer.element.style.display = '';
                                        }
                                        break;
                                    default:
                                        
                                        break;
                                }
                            }
                        }

                        // saving new value
                        if (valueChanged) modelTrieNode.modelValue = model;
                    }
                    else // saving model value
                        modelTrieNode.modelValue = model;


                    // updating generation
                    modelTrieNode.generation = updateCycle;
                }

                ////////////////////////////////////////////////////////////////////////////////////////////////////////
                // deciding how to proceed in stack

                
                var nextNode = null, nextNodeValue;
                if (item[4] !== -1) // cannot process this node
                {
                    // moving backwards in stack
                    stackLastIndex--;
                }
                // if (not in root node) && there's no model value, but there are childnodes - removing them
                //else if (stackLastIndex && !modelTrieNode.modelValue && modelTrieNode.nodes && modelTrieNode.nodes.length)
                //{
                //    debugger;
                //}
                // no children to process, checking pending nodes
                else if (!modelTrieNode.nodes || item[2] == modelTrieNode.nodes.length)
                {
                    // no more pending nodes
                    if (!modelTrieNode.pendingUpdateNodes || item[3] === modelTrieNode.pendingUpdateNodes.length)
                    {
                        stackLastIndex--;
                        modelTrieNode.pendingUpdateNodes = null; // resetting pending update nodes
                    }
                    else // processing next pending update
                    {
                        nextNode = modelTrieNode.pendingUpdateNodes[item[3]].node;
                        nextNodeValue = modelTrieNode.pendingUpdateNodes[item[3]].model;
                        item[3]++;
                    }
                }
                // processing next child
                else
                {
                    nextNode = modelTrieNode.nodes[item[2]++];
                    if (nextNode.type === 2) { nextNodeValue = model; } // next node is a loop, keeping model
                    // other cases
                    else if (model) nextNodeValue = model[nextNode.word];
                }

                if (nextNode)
                {
                    var tmpArr;
                    if (stack.length === ++stackLastIndex)
                    {
                        tmpArr = new Array(5);
                        stack.push(tmpArr);
                    }
                    else
                    {
                        tmpArr = stack[stackLastIndex];
                        if (!tmpArr) tmpArr = stack[stackLastIndex] = new Array(4);
                    }

                    // setting values to child array
                    tmpArr[0] = nextNode;
                    tmpArr[1] = nextNodeValue;
                    tmpArr[2] = 0;
                    tmpArr[3] = 0;
                    tmpArr[4] = nextNode.priorUpdateNodes ? nextNode.priorUpdateNodes.length - 1 : -1;
                }

            } while (stackLastIndex !== -1);
            

            //////////////////////////////////////////////////////////////////
            // POST LOOP UPDATE
            var l = postLoopUpdate.length;
            var result, p;
            while (l--)
            {
                arrayItem = postLoopUpdate[l];
                domPointer = arrayItem.domPointer;

                // dom pointer may have been removed from DOM
                try
                {
                    p = domPointer.element.parentNode;
                    if (!p || !p.offsetParent)
                    {
                        while (p && p !== document.body) p = p.parentNode;
                        if (!p) continue; // element was removed from DOM
                    }
                }
                catch (e) // in case IE8 disposes the element
                {
                    continue;
                }
                

                // if
                if (domPointer.contentInfo === undefined)
                {
                    var firstValue = arrayItem.values[0];
                    if (firstValue.compiled) result = firstValue.compiled(firstValue.vars);
                    else result = firstValue;

                    if (!result)
                        domPointer.element.style.display = 'none';
                    else
                    {
                        if (domPointer.element.style.removeProperty)
                            domPointer.element.style.removeProperty('display');
                        else if (domPointer.element.style.removeAttribute)
                            domPointer.element.style.removeAttribute('display');
                        else
                            domPointer.element.style.display = '';
                    }
                }
                // text
                else if (typeof (domPointer.contentInfo) === 'string')
                {
                    //console.log(domPointer.id);
                    result = $internals.Parsers.parseText(domPointer.contentInfo, scope, 0, arrayItem.values);
                    if (domPointer.attribute) domPointer.attribute.value = result.html;
                    else domPointer.element.nodeValue = result.html;
                }
            }
            
            // clearing memory
            clearMemory(scope);
            

            /////////////////////////////////
            // updating children scopes:

            stack = scope.$childScopes;
            l = stack.length;
            var disposedChildren = 0;
            for(var i=0;i<l;++i)
            {
                if (stack[i].isDisposed()) ++disposedChildren;
                else $internals.Binder.update(stack[i]);
            }

            // if some were disposed, removing from list
            if (disposedChildren) 
            {
                ll = l-disposedChildren;
                stack = new Array(ll);

                for(var i=0;i<l;++i)
                {
                    if (stack[i].isDisposed()) continue;
                    stack[--ll] = stack[i];
                }
                scope.$childScopes = stack;
            }
            
            // after update handler
            scope.afterUpdate();

            scope.$updating = false;
        }
        , dispose: function dispose(scope)
        {
            // removing html
            scope.$domElement.innerHTML = "";

            // disconnecting from parent
            scope.$parent = null;

            // disposing child scopes
            for (var i = 1; i < scope.$childScopes.length; ++i)
                scope.$childScopes[i].dispose();

            // adding to event (to dispose later)
            var evnts = scope.$registeredDomEvents;
            var l = evnts.length;
            while (l--)
            {
                // registering to event
                if (window.removeEventListener)
                    evnts[l].element.removeEventListener(evnts[l].name, evnts[l].func);
                else
                    evnts[l].element.detachEvent("on" + evnts[l].name, evnts[l].func);
            }
        }
    };
})();
;
    //////////////////////////////////////////////////////////////////
// Scope object
exports['Alloy.Scope'] = Alloy.Scope = Alloy.Base.extend({ name: "Scope" });

// static
Alloy.Scope.$staticBinding = {};
Alloy.Scope.bindGlobalStaticScope = function (tagName, scope)
{
    Alloy.Scope.$staticBinding[tagName.toUpperCase()] = scope;
}

// ctor / dtor
Alloy.Scope.prototype.ctor = function (model)
{
    this.$embedded = {};
    this.$model = model || {};
    this.$events = {};
}
Alloy.Scope.prototype.dtor = function ()
{
    // disposing things related to Binder
    $internals.Binder.dispose(this);
}

// internal methods

// methods
Alloy.Scope.prototype.getChildScope = function(childName)
{
    if (!this.$childScopesByName) return;
    return this.$childScopesByName[childName];
}
Alloy.Scope.prototype.setScopeClass = function (tagName, scope)
{
    if (!this.$tagToScopeClass) this.$tagToScopeClass = {};
    this.$tagToScopeClass[tagName.toUpperCase()] = scope;
}
Alloy.Scope.prototype.setModel = function (obj)
{
    var prev = this.$model;
    this.$model = obj;
    this.onModelChanged(prev);
    this.update();
}
Alloy.Scope.prototype.setModelProperty = function (obj, model)
{
    model = model || this.$model;
    for (var i in obj)
        model[i] = obj[i];
    this.update();
}
Alloy.Scope.prototype.childScopeCreated = function (childScope, domElement) { }
Alloy.Scope.prototype.beforeBind = function () { }
Alloy.Scope.prototype.afterBind = function (domElement) { }
Alloy.Scope.prototype.beforeUpdate = function () { }
Alloy.Scope.prototype.afterUpdate = function () { }
Alloy.Scope.prototype.onModelChanged = function (previousModel) { }
Alloy.Scope.prototype.setPhase = function (phase)
{
    this.$phase = phase;
    this.update();
}
Alloy.Scope.prototype.bind = function Alloy_Scope_Bind(domElement, template)
{
    // !!!!! Assuming all static scopes were binded !!!!!!!
    
    // getting dom element
    if (typeof (domElement) == 'string')
    {
        if (domElement.startsWith('#'))
            domElement = document.getElementById(domElement.substring(1));
        else
            domElement = document.querySelector(domElement);
    }
    if (!domElement) throw (this.__className__ + ".bind() - invalid domElement");

    // setting custom template
    if (template) domElement.setAttribute("alloy-template", template);

    // binding
    return $internals.Binder.bind(domElement, this);
}
Alloy.Scope.prototype.update = function Alloy_Scope_Update()
{
    $internals.Binder.update(this);
}

//create event.
Alloy.Scope.prototype.createEvent = function (event_name)
{
    //check name is given.
    if (!event_name) throw 'Event name is not provided.';
    event_name = event_name.toLowerCase();

    //check that the event is not already exists
    if (this.$events[event_name] != null) throw event_name + ' Event is already exists.';

    //create the new event.
    this.$events[event_name] = new Alloy.Event();
}

//register new handler for event.
Alloy.Scope.prototype.regiesterHandler = function (event_name, callback, context)
{
    //check name is given.
    if (!event_name) throw 'Event name is not provided.';
    event_name = event_name.toLowerCase();

    //check that the event is not already exists
    if (this.$events[event_name] == null) throw event_name + " Event dosen't exists.";

    // context is null if context is not provided
    if (typeof context == 'undefined') context = null;

    //check if callback is given.
    if (!callback) throw "Callback is not provided.";

    //register new handler
    this.$events[event_name].addHandler(callback, context);
}

//remove event handler
Alloy.Scope.prototype.unregisterHandler = function (event_name, callback, context)
{
    //check name is given.
    if (!event_name) throw 'Event name is not provided';
    event_name = event_name.toLowerCase();

    //check that the event is not already exists
    if (this.$events[event_name] == null) throw event_name + " Event dosen't exists";

    //check if callback is given.
    if (!callback) throw "Callback is not provided.";

    //remove handler
    this.$events[event_name].removeHandler(callback);
}

// dispatch event
Alloy.Scope.prototype.dispatchEvent = function (event_name, params)
{
    //check name is given.
    if (!event_name) throw this.__className__ + '.dispatch(): Event name is not provided';
    event_name = event_name.toLowerCase();

    //check that the event is not already exists
    var event = this.$events[event_name];
    if (event == null) throw this.__className__ + '.dispatch(): ' + event_name + " Event dosen't exists";

    if (!(params instanceof Array)) params = [params];

    //remove handler
    event.dispatch.apply(event, params);
}

// members
Alloy.Scope.prototype.$model = null;
Alloy.Scope.prototype.$embedded = null;

// "internal" members
Alloy.Scope.prototype.$tagToScopeClass = null;
Alloy.Scope.prototype.$domElement = null;
Alloy.Scope.prototype.$stack = null;
Alloy.Scope.prototype.$childScopes = null;
Alloy.Scope.prototype.$childScopesByName = null;
Alloy.Scope.prototype.$name = null;
Alloy.Scope.prototype.$parent = null;
Alloy.Scope.prototype.$phase = null;
Alloy.Scope.prototype.$updating = false;
Alloy.Scope.prototype.$events = null;
Alloy.Scope.prototype.$dependencies = null;
Alloy.Scope.prototype.$compiledEval = null;
Alloy.Scope.prototype.$registeredDomEvents = null;
Alloy.Scope.prototype.$updateCycle = 0;
;
    Alloy.MergeSort = Alloy.Base.extend({ name: "MergeSort" });
Alloy.MergeSort.prototype.sort = function MergeSort_sort(array, desc)
{
    this.$sort(array, 0, array.length, desc);
}
Alloy.MergeSort.prototype.$sort = function MergeSort_$sort(array, begin, end, desc)
{
    var size = end - begin;
    if (size < 2) return;

    var begin_right = begin + Math.floor(size / 2);

    this.$sort(array, begin, begin_right, desc);
    this.$sort(array, begin_right, end, desc);
    if (desc)
        this.$merge_desc(array, begin, begin_right, end);
    else
        this.$merge_asc(array, begin, begin_right, end);
}
Alloy.MergeSort.prototype.$merge_asc = function(array, begin, begin_right, end)
{
    var lastIndex = end - 1;
    for (; begin < begin_right; ++begin)
    {
        // if right item is bigger than left (in comparison -1 means left > right)
        if (this.$comparer(array[begin], array[begin_right]) === -1)
        {
            var v = array[begin];
            array[begin] = array[begin_right];
            if (begin_right === lastIndex)
            {
                array[begin_right] = v;
            }
            else
            {
                // finding insert position
                var targetIndex = this.$binaryIndexOf_asc(array, v, begin_right, lastIndex);
                
                // bubbling all
                var startingIndex = begin_right;
                for (; startingIndex < targetIndex; ++startingIndex)
                    array[startingIndex] = array[startingIndex + 1];
                array[targetIndex] = v;
            }
        }
    }
}
Alloy.MergeSort.prototype.$merge_desc = function(array, begin, begin_right, end)
{
    var lastIndex = end - 1;
    for (; begin < begin_right; ++begin)
    {
        // if right item is bigger than left (in comparison +1 means left < right)
        if (this.$comparer(array[begin], array[begin_right]) === 1)
        {
            var v = array[begin];
            array[begin] = array[begin_right];
            if (begin_right === lastIndex)
            {
                array[begin_right] = v;
            }
            else
            {
                // finding insert position
                var targetIndex = this.$binaryIndexOf_desc(array, v, begin_right, lastIndex);

                // bubbling all
                var startingIndex = begin_right;
                for (; startingIndex < targetIndex; ++startingIndex)
                    array[startingIndex] = array[startingIndex + 1];
                array[targetIndex] = v;
            }
        }
    }
}
Alloy.MergeSort.prototype.$comparer = function MergeSort_$comparer(a, b)
{
    if (a > b) return -1;
    else if (a < b) return 1;
    return 0;
}
Alloy.MergeSort.prototype.$binaryIndexOf_asc = function MergeSort_$binaryIndexOf(array, element, minIndex, maxIndex)
{
    minIndex = minIndex || 0;
    maxIndex = maxIndex || array.length - 1;

    // normal loop
    if (maxIndex - minIndex < 10)
    {
        for(;minIndex<=maxIndex;++minIndex)
        {
            var cmp = this.$comparer(element, array[minIndex]);
            switch (cmp)
            {
                case 0:
                    return minIndex;
                case 1: // array[minIndex] > element
                    return minIndex - 1;
            }
        }
        return maxIndex;
    }

    var currentIndex;
    var currentElement;
    var resultIndex;

    while (minIndex <= maxIndex)
    {
        resultIndex = currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = array[currentIndex];
        var cmp = this.$comparer(element, currentElement);

        // if element > current Element
        if (cmp == -1)
            minIndex = currentIndex + 1;
        else if (cmp == 1)
            maxIndex = currentIndex - 1;
        else
            return currentIndex;
    }
    return maxIndex;
}
Alloy.MergeSort.prototype.$binaryIndexOf_desc = function MergeSort_$binaryIndexOf(array, element, minIndex, maxIndex)
{
    minIndex = minIndex || 0;
    maxIndex = maxIndex || array.length - 1;

    // normal loop
    if (maxIndex - minIndex < 10)
    {
        for (; minIndex <= maxIndex; ++minIndex)
        {
            var cmp = this.$comparer(element, array[minIndex]);
            switch (cmp)
            {
                case 0:
                    return minIndex;
                case -1: // array[minIndex] < element
                    return minIndex - 1;
            }
        }
        return maxIndex;
    }

    var currentIndex;
    var currentElement;
    var resultIndex;

    while (minIndex <= maxIndex)
    {
        resultIndex = currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = array[currentIndex];
        var cmp = this.$comparer(element, currentElement);

        // if element > current Element
        if (cmp == 1)
            minIndex = currentIndex + 1;
        else if (cmp == -1)
            maxIndex = currentIndex - 1;
        else
            return currentIndex;
    }
    return maxIndex;
}
/////////////////////////////////////////////////////////////////////////////
// string comparer
Alloy.MergeSort_String = Alloy.MergeSort.extend({ name: "MergeSort_String" });
Alloy.MergeSort_String.prototype.$comparer = function MergeSort_$comparer(a, b)
{
    return Alloy.MergeSort_String.strCmp(a, b);
}
Alloy.MergeSort_String.strCmp = function strCmp(a, b)
{
    var min = a.length < b.length ? a.length : b.length;
    for (var i = 0; i < min; ++i)
    {
        var c1 = a.charCodeAt(i);
        var c2 = b.charCodeAt(i);
        if (c1 == c2) continue;

        // lower case
        if (c1 > 90) c1 -= 32; // (90 is capital Z, 32 is the diff between upper and lower case)
        if (c2 > 90) c2 -= 32; // (90 is capital Z, 32 is the diff between upper and lower case)

        if (c1 > c2) return -1;  // a is bigger
        else if (c1 < c2) return 1; // b is bigger
    }

    if (a.length == b.length) return 0;
    else if (a.length > b.length) return -1; // a is bigger
    else return 1; // b is bigger
};
    $internals.Com = Alloy.Com = 
{
    SUCCESS: 200
    ,FAIL: 400
    ,TIMEOUT: 500
    ,enumMethod: { GET: 'GET', POST: 'POST' }
    , cbId: new Date().getTime() % 1000
};



Alloy.ajax = function(info)
{
    // info: {url, method, headers, timeout, data, handler}

    // creating object
    var xmlhttp = null;
    if (typeof (XMLHttpRequest) === 'function' || typeof (XMLHttpRequest) === 'object')
        xmlhttp = new XMLHttpRequest();
    else
        throw "Cannot create ajax object";

    // openning request
    if (info.method == $internals.Com.enumMethod.GET && info.data) info.url += "?" + info.data;
    xmlhttp.open(info.method, info.url, true);

    // headers
    if (info.headers) for (var n in info.headers) xmlhttp.setRequestHeader(n, info.headers[n]);

    // registering success
    xmlhttp.onreadystatechange = function ()
    {
        switch (this.readyState)
        {
            case 4:
                ready($internals.Com.SUCCESS);
                break;
        }
    };
    xmlhttp.onerror = function ()
    {
        ready($internals.Com.FAIL);
    }
    xmlhttp.onload = function ()
    {
        ready($internals.Com.SUCCESS);
    };

    //////////////////////////////////////////////////////////////////////////
    var ready = function (status)
    {
        if (!running) return;
        clearTimeout(timer);
        running = false;

        // status
        var tmpStatus = -1;
        try
        {
            var tmpStatus = xmlhttp.status;
            if (!tmpStatus) tmpStatus = 400;
        }
        catch (e)
        {
            if (timeout) tmpStatus = -1;
            else tmpStatus = 400;
        }

        var text = "";
        switch (tmpStatus)
        {
            case 200:
                status = $internals.Com.SUCCESS;
                text = xmlhttp.responseText || "";
                break;
            case 400:
            case 403:
            case 404:
                status = $internals.Com.FAIL;
                break;
            default:
                if (timeout) status = $internals.Com.TIMEOUT;
                else status = $internals.Com.FAIL;
                break;
        }

        // firing handler
        info.handler(status, text);
    };
    var timer = setTimeout(function ()
    {
        if (!running) return; // already handled
        timeout = true;
        xmlhttp.abort();

        /// when 'aborting' a request in OPERA browser,
        /// sometimes it closes the request with an empty 200 response && sometimes it doesn't close the request (didn't find the logical explanation).
        /// if the request was closed with an empty 200 (and the response was handled), not calling directly to 'handleResponse()'
        if (running) ready($internals.Com.TIMEOUT);

    }, (info.timeout || 10000));

    var running = true;
    var timeout = false;

    // sending the request
    if (info.method === $internals.Com.enumMethod.POST)
        xmlhttp.send(info.data);
    else
        xmlhttp.send(null); // firefox 3.0 requires 'null'
}

Alloy.jsonp = function(obj)
{
    var functionName = "_jspcb" + (Alloy.Com.cbId++);
    window[functionName] = function (jsonResponse)
    {
        // clearing timeout
        clearTimeout(timer);
        // firing handler
        if (Alloy.Base.isDerivedOf(obj.handler, Alloy.Handler))
            obj.handler.handle($internals.Com.SUCCESS, jsonResponse, obj);
        else
            obj.handler($internals.Com.SUCCESS, jsonResponse, obj);

        // deleting reference
        try
        {
            delete window[functionName];
        }
        catch (e)
        {
            window[functionName] = undefined;
        }
        // removing element from DOM
        var pn = elem.parentNode;
        if (pn) pn.removeChild(elem);

        // repeat?
        if (typeof(obj.repeat) === 'number' && obj.repeat)
            setTimeout(function () { obj.repeat = 0; Alloy.jsonp(obj); }, obj.repeat);
        else if (obj.handler.dispose)
            obj.handler.dispose();
    }

    // building params
    var sb = [];
    sb.push(obj.url);
    if (obj.url.contains("?")) sb.push("&");
    else sb.push("?");
    sb.push(obj.callback_arg || "cb");
    sb.push("=");
    sb.push(functionName);
    if (obj.params) for (var parm in obj.params)
        {
        if (obj.params[parm] == null) continue; // skipping null params
        sb.push('&');
        sb.push(parm);
        sb.push('=');
        sb.push(obj.params[parm]);
    }

    // sending request
    var elem = document.createElement("script");
    elem.type = 'text/javascript';
    elem.async = true;
    elem.defer = true;
    elem.src = sb.join('');
    document.getElementsByTagName("head")[0].appendChild(elem);

    // setting timeout
    var timeout = function ()
    {
        // removing elem from dom
        var pn = elem.parentNode;
        if (pn) pn.removeChild(elem);
        window[functionName] = function () { };
        // firing handler
        if (Alloy.Base.isDerivedOf(obj.handler, Alloy.Handler))
            obj.handler.handle($internals.Com.TIMEOUT, null, obj);
        else
            obj.handler($internals.Com.TIMEOUT, null, obj);

        // repeat?
        if (typeof (obj.repeat) === 'number' && obj.repeat)
            setTimeout(function () { obj.repeat = 0; Alloy.jsonp(obj); }, obj.repeat);
        else if (obj.handler.dispose)
            obj.handler.dispose();
    }
    var timer = setTimeout(timeout, obj.timeout || 10000);
};
    Alloy.Plugins = (function ()
{
    var knownPlugins = {};

    return {
        register: function(name, obj)
        {
            var plugin = knownPlugins[name];
            if (plugin) throw name + " plugin was created already";

            // adding to plugins
            knownPlugins[name] = obj;

            // creating the init function
            obj.init();
        }
        , get: function(name, argsString)
        {
            var plugin = knownPlugins[name];
            if (!plugin) return;

            // parsing arguments


            // calling method
            plugin.onCall();
        }
    }

})()
;


    // loading unittests
    if (Alloy.runningMode !== 0)
    {
        Alloy.$di(["/common/alloy/alloy.unitest.js"], function () { if (arguments[0][0].status) { Alloy.UnitTest.run(); } });
    }
    // loading profiler
    if (Alloy.runningMode === 3)
    {
        Alloy.$di(["/common/alloy/alloy.profiler.js"], function () { });
    }


    // exporting (for closure compiler)
    var objectPointers = [];
    for(var i in exports)
    {
        var splt = i.split('.');
        var ndx = 1;
        var obj = Alloy; // always starting with Alloy
        while (ndx !== splt.length)
        {
            var tmp = splt[ndx++];
            if (ndx === splt.length) // last point, taking pointer
            {
                obj[tmp] = exports[i];
                objectPointers[tmp] = exports[i];
            }
            else
            {
                obj = objectPointers[tmp];
            }
        }
    }


    return Alloy;
})();
window['Alloy'] = Alloy;


