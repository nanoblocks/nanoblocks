(function() {

var popup = {};

// ----------------------------------------------------------------------------------------------------------------- //

popup.events = {
    'init': 'oninit',
    'open': 'onopen',
    'close': 'onclose',

    'click .popup__close': 'onclose'
};

// ----------------------------------------------------------------------------------------------------------------- //

popup.oninit = function() {
    //  Переносим ноду попапа в самый конец документа,
    //  чтобы избежать разных проблем с css.
    $('body').append( $(this.node) );
};

// ----------------------------------------------------------------------------------------------------------------- //

popup.onopen = function(e, params) {
    var where = params.where;
    var data = params.data;
    var dir = data.dir || 'bottom';

    if (this.where) {
        //  Попап уже открыт
        if (where === this.where) {
            //  На той же ноде. Значит закрываем его.
            this.trigger('close');
        } else {
            //  На другой ноде. Передвигаем его в нужное место.
            this._move(where, dir);
        }
    } else {
        //  Попап закрыт. Будем открывать.

        //  На всякий случай даем сигнал, что нужно закрыть все открытые попапы.
        nb.trigger('popup-close');

        //  Передвигаем попап.
        this._move(where, dir);
        //  Вешаем события, чтобы попап закрывался по нажатие ESC и клику вне попапа.
        this._bindClose();
        //  Показываем.
        this.show();
    }
};

popup.onclose = function() {
    //  Снимаем все события, которые повесили в open.
    this._unbindClose();
    //  Снимаем флаг о том, что попап открыт.
    this.where = null;
    //  Прячем.
    this.hide();
};

// ----------------------------------------------------------------------------------------------------------------- //

//  В какую сторону смещать попап для каждого из направлений.
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
    this.setMod('popup_to', dir);

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

    //  D := A + AB + BC + CD.
    var D = add( add( add(A, AB), BC), CD );

    //  Устанавливаем нужные координаты.
    $popup.css({
        left: D[0],
        top: D[1]
    });

    //  Служебные функции для работы с векторами.

    //  Возвращает вектор с левым верхним углом прямоугольника.
    function getOrig($o) {
        var pos = $o.offset();
        return [ pos.left, pos.top ];
    }

    //  Возвращает вектор от левого верхнего угла до центра прямоугольника.
    function getDiag($o) {
        return [ $o.width() / 2, $o.height() / 2 ];
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

//  Вешаем события перед открытием попапа, чтобы он закрывался при:
//
//    * Нажатии ESC;
//    * Клике в любое место вне попапа;
//    * При получении глобального события `popup-close`.
//
//  В случае необходимости, можно закрыть все открытые попапы вот так:
//
//      nb.trigger('popup-close');
//
popup._bindClose = function() {
    var that = this;

    this._onkeypress = function(e) {
        if (e.keyCode === 27) {
            that.trigger('close');
        }
    };
    $(document).on('keydown', this._onkeypress);

    this._onclick = function(e) {
        //  Проверяем, что клик случился не внутри попапа и не на ноде, на которой попап открыт (если открыт).
        if ( !$.contains(that.node, e.target) && !(that.where && $.contains(that.where, e.target)) ) {
            that.trigger('close');
        }
    };
    $(document).on('click', this._onclick);

    this._onpopupclose = nb.on('popup-close', function() {
        that.trigger('close');
    });
};

//  Снимаем все события, повешенные в `_bindClose`.
popup._unbindClose = function() {
    if (this.where) {
        $(document).off('keypress', this._onkeypress);
        $(document).off('click', this._onclick);
        nb.off('popup-close', this._onpopupclose);
    }
    this._onkeypress = this._onclick = this._onpopupclose = null;
};

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('popup', popup);

})();

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('popup-toggler', {

    events: {
        'click': 'onclick'
    },

    'onclick': function() {
        var data = this.data();

        //  Находим соответствующий попап.
        //  Соответствие задается атрибутом `id`.
        var popup = nb.find( data['id'] );

        if (popup) {
            popup.trigger('open', {
                //  Открываем его на текущей ноде.
                where: this.node,
                //  Передаем всю data, в частности, data['dir'] может указывать на направление открытия попапа.
                data: data
            });

            return false;
        }
    }

});

