// ----------------------------------------------------------------------------------------------------------------- //
(function($, doc){

/**
    Usage:
    <input type="text" class="search_field" data-nb="suggest" data-nb-source="/ajax/search" />

    Optional attributes:
    data-nb-delay - delay before making search for suggest.
    data-nb-min_length - a minimal length of the user input, before making a search for completion.
    data-nb-max_items - a maximum number of items to be returned.
    data-nb-scroll_after - TODO if there where more items returned - make suggest popup scrollable with a height of this
        number of items. TODO maybe, this must be a popup functionality.
    data-nb-ignore_case - whether to ignore case when searching, or not.
    data-nb-source - a source of data to be rendered in suggest. It can be: array | function | url.
 */
var suggest = {};

// http://localhost:8125/?text=rus
// ----------------------------------------------------------------------------------------------------------------- //

suggest.events = {
    'init': 'onInit',
    'keyup': 'onTextChange',
    'focusout': 'onClose'
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onInit = function() {
    // Get params from data().
    this.delay = +this.data('delay') || 300;
    this.min_length = +this.data('min_length') || 1;
    this.max_items = this.data('max_items') || -1; // -1 means no max.
    this.ignore_case = this.data('ignore_case') || false;
    this.source = [] || function() {} || "some/url/that/returns/data";

    this._createPopup();

    // Internal state.
    this._text = null;
    this._requests = {};
    this._cache = {};
    this._opened = false;

    this._request_timeout = null;
    this._display_timeout = null;
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._createPopup = function() {
    var that = this;
    this.$popup = $('<div class="popup _hidden" data-nb="popup"/>')
        .appendTo(doc.body)
        .html('<div>test</div>');
    this.popup = nb.block(this.$popup[0]);
    this.popup.on('close', function() {
        that._opened = false;
        console.log("close");
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onTextChange = function() {
    if (!this._opened) {
        this.popup.trigger('open', {
            where: this.node,
            dir: 'bottom'
        });
        this._opened = true;
        console.log("open");
    }
    return;

    var text = this._text = this.val().trim();
    if (this._request_timeout) {
        clearTimeout(this._request_timeout);
    }
    this._request_timeout = setTimeout(this._createRequestData(text), this.delay);
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onClose = function() {
    this.popup.trigger('close');
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Create a new request for user entered text.
 * @param {string} text User entered text to find suggestions for.
 */
suggest._createRequestData = function(text) {
    var that = this;

    if (text in this._requests) {
        return;
    }

    var data = {
        'text': text,
        'min': this.min_length,
        'max': this.max_items
    };

    var request = {
        'xhr': null,
        'retries': 3, // TODO make a setting
        'retry': null
    };

    request.retry = function() {
        if (this.retries == 0) {
            // Clear old request. Maybe at some moment we can get needed data.
            delete that._requests[this.text];

            // Sorry, no more retries.
            // TODO error logging?
            return;
        }

        $.ajax({
            'url': this.url,
            'type': 'GET',
            'data': data,
            'dataType': 'json',
            'success': function(data) {
                that._cache[text] = that._parseData(data);
                that._showFor(text);
            },
            'error': function() { request.retry(); }
        });

        this.retries--;
    };

    this._requests[text] = request;

    request.retry();
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._parseData = function(raw) {
    return raw;
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._showFor = function(text) {
    if (this.val() !== text) { // Only show suggest, if text was not changed after request has been sent.
        return;
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('suggest', suggest);

}(jQuery, document));