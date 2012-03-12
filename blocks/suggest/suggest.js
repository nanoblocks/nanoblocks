// ----------------------------------------------------------------------------------------------------------------- //
(function($, doc){

/* TODO
    []  когда нажимаешь вниз - выпадает список, но в нём не выделен текущий выбранный текст + может быть надо сбрасывать
        подсказки - показывать подсказки для текущего, введённого текста...
    []  show current selection as highlighted?
    []  #36 научиться экономить запросы к серверу: фильтровать данные на клиенте
    []  static array as source of items...
    []  по Cmd+Tab (переключение на другой таб) - выполняется запрос и отображается suggest по возврату назад на этот таб.
    [x] cache rendered suggest items
    [x] show found substring
    [x] on re - we have 2 rows! white-space: nowrap set!
    [x] popup long items fade
    [x] up key - cursor is going to the left and then - to the right
    [x] если есть данные для текущего введённого текста - показывать сразу
    [x] когда что-то выпало - повторный клик внутри поля ввода не должен закрывать саджест (это делает сам popup из-за кривой проверки contains())
    [x] scroll selected into view
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
    'keydown': 'onKeyDown',
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
    this.show_fade = this.getDataBool('show-fade');
    this.highlight_match = this.getDataBool('highlight-matches');

    this.$input = $(this.node);

    // Internal state.
    this._text = null;
    this._suggest_text = null; // Showen suggest is for this text.
    this._requests = {};
    this._cache = {};
    this._selected = null;
    this._html = {}; // Rendered suggest lists.

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
            '<div class="popup__scrollbox"></div>' +
        '</div>')
        .appendTo(doc.body);

    if (this.show_loader) {
        var $input = this.$input;
        var offset = $input.offset();
        var width = $input.outerWidth();

        this.$loader = $('<div class="loader_new"></div>')
            .insertBefore(this.$popup);

        var loader_width = this.$loader.outerWidth();
        this.$loader.css({
            'left': offset.left + width - loader_width,
            'top': offset.top
        });
    }

    if (this.expand_to_input) {
        this.$popup.css('width', this.$input.outerWidth());
    }

    this.$popup_wrapper = this.$popup.find('.popup__scrollbox');

    this.popup = nb.block(this.$popup[0]);
    this.popup.on('close', function() {
        that._popup_opened = false;
    });

    // Init mouse events.
    // TODO вешать через nb.Block?
    this.$popup_wrapper
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

suggest.onKeyDown = function(evt) {
    if (evt.keyCode == 38) { // UP
        evt.preventDefault(); // So cursor will not jump to text start in input.
        return;
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onKeyUp = function(evt) {
    if (evt.keyCode == 27) { // ESC
        this._reset();
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

suggest._reset = function() {
    this.$input.val(this._text);
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

    var data = this._cache[text];

    if (data.length <= 0) {
        this.popup.trigger('close');
        return;
    }

    this._suggest_text = text;
    this.showSuggest(); // Show before rendering: so we can calculate valid sizes.
    var suggest = this.renderSuggest(text, data);
    this.$suggest_container = suggest.container;
    this.$suggest_container.find('li.current').toggleClass('current', false);

    if (suggest.scroll_height) {
        this.$popup_wrapper.css({
            'max-height': suggest.scroll_height,
            'overflow-y': 'scroll'
        });
    }
    else {
        this.$popup_wrapper.css({
            'max-height': '',
            'overflow': ''
        });
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.renderSuggest = function(text, data) {
    var that = this;
    var suggest = this._html[text];

    $('ul', this.$popup_wrapper).remove(); // Remove previous suggest items.
    if (suggest) {
        this.$popup_wrapper.append(suggest.container);
        return suggest;
    }

    var $container = $('<ul/>');
    this.$popup_wrapper.append($container);

    data.forEach(function(item) {
        var $item = that.renderItem(item);
        if (!$item.is('li')) { // renderItem() can be overriden. So, we wrap rendered item with <li/> if needed.
            $item.wrap('li');
        }

        $container.append($item);
    });

    // Calculate scroll height.
    var scroll_height;
    if (this.scroll_min > 0 && data.length > this.scroll_min) {
        var $items = $container.find('li');
        scroll_height = 0;
        for (var i = 0; i < this.scroll_min; i++) {
            scroll_height += $($items[i]).outerHeight();
        }
    }

    suggest = { container: $container, scroll_height: scroll_height };
    this._html[text] = suggest;
    return suggest;
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
    var label = item[this.label_key];
    var label_html;

    if (this.highlight_match) {
        label_html = this.hightlightMatches(label, this._suggest_text);
    } else {
        label_html = '<span>' + label + '</span>';
    }

    var $item = $("<li></li>").attr('title', label).html(label_html);
    if (this.show_fade) {
        $item.append('<div class="fader"></div>');
    }
    return $item;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Returns a html string with highlighted match parts.
 * @param {string} text Text to be highlighted.
 * @param {string} match A substring to be found.
 */
suggest.hightlightMatches = function(text, match) {
    var index;
    var text_low = text.toLowerCase();
    var text_length = text.length;
    var match_low = match.toLowerCase();
    var match_length = match.length;
    var cur_index = 0;
    var parts = [];

    while ((index = text_low.indexOf(match_low, cur_index)) >= 0) {
        if (index > cur_index) {
            parts.push('<span>' + text.substring(cur_index, index) + '</span>');
        }
        parts.push('<span class="match">' + text.substring(index, index + match_length) + '</span>');
        cur_index = index + match_length;
    }

    if (cur_index < text_length) {
        parts.push('<span>' + text.substring(cur_index, text_length) + '</span>');
    }

    return parts.join('');
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

    if (!this._popup_opened) { // If popup hidden: show it.
        this._showFor(this._text);
        // TODO set current?
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

    this.scrollCurrentIntoView();
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
    var $input = this.$input;
    var text;

    if ($item.length === 0) {
        text = $input.val();
        this._selected = { label: text };
    } else {
        var index = $suggest.find('li').index($item);

        text = this.getText(index);
        $input.val(text);

        this._selected = this._cache[this._suggest_text][index];
    }
    this._text = text; // save like in keyup handler

    this.popup.trigger('close');
    this.trigger('selected', this._selected);
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.showLoader = function() {
    if (this.$loader) {
        this.$loader.toggleClass('loader_new__show', true);
    }
};

suggest.hideLoader = function() {
    if (this.$loader) {
        this.$loader.toggleClass('loader_new__show', false);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.scrollCurrentIntoView = function() {
    var dy = 3; // XXX это padding...
    var $current = this.$suggest_container.find('li.current');
    if (!!$current.length) {
        var wrapper = this.$popup_wrapper[0];
        var top = wrapper.scrollTop + dy;
        var height = this.$popup_wrapper.outerHeight();
        var bottom = top + height;

        var cur_top = wrapper.scrollTop + $current.position().top;
        var cur_height = $current.outerHeight();
        var cur_bottom = cur_top + cur_height;

        if (cur_bottom > bottom) {
            wrapper.scrollTop = cur_bottom - height - dy;
        }

        if (cur_top < top) {
            wrapper.scrollTop = cur_top - dy;
        }
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('suggest', suggest);

})(jQuery, document);