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
    var data = this.data();

    if ('modal' in data) {
        this.modal = true;
    }

    //  У попапа есть "хвостик".
    if ( $(this.node).find('.popup__tail')[0] ) {
        this.hasTail = true;
    }

    //  FIXME: Может быть это нужно делать не тут, а где-нибудь в _show()?
    //  Переносим ноду попапа в самый конец документа,
    //  чтобы избежать разных проблем с css.
    $('body').append(this.node);
};

// ----------------------------------------------------------------------------------------------------------------- //

popup.onopen = function(e, params) {
    var where = params.where;
    var how = params.how;

    //  FIXME: Нужно сделать отдельный флаг this.visible.
    if (this.where) {
        //  Попап уже открыт
        if (where === this.where) {
            //  На той же ноде. Значит закрываем его.
            this.trigger('close');
        } else {
            //  На другой ноде. Передвигаем его в нужное место.
            this._move(where, how);
        }
    } else {
        //  Попап закрыт. Будем открывать.

        //  На всякий случай даем сигнал, что нужно закрыть все открытые попапы.
        nb.trigger('popup-close');

        //  Передвигаем попап.
        this._move(where, how);
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

//  FIXME: Паранджа, наверное, должна быть общедоступным компонентом.

var _$paranja;

var $paranja = function() {
    if (!_$paranja) {
        _$paranja = $('<div class="paranja paranja_theme_dark"></div>').hide();
        $('body').append( _$paranja );
    }

    return _$paranja;
}

popup.show = function() {
    //  Включаем паранджу, если нужно.
    if (this.modal) {
        //  Ноду блока переносим внутрь паранджи.
        $paranja().append(this.node).show();
    }

    this.super.show.call(this);

};

popup.hide = function() {
    if (this.modal) {
        $paranja().hide();
        //  Выносим блок из паранджи.
        //  FIXME: А может это и не нужно. Ну и пусть все модальные диалоги копятся в ней.
        $('body').append(this.node);
    }

    this.super.hide.call(this);
};

// ----------------------------------------------------------------------------------------------------------------- //

popup._move = function(where, how) {
    //  FIXME: Не нужно это делать в _move().
    //  Запоминаем, на какой ноде мы открываем попап.
    this.where = where;

    //  Модальный попап двигать не нужно.
    if (this.modal) {
        return;
    }

    //  Дефолтное направление открытия.
    how = how || { dir: 'bottom' };

    //  Если направление задано через dir, пересчитываем это в what/where.

    var whatDir, whereDir;
    if (how.dir) {
        //  Скажем, если dir === 'bottom', то where === 'bottom', а what === 'top'.
        //  nb.vev.flipDir возвращает противоположное направление.
        whatDir = nb.vec.flipDir[ how.dir ];
        whereDir = how.dir;
    } else {
        whatDir = how.what;
        whereDir = how.where;
    }

    whatDir = normalizeDir(whatDir);
    whereDir = normalizeDir(whereDir);

    var adjusted = nb.rect.adjust( nb.rect(this.node), nb.rect(where), { what: whatDir, where: whereDir } );

    var transforms = {
        'left bottom':  [ [  1,  0 ], [  0,  1 ] ],
        'right bottom': [ [ -1,  0 ], [  0,  1 ] ],
        'top left':     [ [  0,  1 ], [ -1,  0 ] ],
        'bottom left':  [ [  0, -1 ], [ -1,  0 ] ],
        'right top':    [ [ -1,  0 ], [  0, -1 ] ],
        'left top':     [ [  1,  0 ], [  0, -1 ] ],
        'bottom right': [ [  0, -1 ], [  1,  0 ] ],
        'top right':    [ [  0,  1 ], [  1,  0 ] ]
    };

    if (this.hasTail) {
        var tailDir = tailDirs(whatDir, whereDir);
        var transform = transforms[ tailDir.join(' ') ];
        console.log(transform);
    }

    function normalizeDir(dir) {
        dir = dir || '';

        var parts;
        switch (dir) {
            //  Если направление не задано, считаем, что это 'center center'.
            case '':
                parts = [ 'center', 'center' ];
                break;

            //  Если задано только одно направление, второе выставляем в 'center'.
            case 'left':
            case 'right':
            case 'center':
                parts = [ dir, 'center' ];
                break;

            case 'top':
            case 'bottom':
                parts = [ 'center', dir ];
                break;

            default:
                parts = dir.split(/\s+/);

                //  В случае 'top right' и т.д. переставляем части местами.
                //  Одного сравнения недостаточно, потому что может быть 'top center' или 'center left'.
                if ( /^(?:left|right)/.test( parts[1] ) || /^(?:top|bottom)/.test( parts[0] ) ) {
                    parts = [ parts[1], parts[0] ];
                }
        }

        return parts;
    }

    function tailDirs(what, where) {

        if ( what[0] === where[0] && nb.vec.flipDir[ what[1] ] === where[1] ) {
            return where;
        }

        if ( what[1] === where[1] && nb.vec.flipDir[ what[0] ] === where[0] ) {
            return [ where[1], where[0] ];
        }

    };

    var pos = adjusted[0];

    $(this.node).css({
        left: pos[0],
        top: pos[1]
    });
/*

if (this.hasTail) {
    var dir = how.dir;

    //  Выставляем нужный модификатор для "хвостика" попапа.
    this.setMod('popup_to', dir);

    //  FIXME: Смещение вверх и вниз должны быть разные.
    how.offset = 10;
}

nb.node.position(this.node, where, how);
*/

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
        if ( !$.contains(that.node, e.target) && !(that.where && !(that.where instanceof Array) && $.contains(that.where, e.target)) ) {
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
        $(document).off('keydown', this._onkeypress);
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
        var data = this.data()['popup-toggler'];

        //  Находим соответствующий попап.
        //  Соответствие задается атрибутом `id`.
        var popup = nb.find( data['id'] );

        if (popup) {
            popup.trigger('open', {
                //  Относительно чего позиционировать попап.
                //  Если заданы точные координаты в `data.where`, то по ним.
                //  Иначе относительно ноды этого блока.
                where: data.where || this.node,

                //  Как позиционировать попап.
                how: data.how
            });

            return false;
        }
    }

});

//  ---------------------------------------------------------------------------------------------------------------  //

