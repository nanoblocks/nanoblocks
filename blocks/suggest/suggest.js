// ----------------------------------------------------------------------------------------------------------------- //
(function($, doc){

// TODO #36 научиться экономить запросы к серверу: фильтровать данные на клиенте

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
    'click': 'onFocusIn',
    'focusin': 'onFocusIn',
    'input': 'onInput'
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onInit = function() {
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
    this.focusin_show = this.getDataBool('focusin-show');
    this.theme_class = this.getDataString('theme-class', '');
    this.search_param_name = this.getDataString('search-param-name', 'text');
    this.max_param_name = this.getDataString('max-param-name', 'max');
    this.default_params = this.getDataObject('default_params', {});
    this.popup_selector = this.getDataString('popup-selector');

    this.$input = $(this.node);

    // Internal state.
    this._text = null;
    this._suggest_text = null; // Showen suggest is for this text.
    this._selected = null;
    this._html = {}; // Rendered suggest lists.

    this._createPopup();
    this._popup_opened = false;

    // Data.
    this.createDataSource();
    this._getDataTimeout = null;

    nb.trigger('inited:' + this.node.id, this); // TODO удалить, когда для всех блоков добавиться такое поведение
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.getDataNumber = function(key, default_value) {
    var value = +this.nbdata(key);
    return isNaN(value) ? default_value : value;
};

suggest.getDataBool = function(key) {
    return (this.nbdata(key) || '').toLowerCase() === 'true';
};

suggest.getDataString = function(key, default_value) {
    return this.nbdata(key) || default_value;
};

suggest.getDataObject = function(key, default_value) {
    return this.nbdata(key) || default_value;
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onFocusIn = function() {
    if (this.focusin_show && !this._popup_opened && (!!this._text || this.min_length === 0)) {
        this.suggest(this._text);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._createPopup = function() {
    var that = this;

    // Если указан селектор попапа, где будет выводиться suggest то ищем мы его сразу за полем suggest-а.
    // Вроде бы нет никаких причин его располагать где-то ещё.
    // А так мы решаем проблему нескольких саджестов на одной странице.
    if (this.popup_selector) {
        this.$popup = $(this.node).next(this.popup_selector);
    }
    else {
        this.$popup = $(
            '<div class="popup popup_theme_blocky popup_to_top" data-nb="popup">' +
                '<div class="suggest-scrollbox"></div>' +
            '</div>')
            .addClass(this.theme_class)
            .appendTo(doc.body);
    }

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

    this.$popup_wrapper = this.$popup.find('.suggest-scrollbox');

    this.popup = nb.block(this.$popup[0], {
        'mouseover .suggest-scrollbox li': function(evt) {
            that.setCurrent(evt.target);
        },
        'click .suggest-scrollbox li': function(evt) {
            var $item = $(evt.target).closest('li');
            that.selectItem($item);
        },
        'close': function() {
            that._popup_opened = false;
        }
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
    if (!this._isReady()) {
        return;
    }

    if (evt.keyCode == 27) { // ESC
        this._reset();
        return;
    }

    if (evt.keyCode == 38) { // UP
        evt.preventDefault();
        this.changeCurrent(-1);
        return;
    }

    if (evt.keyCode == 40) { // DOWN
        evt.preventDefault();
        this.changeCurrent(1);
        return;
    }

    if (evt.keyCode == 13) { // ENTER
        evt.preventDefault();
        this.selectItem();
        return;
    }

    var text = this.$input.val().trim();
    if (text === this._text) { // Prevents some hot keys, like Cmd + Tab to switch tab.
        return;
    }

    this._text = text;
    this.suggest(text);
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.onInput = function() {
    var text = this.$input.val().trim();
    if (text === this._text) {
        return;
    }
    this._text = text;
    this.suggest(text);
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.suggest = function(text) {
    var that = this;
    text = text || '';

    // Do not request intermediate strings.
    if (this._getDataTimeout) {
        clearTimeout(this._getDataTimeout);
    }

    // Do not request anything because user has not supplied minimal input.
    // Hide suggest.
    if (text.length < this.min_length) {
        this.popup.trigger('close');
        return;
    }

    if (this._data.has(text)) {
        // Immediate display suggest if data present.
        this._showFor(text);
    } else {
        // Go get data after delay.
        this._getDataTimeout = setTimeout(function() { that._requestData(text); }, this.delay);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._reset = function() {
    this.$input.val(this._text);
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.createDataSource = function() {
    if (this.source_url) {
        var params = {
            url: this.source_url,
            retry_count: 3,
            max_items: this.max_items,
            timeout: this.response_timeout,
            query_param_name: this.search_param_name,
            max_param_name: this.max_param_name,
            default_params: this.default_params
        };
        this._data = new nb.suggest.ajaxDS().init(params);
    }
};

suggest.setArrayData = function(options) {
    this._data = new nb.suggest.arrayDS().init(options);
};

suggest.setDataSource = function(ds) {
    this._data = ds;
};

suggest._requestData = function(text) {
    var that = this;
    this._data.get({
        key: text,
        onstart: function() {
            that.showLoader();
        },
        onsuccess: function() {
            that._showFor(text);
            that.hideLoader();
        },
        onfail: function() {
            that.hideLoader();
        }
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest._showFor = function(text) {
    if (this.$input.val().trim() !== text) { // Only show suggest, if text was not changed after request has been sent.
        return;
    }

    var data = this._data.getSync(text);

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

        // Adjust width to input width
        if (this.expand_to_input) {
            this.$popup.css('width', this.$input.outerWidth());
        }

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
    var label = item[this.label_key] || '';
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

    if (!text || !match) {
        return '';
    }

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

suggest.setCurrent = function(node) {
    $('li.current', this.$suggest_container).toggleClass('current', false);
    $(node).closest('li').toggleClass('current', true);
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 *
 * @param {number} dir +1 - select next item, -1 - select previous item.
 */
suggest.changeCurrent = function(dir) {
    var $suggest = this.$suggest_container;
    var $selected = $('li.current', $suggest);
    var $items = $suggest.find('li');

    // Clear previous selection.
    $selected.toggleClass('current', false);

    if (!this._popup_opened) {
        this.suggest(this._text);
        return;
    }

    if (!$items.length) {
        return;
    }

    if (dir > 0) {
        var $next = $selected.nextAll('li:first');

        if ($selected.length === 0) {
            $('li:first', $suggest).addClass('current');
            this.$input.val(this.getText(0));
        }
        else if ($next.length === 0) {
            this.$input.val(this._suggest_text);
        }
        else {
            $next.addClass('current');
            this.$input.val(this.getText($items.index($selected) + 1));
        }
    } else {
        var $prev = $selected.prevAll('li:first');

        if ($selected.length === 0) {
            var $item = $('li:last', $suggest).addClass('current');
            this.$input.val(this.getText($items.index($item)));
        }
        else if ($prev.length === 0) {
            this.$input.val(this._suggest_text);
        }
        else {
            $prev.addClass('current');
            this.$input.val(this.getText($items.index($selected) - 1));
        }
    }

    this.scrollCurrentIntoView();
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Returns cached object by data item index.
 * @param {number} index Item index.
 */
suggest.getCached = function(index) {
    var text = this._suggest_text;
    if (this._data.has(text)) {
        var items = this._data.getSync(text);
        var label_key = this.label_key;

        for (var i = 0, pos = 0; i < items.length; i++) {
            var item = items[i];
            if (item[label_key]) {
                if (pos === index) {
                    return item;
                }
                pos++;
            }
        }
    }
    return {};
};

/**
 * Returns text by data item index.
 * @param {number} index Item index.
 */
suggest.getText = function(index) {
    var cached = this.getCached(index);
    if (cached[this.label_key]) {
        return cached[this.label_key];
    }
    return '';
};

// ----------------------------------------------------------------------------------------------------------------- //

suggest.selectItem = function($item) {
    var $suggest = this.$suggest_container;

    if (!$suggest) {
        $item = $('');
    }

    $item = $item || $suggest.find('li.current');

    var $input = this.$input;
    var text;
    var success = false;

    if ($item.length === 0) {
        text = $input.val();
        this._selected = { label: text };
    } else {
        var index = $suggest.find('li').index($item);

        text = this.getText(index);
        $input.val(text);

        this._selected = this.getCached(index);
        success = !!text;
    }
    this._text = text; // save like in keyup handler

    this.popup.trigger('close');
    this.trigger('selected', this._selected);
    return success;
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

suggest._isReady = function() {
    return !!this.$suggest_container;
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('suggest', suggest);

})(jQuery, document);
