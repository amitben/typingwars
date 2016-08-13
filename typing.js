function Typing(code, container, reportCallback) {
    this.container = container;
    this.reportCallback = reportCallback;
    this.running = false;
    this.duringError = false;
    this.errorPosition = -1;
    this.charIndex = 0;
    this.codeChars = [];
    this.codeElements = [];
    this.errorElements = [];
    this.container = container;
    this.timerElement = null;
    this.timerMin = null;
    this.timerSec = null;
    this.timerMil = null;
    // tracking
    this.start = 0;
    this.elapsed = 0;
    this.prevKeyTime = 0;

    this.keyCount = 0;
    this.errorCount = 0;
    this.dribbleCount = 0;
    this.backspaceCount = 0;

    this.map = {};

    // build UI
    this.buildClock(container);
    this.buildCodeUI(code, container);

    var self = this;
    window.addEventListener('keypress', function (event) {
        self.keypress(event);
    });

    // handling BACKSPACE
    window.addEventListener('keydown', function (event) {
        self.keydown(event);
    });

    setInterval(function () {
        if (self.running) {
            self.elapsed = new Date().getTime() - self.start
            self.updateClock(self.elapsed);
        }
    }, 100);
}

Typing.prototype.dispose = function () {
    window.removeEventListener('keypress', this.keypress);
    window.removeEventListener('keydown', this.keydown);
}

Typing.prototype.keypress = function(event)
{
    event.preventDefault();

    // start measuring time
    if (this.charIndex == 0) {
        this.start = new Date().getTime();
        this.running = true;
    }

    if (this.charIndex >= this.codeElements.length) return;
    this.keyCount++;
    var keyCode = event.keyCode;
    if (keyCode === 13) keyCode = 10; // normalizing keyCode
        
    var element = document.getElementById("type_" + this.charIndex);
    var charMismatch = this.codeChars[this.charIndex] !== keyCode;
    if (keyCode === 10 && !charMismatch) element.isNewLine = true;
    if (charMismatch || this.duringError) {
        if (!this.duringError) {
            this.duringError = true;
            this.errorPosition = this.charIndex;
        }

        this.errorElements.push(element);

        if (charMismatch) {
            var char = keyCode === 10 ? '↵' : getChar(event);
            element.errorLabel = appendElement(element, 'div', 'typingErrorLabel', 'typingError', char);
            element.mistype = true;
            this.errorCount++;
            var prevChar = this.charIndex > 0 ? this.codeChars[this.charIndex - 1] : null;
            this.trackChar(
                String.fromCharCode(this.codeChars[this.charIndex]),
                0,
                true,
                char,
                String.fromCharCode(prevChar)
                );
            element.className = 'typingError';
        }
        else {
            this.dribbleCount++;
            element.className = 'typingErrorDragged';
        }
    }
    else {
        element.className = element.isNewLine ? 'typingHidden' : 'typingOK';
    }

    ++this.charIndex;
    if (!this.duringError && this.charIndex == this.codeElements.length) {
        // COMPLETED - creating report
        this.running = false;
        this.elapsed = new Date().getTime() - this.start
        this.updateClock(this.elapsed);

        // process test completetion report
        this.buildReport(this.elapsed);
        for (var i = 0,len = this.errorElements.length; i < len; ++i)
        {
            element = this.errorElements[i];
            if (element.mistype)
                element.className = 'typingError';
            else
                element.className = 'typingErrorDragged';
        }
            
        return;
    }

    element = document.getElementById("type_" + this.charIndex);
    element.className = this.duringError ? 'typingActiveError' : 'typingActive';
}

Typing.prototype.keydown = function (event)
{
    if (event.keyCode === 8) {
        event.preventDefault();
        if (this.charIndex == 0) return; // handle begining of input
        if (!this.running) return; // handle end-of-input
        this.keyCount++;
        this.backspaceCount++;
        var element = document.getElementById("type_" + this.charIndex);
        element.className = element.isNewLine ? 'typingHidden' : 'typingIdle';
        --this.charIndex;
        // checking if backspacing to fix an error
        if (this.duringError) {
            if (this.charIndex == this.errorPosition) // if position where error started
            {
                this.duringError = false; // clear error state
            }
        }

        var element = document.getElementById("type_" + this.charIndex);
        if (element.errorLabel) {
            element.removeChild(element.errorLabel); // remove error label
            element.errorLabel = null;
        }
        element.className = this.duringError ? 'typingActiveError' : 'typingActive';
    }
}

Typing.prototype.buildCodeUI = function (code, container) {
    var len = code.length;

    //////////////////
    // Code elements
    var preElement = appendElement(container, 'pre', 'typingPre');
    var codeContainer = appendElement(preElement, 'code');

    var lineStart = true;
    var counter = 0;
    for (var i = 0; i < len; ++i) {
        var char = code[i];
        var charCode = char.charCodeAt(); // getting character code
        if (charCode == 13) continue; //skipping \r character

        // if whitespace at the begining of a line
        if (lineStart && (charCode == 32 || charCode == 9))
        {
            var element = appendElement(codeContainer, 'span', null, null, char);
            continue;
        }
        lineStart = false;

        // add to character code array
        this.codeChars.push(charCode); 

        // creating <span> element containing the current typable character
        var element = appendElement(codeContainer,
            'span', 
            charCode === 10 ? 'typingHidden' : 'typingIdle',
            "type_" + counter,
            charCode === 10 ? '↵\n' : char // new line character handled in next block
            );

        this.codeElements.push(element);

        ++counter;
        // if new-line character
        if (char == '\n') {
            // add a <br> element
            //var element = document.createElement('br');
            //codeContainer.appendChild(element);
            lineStart = true;
        }
        
    }
    // closing element for handling error while typing last character
    appendElement(codeContainer,
        'span',
        'typingHidden',
        "type_" + counter,
        ' '// new line character handled in next block
        );

    // resetting state for first element
    this.codeElements[0].className = 'typingActive';
}

Typing.prototype.buildClock = function(container)
{
    container.style.position = 'relative';

    // removing current timer
    //if (this.timerElement !== null) this.timerElement.parentElement.removeChild(this.timerElement);
    
    // Timer
    this.timerElement = appendElement(container, 'div', 'typingTimer');
    this.timerMin = appendElement(this.timerElement, 'span', null, 't_min', '00');
    appendElement(this.timerElement, 'span', null, null, ':');
    this.timerSec = appendElement(this.timerElement, 'span', null, 't_sec', '00');
    appendElement(this.timerElement, 'span', null, null, '.');
    this.timerMil = appendElement(this.timerElement, 'span', null, 't_mil', '0');
}
Typing.prototype.updateClock = function(elapsed)
{
    if (this.start === 0) {
        this.timerMin.innerText = '00';
        this.timerSec.innerText = '00';
        this.timerMil.innerText = '0';
    }
    else {
        
        var seconds = elapsed / 1000;
        setTwoDigit(seconds / 60, this.timerMin);
        setTwoDigit(seconds % 60, this.timerSec);
        this.timerMil.innerText = Math.floor(elapsed % 1000 / 100);
    }
}

Typing.prototype.buildReport = function(elapsed)
{
    var invalidStrokes = this.errorCount + this.dribbleCount + this.backspaceCount;
    var errorRate = invalidStrokes / this.keyCount;
    var finalTime = this.elapsed * (1 + errorRate);
    var keyArray = [];
    for (key in this.map)
    {
        var value = this.map[key];
        var keyObj = { key: key, value: value };
        keyArray.push(keyObj);
    }
    this.report = {
        strokes: this.keyCount,
        invalidStrokes: invalidStrokes,
        missedStrokes: this.errorCount,
        draggedStrokes: this.dribbleCount,
        backspaceStrokes: this.backspaceCount,
        errorRate: errorRate,
        penalty: decimals(errorRate * 100,1), // convert to percent
        finalTime: finalTime,
        finalTime_min: getTwoDigit(finalTime / 1000 / 60),
        finalTime_sec: getTwoDigit((finalTime / 1000) % 60),
        finalTime_mil: Math.floor(finalTime % 1000 / 100),
        secPerStroke: decimals(finalTime / (this.keyCount) / 1000,3),
        strokePerSec: decimals(1 / (finalTime / this.keyCount / 1000), 2),
        keyMap: keyArray
    }

    if (this.reportCallback) this.reportCallback(this.report);
}

Typing.prototype.trackChar = function(char, time, error, previousChar)
{
    // getting character info
    var charInfo = this.map[char];
    if (!charInfo) charInfo = this.map[char] =
        { totalTime: 0, totalCount: 0, errorCount: 0, map: {}, array: [] };

    // appending time
    charInfo.totalTime += time;
    charInfo.totalCount++;

    if (error) 
    {
        charInfo.errorCount++;
        
        if (previousChar)
        {
            var subChar = charInfo.map[previousChar];
            if (!subChar) {
                subChar = charInfo.map[previousChar] = { char: previousChar, count: 0 };
                charInfo.array.push(subChar);
            }
            subChar.count++;
        }
    }
}

