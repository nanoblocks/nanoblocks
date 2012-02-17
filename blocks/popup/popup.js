(function() {

var popup = {};

// ----------------------------------------------------------------------------------------------------------------- //

popup.events = {
    'init': 'oninit'
};

// ----------------------------------------------------------------------------------------------------------------- //

popup.oninit = function() {
    $('body').append( $(this.node) );
};

// ----------------------------------------------------------------------------------------------------------------- //

popup.open = function(where, dir) {
    if (this.where) {
        if (where === this.where) {
            this._close();
        } else {
            this._move(where, dir);
        }
    } else {
        nb.trigger('popup-close');
        this._move(where, dir);
        this._bindClose();
        $(this.node).removeClass('_hidden');
    }
};

popup._close = function() {
    this._unbindClose();
    this.where = null;

    $(this.node).addClass('_hidden');
};

popup._move = function(where, dir) {
    this.where = where;

    var $popup = $(this.node);
    var $where = $(where);

    dir = dir || 'bottom';
    // $popup.find('.popup__tail').remove();
    // $popup.prepend( $('<div class="popup__tail popup__tail_on_' + dir + '"></div>') );

    dir = ({
        'top': [ 0, -1 ],
        'left': [ -1, 0 ],
        'bottom': [ 0, 1 ],
        'right': [ 1, 0 ]
    })[dir];

    var pw = $popup.width();
    var ph = $popup.height();
    var ww = $where.width();
    var wh = $where.height();

    dir = [
        dir[0] * (ww + pw + 24) / 2,
        dir[1] * (wh + ph + 20) / 2
    ];

    var pos = $where.position();

    $popup.css({
        left: dir[0] - pw / 2 + pos.left + ww / 2,
        top: dir[1] - ph / 2 + pos.top + wh / 2
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

popup._bindClose = function() {
    var that = this;

    this._onkeypress = function(e) {
        if (e.keyCode === 27) {
            that._close();
        }
    };
    $(document).on('keypress', this._onkeypress);

    this._onclick = function(e) {
        if ( !$.contains(that.node, e.target) && !$.contains(that.where, e.target) ) {
            that._close();
        }
    };
    $(document).on('click', this._onclick);

    this._onpopupclose = nb.on('popup-close', function() {
        that._close();
    });
};

popup._unbindClose = function() {
    if (this._onkeypress) {
        $(document).off('keypress', this._onkeypress);
    }
    if (this._onclick) {
        $(document).off('click', this._onclick);
    }
    if (this._onpopupclose) {
        nb.off('popup-close', this._onpopupclose);
    }
    this._onkeypress = null;
    this._onclick = null;
    this._onpopupclose = null;
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('popup', popup);

})();

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('popup-toggler', {

    events: {
        'click': function() {
            var popup_id = this.data('popup-id');
            var popup = nb.block( document.getElementById(popup_id) );

            var that = this;
            setTimeout(function() {
                popup.open( that.node, that.data('popup-dir') );
            }, 0);

            return false;
        }
    }

});

