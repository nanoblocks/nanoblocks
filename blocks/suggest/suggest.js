// ----------------------------------------------------------------------------------------------------------------- //
(function($, doc){

/* TODO
    []  scroll selected into view
    []  on re - we have 2 rows! how about this?
    []  popup long items fade
    []  up key - cursor is going to the left and then - to the right
    []  show current selection as highlighted?
    []  show found substring
    []? cache rendered suggest items
    [x] если есть данные для текущего введённого текста - показывать сразу
    [x] когда что-то выпало - повторный клик внутри поля ввода не должен закрывать саджест (это делает сам popup из-за кривой проверки contains())
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
    'keyup': 'onKeyUp',
    'focusout': 'onClose'
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onInit = function() {
    // Get params from data().
    this.delay = this.getDataNumber('delay', 300); // Delay before displaying suggest.
    this.min_length = this.getDataNumber('min_length', 1); // minimal length, before autocomplete starts.
    this.max_items = this.getDataNumber('max_items', -1); // -1 means no max.
    this.ignore_case = this.getDataBool('ignore_case');
    this.label_key = this.getDataString('label-key', 'label');
    this.source_url = this.getDataString('source-url');
    this.response_timeout = this.getDataNumber('timeout', 10000);
    this.scroll_min = this.getDataNumber('scroll-min', -1);
    this.expand_to_input = this.getDataBool('expand-popup-to-input');
    this.show_loader = this.getDataBool('show-loader');

    this.$input = $(this.node);

    // Internal state.
    this._text = null;
    this._suggest_text = null; // Showen suggest is for this text.
    this._requests = {};
    this._cache = {};
    this._selected = null;

    this._createPopup();
    this._popup_opened = false;

    this._requestDataTimeout = null;
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.getDataNumber = function(key, default_value) {
    return +this.data(key) || default_value;
};

suggest.getDataBool = function(key) {
    return (this.data(key) || '').toLowerCase() === 'true';
};

suggest.getDataString = function(key, default_value) {
    return this.data(key) || default_value;
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._createPopup = function() {
    var that = this;

    this.$popup = $(
        '<div class="popup popup_dropdown popup_theme_blocky popup_to_top _hidden" data-nb="popup">' +
            '<div class="popup__scrollbox">' +
                '<ul></ul>' +
            '</div>' +
        '</div>')
        .appendTo(doc.body);

    if (this.show_loader) {
        this.$loader = $('<div class="loader _hidden"></div>').insertAfter(this.$popup);
    }

    if (this.expand_to_input) {
        this.$popup.css('width', this.$input.outerWidth());
    }

    this.$popup_wrapper = this.$popup.find('.popup__scrollbox');
    this.$suggest_container = this.$popup.find('ul');

    this.popup = nb.block(this.$popup[0]);
    this.popup.on('close', function() {
        that._popup_opened = false;
    });

    // Init mouse events.
    this.$suggest_container
        .delegate('li', 'mouseenter', function(evt) {
            var $item = $(evt.target).closest('li');
            $item.toggleClass('current', true);
        })
        .delegate('li', 'mouseleave', function(evt) {
            var $item = $(evt.target).closest('li');
            $item.toggleClass('current', false);
        })
        .delegate('li', 'click', function(evt) {
            var $item = $(evt.target).closest('li');
            that.selectItem($item);
        });
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onKeyUp = function(evt) {
    if (evt.keyCode == 27) { // ESC
        // Do not react on special keys.
        return;
    }

    if (evt.keyCode == 38) { // UP
        evt.preventDefault();
        this.setCurrent(-1);
        return;
    }

    if (evt.keyCode == 40) { // DOWN
        evt.preventDefault();
        this.setCurrent(1);
        return;
    }

    if (evt.keyCode == 13) { // ENTER
        evt.preventDefault();
        this.selectItem();
        return;
    }

    var that = this;
    var text = this._text = this.$input.val().trim();

    if (text.length < this.min_length) {
        this.popup.trigger('close');
        return;
    }

    if (this._requestDataTimeout) {
        // Do not request intermediate strings.
        clearTimeout(this._requestDataTimeout);
    }

    if (text in this._cache) {
        // Immediate display suggest for present data.
        this._showFor(text);
    } else {
        // Go get data after delay.
        this._requestDataTimeout = setTimeout(function() { that._requestData(text); }, this.delay);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onClose = function() {
    this.popup.trigger('close');
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._requestData = function(text) {
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
        'max': this.max_items
    };

    var request = {
        'retries': 3, // TODO make a setting
        'retry': null
    };

    request.retry = function() {
        if (request.retries === 0) {
            that.hideLoader();

            // Clear old request. Maybe at some moment we can get needed data.
            delete that._requests[text];

            // Sorry, no more retries.
            // TODO error logging?
            return;
        }

        that.showLoader();

        $.ajax({
            'url': that.source_url,
            'type': 'GET',
            'data': data,
            'dataType': 'jsonp',
            'success': function(data) {
                that._cache[text] = that._parseData(data);
                that._showFor(text);
                that.hideLoader();
            },
            'error': function() {
                request.retry();
            },
            'timeout': that.response_timeout
        });

        request.retries--;
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

    var $container = this.$suggest_container;
    $container.children().remove(); // Clear old and then add new ones.

    var data = this._cache[text];

    if (data.length <= 0) {
        this.popup.trigger('close');
    } else {
        this.showSuggest();

        data.forEach(function(item) {
            var $item = that.renderItem(item);
            if (!$item.is('li')) { // renderItem() can be overriden. So, we wrap rendered item with <li/> if needed.
                $item.wrap('li');
            }
            $container.append($item);
        });
        this.$popup_wrapper.css({
            'max-height': '',
            'overflow': ''
        });

        if (this.scroll_min > 0 && data.length > this.scroll_min) {
            var height = 0;
            var $items = this.$suggest_container.find('li');
            for (var i = 0; i < this.scroll_min; i++) {
                height += $($items[i]).outerHeight();
            }
            this.$popup_wrapper.css({
                'max-height': height,
                'overflow-y': 'scroll'
            });
        }

        this._suggest_text = text;

    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * @returns {boolean} Whether popup was shown.
 */
suggest.showSuggest = function() {
    if (!this._popup_opened) {
        this.popup.trigger('open', {
            where: this.node,
            how: {
                where: 'left bottom',
                what: 'left top'
            }
        });
        this._popup_opened = true;

        return true;
    }

    return false;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * This method can be overriden.
 * We need this method to return <li/> item.
 * So we will check it later, when rendering all items.
 * @param {Object} item Data item to render.
 */
suggest.renderItem = function(item) {
    // <a href="#" class="popup__line link">Улучшенное меню</a>
    return $("<li></li>").html(item[this.label_key]);
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 *
 * @param {number} dir +1 - select next item, -1 - select previous item.
 */
suggest.setCurrent = function(dir) {
    var $suggest = this.$suggest_container;
    var $selected = $('li.current', $suggest);
    var $items = $suggest.find('li');

    // Clear previous selection.
    $selected.toggleClass('current', false);

    if (this.showSuggest()) { // Do nothing, if popup was hidden.
        return;
    }

    if (dir > 0) {
        if ($selected.length === 0) {
            $('li:first', $suggest).addClass('current');
            this.$input.val(this.getText(0));
        }
        else if ($selected.next('li').length === 0) {
            this.$input.val(this._suggest_text);
        }
        else {
            $selected.next('li').addClass('current');
            this.$input.val(this.getText($items.index($selected) + 1));
        }
    } else {
        if ($selected.length === 0) {
            var $item = $('li:last', $suggest).addClass('current');
            this.$input.val(this.getText($items.index($item)));
        }
        else if ($selected.prev('li').length === 0) {
            this.$input.val(this._suggest_text);
        }
        else {
            $selected.prev('li').addClass('current');
            this.$input.val(this.getText($items.index($selected) - 1));
        }
    }

    // Scroll current into view.

};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Returns text by data item index.
 * @param {number} index Item index.
 */
suggest.getText = function(index) {
    var data_item = this._cache[this._suggest_text];
    return !!data_item ? data_item[index][this.label_key] : '';
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.selectItem = function($item) {
    var $suggest = this.$suggest_container;
    $item = $item || $suggest.find('li.current');

    if ($item.length === 0) {
        this._selected = { label: this.$input.val() };
    } else {
        var index = $suggest.find('li').index($item);
        this._selected = this._cache[this._suggest_text][index];
        this.$input.val(this.getText(index));
    }

    this.popup.trigger('close');
    this.trigger('selected', this._selected);
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.showLoader = function() {
    if (this.$loader) {
        this.$loader.toggleClass('_hidden', false);
    }
};

suggest.hideLoader = function() {
    if (this.$loader) {
        this.$loader.toggleClass('_hidden', true);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('suggest', suggest);

})(jQuery, document);