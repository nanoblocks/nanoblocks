// ----------------------------------------------------------------------------------------------------------------- //
(function($, doc){

/* TODO
    []  hide, if no variants
    []  keyboard navigation in items
    []? item template in page: data-nb-item-template="<selector here>"
    []  make renderItem() method rewritable
    []  show found substring
    []? cache rendered suggest items
 */

/**
    Usage:
    <input type="text" class="search_field" data-nb="suggest" data-nb-source-url="/ajax/search" />

    Optional attributes:
    data-nb-delay - delay before making search for suggest.
    data-nb-min_length - a minimal length of the user input, before making a search for completion.
    data-nb-max_items - a maximum number of items to be returned.
    data-nb-scroll_after - TODO if there where more items returned - make suggest popup scrollable with a height of this
        number of items. TODO maybe, this must be a popup functionality.
    data-nb-ignore_case - whether to ignore case when searching, or not.
    data-nb-source-url - a source url fo of data to be rendered in suggest. It can be: array | function | url.
 */
var suggest = {};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.events = {
    'init': 'onInit',
    'keyup': 'onTextChange',
    'focusout': 'onClose'
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onInit = function() {
    // Get params from data().
    this.delay = this.data('delay') || 300;
    this.delay = +this.delay;

    this.min_length = +this.data('min_length') || 1;
    this.max_items = this.data('max_items') || -1; // -1 means no max.
    this.ignore_case = this.data('ignore_case') || false;
    this.label_key = this.data('label-key') || 'label';
    this.source_url = this.data('source-url');

    this._createPopup();
    this.$input = $(this.node);

    // Internal state.
    this._text = null;
    this._requests = {};
    this._cache = {};
    this._opened = false;

    this._requestDataTimeout = null;
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._createPopup = function() {
    var that = this;
    this.$popup = $('<div class="popup _hidden" data-nb="popup"/>')
        .appendTo(doc.body)
        .html('<ul></ul>');
    this.$suggest_container = this.$popup.find('ul');
    this.popup = nb.block(this.$popup[0]);
    this.popup.on('close', function() {
        that._opened = false;
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onTextChange = function(evt) {
    if (evt.keyCode == 27) {
        // Do not react on special keys.
        return;
    }

    var that = this;
    var text = this._text = this.$input.val().trim();

    if (this._requestDataTimeout) {
        // Do not request intermediate strings.
        clearTimeout(this._requestDataTimeout);
    }
    this._requestDataTimeout = setTimeout(function() { that._requestData(text); }, this.delay);
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onClose = function() {
    this.popup.trigger('close');
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._requestData = function(text) {
    if (text in this._cache) {
        this._showFor(text);
        return;
    }

    if (!(text in this._requests)) {
        this._createRequest(text);
    }
    this._requests[text].retry();
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Create a new request for user entered text.
 * @param {string} text User entered text to find suggestions for.
 */
suggest._createRequest = function(text) {
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
            'url': that.source_url,
            'type': 'GET',
            'data': data,
            'dataType': 'jsonp',
            'success': function(data) {
                that._cache[text] = that._parseData(data);
                that._showFor(text);
            },
            'error': function() { request.retry(); }
        });

        this.retries--;
    };

    this._requests[text] = request;
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._parseData = function(raw) {
    return raw;
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._showFor = function(text) {
    if (this.$input.val() !== text) { // Only show suggest, if text was not changed after request has been sent.
        return;
    }

    var that = this;
    var data = this._cache[text];

    var $container = this.$suggest_container;
    $container.children().remove(); // Clear old and then add new ones.

    data.forEach(function(item) {
        $container.append(that.renderItem(item));
    });

    if (!this._opened) {
        this.popup.trigger('open', {
            where: this.node,
            data: {
                dir: 'bottom'
            }
        });
        this._opened = true;
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.renderItem = function(item) {
    return $("<li></li>").html(item[this.label_key]);
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('suggest', suggest);

}(jQuery, document));