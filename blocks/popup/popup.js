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
    this.$tail = $(this.node).find('.popup__tail');
    this.hasTail = !!this.$tail.length;

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

    //  Специальный флаг-костыль.
    //  Если он true, то это значит, что мы только что передвинули открытый попап в другое место
    //  и его не нужно закрывать на клик.
    this.moved = false;

    if (this.where) {
        //  Попап уже открыт
        //  FIXME: Буэээ. Уродливое условие для варианта, когда заданы координаты вместо ноды.
        if ( where === this.where || ( (where instanceof Array) && where[0] === this.where[0] && where[1] === this.where[1] ) ) {
            //  На той же ноде. Значит закрываем его.
            this.trigger('close');
        } else {
            this.moved = true;
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

    this.super_.show.call(this);

};

popup.hide = function() {
    if (this.modal) {
        $paranja().hide();
        //  Выносим блок из паранджи.
        //  FIXME: А может это и не нужно. Ну и пусть все модальные диалоги копятся в ней.
        $('body').append(this.node);
    }

    this.super_.hide.call(this);
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

    how = normalizeHow(how);

    //  Изначальные прямоугольники для what и where.
    var orig_what = nb.rect(this.node);
    var where = nb.rect(where);

    //  Adjusted what -- т.е. мы what передвинули так, чтобы точки привязки what и where совпадали.
    //  adj_what -- это объект с двумя свойствами:
    //
    //    * rect -- это собственно сдвинутый what.
    //    * point -- это точка привязки, куда мы его сдвинули.
    //
    var adj_what = nb.rect.adjust(orig_what, where, how);
    var what = adj_what.rect;

    var tailDir;
    var needTail = this.hasTail && (( tailDir = tailDirs(how.what, how.where) ));

    if (needTail) {
        //  Показываем "хвост" с нужной стороны попапа.
        this.setMod( 'popup_to', tailDir[1] );

        var css = { left: '', right: '', top: '', bottom: '' };

        //  Позиционируем "хвост", если он должен быть не по-центру попапа.
        if ( tailDir[0] !== 'center' ) {
            //  Сдвиг, который делает точку привязки началом координат.
            var offset2origin = nb.vec.scale(adj_what.point, -1);

            //  Преобразование в "положение 1".
            var transform = transforms[ tailDir.join(' ') ];

            var t_what = nb.rect.trans( nb.rect.move(what, offset2origin), transform );
            var t_where = nb.rect.trans( nb.rect.move(where, offset2origin), transform );

            //  После этих преобразований мы получаем, что точка привязки сместилась в начало координат,
            //  левый нижний угол where в начале координат, левый верхний угол what в начале координат.
            //
            //  -------------
            //  |   where   |
            //  |           |
            //  *-------------------
            //  |       what       |
            //  |                  |
            //  |                  |
            //  |                  |
            //  --------------------
            //

            //  Слевы положение "хвоста" ограничено некой константой.
            var MIN_LEFT = 27;
            //  Справа -- минимумом из середин what и where.
            var r = Math.min( t_what[1][0] / 2, t_where[1][0] / 2);

            var x;
            if (MIN_LEFT <= r) {
                //  Для "хвоста" достаточно места.

                x = r;
            } else {
                //  "Хвост" не влезает, поэтому необходимо подвинуть и сам попап.

                x = MIN_LEFT;
                t_what = nb.rect.move( t_what, [ r - MIN_LEFT, 0 ] );
            }

            //  Зазор для "хвоста".
            t_what = nb.rect.move( t_what, [ 0, 10 ] );

            //  Делаем обратное преобразование попапа...
            what = nb.rect.move( nb.rect.trans( nb.rect.trans( nb.rect.trans( t_what, transform ), transform ), transform ), adj_what.point );
            //  ...и смещения для "хвоста".
            var tailOffset = nb.vec.mulM( transform, nb.vec.mulM( transform, nb.vec.mulM( transform, [ x, 0] ) ) );

            //  Позиционируем "хвост".
            var x = tailOffset[0], y = tailOffset[1];
            var AUTO = 'auto';
            if (x > 0) {
                css.left = x;
                css.right = AUTO;
            } else if (x < 0) {
                css.left = AUTO;
                css.right = -x;
            } else if (y > 0) {
                css.top = y;
                css.bottom = AUTO;
            } else {
                css.top = AUTO;
                css.bottom = -y;
            }
        } else {
            //  Зазор для "хвоста".
            what = nb.rect.move( what, nb.vec.scale( nb.vec.dir2vec(how.where), 10 ) );
        }

        this.$tail.css(css).show();
    } else {
        this.$tail.hide();
    }

    //  Позиционируем попап.
    $(this.node).css({
        left: what[0][0],
        top: what[0][1]
    });

};

function normalizeHow(how) {
    //  Дефолтное направление открытия.
    how = how || { dir: 'bottom' };

    var what, where;

    //  Если направление задано через dir, пересчитываем это в what/where.
    if (how.dir) {
        //  Скажем, если dir === 'bottom', то where === 'bottom', а what === 'top'.
        //  nb.vev.flipDir возвращает противоположное направление.
        what = nb.vec.flipDir[ how.dir ];
        where = how.dir;
    } else {
        what = how.what;
        where = how.where;
    }

    return {
        what: normalizeDir(what),
        where: normalizeDir(where)
    };
}


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

    var that = this;
    this._onclick = function(e) {
        if (that.moved) {
            that.moved = false;
            return;
        }
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

