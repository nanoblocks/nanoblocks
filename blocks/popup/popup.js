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
        this.show();
    }
};

popup._close = function() {
    this.where = null;
    this._unbindClose();
    this.hide();
};

// ----------------------------------------------------------------------------------------------------------------- //

var dirs = {
    'top': [ 0, -1 ],
    'left': [ -1, 0 ],
    'bottom': [ 0, 1 ],
    'right': [ 1, 0 ]
};

popup._move = function(where, dir) {
    //  Дефолтное направление -- вниз.
    dir = dir || 'bottom';

    //  Запоминаем, на какой ноде мы открываем попап.
    this.where = where;

    //  Выставляем нужный модификатор для "хвостика" попапа.
    //  Но сперва удаляем старый модификатор, если он там был.
    var className = this.node.className;
    className = className.replace(/\b\s*popup_to_(?:top|left|right|bottom)\b/, '').trim();
    className += ' popup_to_' + dir;
    this.node.className = className;

    //  Позиционируем попап.

    //  Картинка. Попап (popup) открывается вниз под нодой where.
    //
    //      A-------- where
    //      |   B   |
    //      ---------
    //          ^
    //  D---------------- popup
    //  |               |
    //  |               |
    //  |       C       |
    //  |               |
    //  |               |
    //  -----------------
    //
    //  Нам нужно получить координаты левого верхнего угла попапа. Т.е. точку D.

    var $where = $(where);
    var $popup = $(this.node);

    //  Начинаем мы из левого верхнего угла where -- ноды, на которой мы открываем попап (место клика обычно).
    var A = getOrig($where);

    //  Вектора AB и DC.
    var AB = getDiag($where);
    var DC = getDiag($popup);

    //  Вектор BC -- это вектор-смещение от центра where до центра popup.
    //  Направление его берется из объекта dirs, а длина --
    //  это сумма полувысот where и popup (либо полуширин, если открываем вбок).
    //  Вектор [ 12, 10 ] -- это зазор для "хвостика". По высоте он чуть меньше, чем по ширине.
    //  FIXME: когда открываем попап вверх, нужно его смещать чуть больше, чем когда вниз.
    var BC = mul( add( add(AB, DC), [ 12, 10 ] ), dirs[dir] );

    //  Вектор CD = -DC.
    var CD = mul( DC, [ -1, -1 ] );

    // D := A + AB + BC + CD.
    var D = add( add( add(A, AB), BC), CD );

    //  Устанавливаем нужные координаты.
    $popup.css({
        left: D[0],
        top: D[1]
    });

    //  Служебные функции для работы с векторами.

    //  Возвращает вектор с левым верхним углом прямоугольника.
    function getOrig($o) {
        var pos = $o.position();
        return [ pos.left, pos.top ];
    }

    //  Возвращает вектор от левого верхнего угла до центра прямоугольника.
    function getDiag($o) {
        return [ $o.width() / 2, $o.height() /2 ];
    }

    //  Складывает два вектора.
    function add(a, b) {
        return [ a[0] + b[0], a[1] + b[1] ];
    }

    //  "Умножает" два вектора.
    function mul(a, b) {
        return [ a[0] * b[0], a[1] * b[1] ];
    }

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
            var popup = nb.find( this.data('popup-id') );

            var that = this;
            setTimeout(function() {
                popup.open( that.node, that.data('popup-dir') );
            }, 0);

            return false;
        }
    }

});

