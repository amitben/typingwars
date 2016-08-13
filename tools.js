
var appendElement = function (parent, type, className, id, innerText) {
    var element = document.createElement(type);
    if (className) element.className = className;
    if (id) element.id = id;
    if (innerText) element.innerText = innerText;

    parent.appendChild(element);

    return element;
}

var updateElementText = function (id, text) {
    var element = document.getElementById(id);
    element.innerText = text;
}
// event.type must be keypress
function getChar(event) {
    if (event.which == null) {
        return String.fromCharCode(event.keyCode) // IE
    } else if (event.which != 0 && event.charCode != 0) {
        return String.fromCharCode(event.which)   // the rest
    } else {
        return null // special key
    }
};

var getTwoDigit = function (value) {
    value = Math.floor(value);
    if (value < 10)
        return '0' + value;
    else
        return value;
}

var setTwoDigit = function (value, element) {
    value = Math.floor(value);
    if (value < 10)
        element.innerText = '0' + value;
    else
        element.innerText = value;
}

var decimals = function(value, decimals)
{
    var multiplier = Math.pow(10,decimals);
    return Math.floor(multiplier * value) / multiplier;
}