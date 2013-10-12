(function($, nb) {
//{{{ Базовый блок
function oninit() {
    //  У попапа есть "хвостик".
    this.$tail = $(this.node).find('.popup__tail');
    this.hasTail = !!this.$tail.length;
}

function ontoggle(e, params) {
    var where = params.where;

    if (this.where) {
        //  Попап уже открыт
        //  FIXME: Буэээ. Уродливое условие для варианта, когда заданы координаты вместо ноды.
        if ( where === this.where || ( (where instanceof Array) && where[0] === this.where[0] && where[1] === this.where[1] ) ) {
            //  На той же ноде. Значит закрываем его.
            this.trigger('close');
            return;
        }
    }
    this.trigger('open', params);
}

function onopen(e, params) {
    this.where = params.where;
    this.how = params.how;
    this.toggler = params.toggler;
    this.parent = params.parent;
    this.size = params.size;

    if (!this._placeholder) {
        this._placeholder = $('<s class="_hidden"/>').insertBefore(this.node);
    }

    // Попробуем сами найти
    if ((this._type === 'popup') && !this.parent && !(this.where instanceof Array)) {
        var parent = $(this.where).parentsUntil($holder(), '[data-nb]').last()[0];
        parent = nb.block(parent);
        if (parent._type === 'popup') {
            this.parent = parent;
        }
    }

    $(this.node).detach();

    nb.trigger('popup-before-open', this);

    if (this._type === 'modal') {
        //  Ноду блока переносим внутрь паранджи.
        $paranja().append(this.node).show();
    } else {
        //  Переносим ноду попапа в отдельный блок,
        //  чтобы избежать разных проблем с css.
        $holder(true).append(this.node);

        //  Передвигаем попап.
        this._move();
    }

    //  Показываем.
    this.show();

    // Сообщаем в космос, что открылся попап
    nb.trigger('popup-opened', this);
}

function onclose() {
    //  Снимаем флаг о том, что попап открыт.
    this.where = null;
    this.toggler = null;
    this.parent = null;

    nb.trigger('popup-before-close', this);
    //  Прячем.
    if (this._type === 'modal') {
        $paranja().hide();
    }
    this.hide();

    // Возвращаем ноду попапа на старое место (если оно есть).
    // Его может не быть, если попап сгенерён вручную.
    if (this._placeholder) {
        this._placeholder.after(this.node);
    }

    // Сообщаем в космос, что закрылся попап
    nb.trigger('popup-closed', this);
}

function onmove() {
    this._move();
}

function move() {
    //  Модальный попап двигать не нужно.
    if (this.modal) {
        return;
    }

    var how = normalizeHow(this.how);

    //  Изначальные прямоугольники для what и where.
    var orig_what = nb.rect(this.node);
    var where = nb.rect(this.where);

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

            var x, y;
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
            x = tailOffset[0];
            y = tailOffset[1];

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

    //  Вычисляем размеры попапа.
    if (this.size) {
        var sizeCss = {};
        if (this.size.width) {
            sizeCss.width = $(this.size.width).outerWidth();
        }
        if (this.size.height) {
            sizeCss.height = $(this.size.height).outerHeight();
        }
        $(this.node).css(sizeCss);
    }
}

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

}

//  Показываем блок.
function show() {
    $(this.node).removeClass('_hidden');
    this.trigger('show');
}

//  Прячем блок.
function hide() {
    $(this.node).addClass('_hidden');
    this.trigger('hide');
}


var base = {
    events:{
        'init': oninit,
        'toggle': ontoggle,
        'open': onopen,
        'close': onclose,
        'move': onmove,

        'click .popup__close': onclose
    },
    '_move': move,
    'show': show,
    'hide': hide
};
base = nb.define(base);

//}}}

//  FIXME: Паранджа, наверное, должна быть общедоступным компонентом.
var $paranja = function() {
    var div = $('<div class="paranja paranja_theme_dark"/>').appendTo('body').hide();
    $paranja = function() { return div; };
    return div;
};

// Возвращает placeholder для popup-ов.
// Хитрая ленивая функция.
// Если передан `append` = true placeholder перемещается в конец body (чтобы попап оказался выше всех).
var $holder = function() {
    var div = $('<div/>').appendTo('body');
    $holder = function(append) {
        if (append && !div.is(':last-child')) {
            div.appendTo('body');
        }
        return div;
    };
    return div;
};

nb.define('tooltip', { _type: 'tooltip' }, base.name);
nb.define('popup',   { _type: 'popup'   }, base.name);
nb.define('modal',   { _type: 'modal'   }, base.name);

nb.on('popup-before-open', function(e, popup) {
    var opened = $holder().children();
    switch (popup._type) {
        case 'tooltip':
            for (var i = opened.length; i > 0; i--) {
                var p = nb.block(opened[i-1]);
                if (p._type !== 'tooltip') {
                    continue;
                }
                p.trigger('close');
            }
            break;
        case 'modal':
            for (var i = opened.length; i > 0; i--) {
                nb.block(opened[i-1]).trigger('close');
            }
            break;
        default:
            // popup goes here
            for (var i = opened.length; i > 0; i--) {
                var p = nb.block(opened[i-1]);
                if (popup.parent === p) {
                    break; // не закрываем родителей
                }
                if (p._type === 'tooltip') {
                    continue; // (?) не закрываем тултипы
                }
                p.trigger('close');
            }
    }
});

nb.on('popup-before-close', function(e, popup) {
    switch (popup._type) {
        case 'tooltip':
            break;
        case 'modal':
            var opened = $holder().children();
            for (var i = opened.length; i > 0; i--) {
                nb.block(opened[i-1]).trigger('close');
            }
            break;
        default:
            // popup goes here
            var nextAll = $(popup.node).nextAll();
            for (var i = 0; i < nextAll.length; i++) {
                var p = nb.block(nextAll[i]);
                if (p && p._type === 'popup') {
                    p.trigger('close');
                    break;
                }
            }
    }
});

nb.on('keydown', function(e) {
    // FIXME А если что-то набирается в попапе?
    if (e.keyCode !== 27) {
        return;
    }
    var popup = $holder().children().last()[0];
    if (popup) {
        nb.block(popup).trigger('close');
        return;
    }
    popup = $paranja().children().last()[0];
    if (popup) {
        popup = nb.block(popup);
        if (!popup.ignoreEsc) {
            popup.trigger('close');
        }
    }
});

// Клик в космосе должен закрывать все попапы.
nb.on('space:click', function(e, node) {
    var popup;
    popup = $holder().children().has(node).add($holder().children().filter(node));
    if (popup.length) {
        popup = popup.next();
        if (popup.length) {
            nb.block(popup[0]).trigger('close');
        }
        return;
    }
    if ($holder().children().length) {
        nb.block($holder().children().first()[0]).trigger('close');
        return;
    }
    if (!$paranja().has(node).length) {
        popup = $paranja().children().last()[0];
        if (popup) {
            popup = nb.block(popup);
            if (!popup.ignoreEsc) {
                popup.trigger('close');
            }
        }
    }
});

nb.on('popup-close', function() {
    if ($holder().children().length) {
        nb.block($holder().children().first()[0]).trigger('close');
    }
    if ($paranja().children().length) {
        nb.block($paranja().children().first()[0]).trigger('close');
    }
});

// Хэлпер функции.
nb.popup = {
    // Открыт ли хотя бы один popup.
    someOpen: function() {
        return !!$holder().children().length;
    }
};


}(jQuery, nb));

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('popup-toggler', {

    events: {
        'click': 'onclick'
    },

    'onclick': function() {
        if (this.getMod('_disabled')) {
            return;
        }

        var popup = this.getPopup();

        if (popup) {
            var data = this.nbdata('popup-toggler');

            popup.trigger('toggle', {
                //  Относительно чего позиционировать попап.
                //  Если заданы точные координаты в `data.where`, то по ним.
                //  Иначе относительно ноды этого блока.
                where: data.where || this.node,

                //  Как позиционировать попап.
                how: data.how,

                //  Кто открыл попап?
                toggler: this.node,

                //  Можно задать условия вычисления размера попапа.
                size: data.size
            });

            return false;
        }
    },

    getPopup: function() {
        if (!this._popup) {
            var data = this.nbdata('popup-toggler');
            this._popup = nb.find( data['id'] );
        }
        return this._popup;
    }

});

nb.define('tooltip-toggler', {

    events: {
        'mouseover': 'showTooltip',
        'mouseout': 'hideTooltip'
    },

    'showTooltip': function() {
        if (this.getMod('_disabled')) {
            return;
        }

        var tooltip = this.getTooltip();

        if (tooltip) {
            var data = this.nbdata('tooltip-toggler');
            tooltip.trigger('open', {
                where: data.where || this.node,
                how: data.how
            });

            return false;
        }
    },

    'hideTooltip': function() {
        var tooltip = this.getTooltip();

        if (tooltip) {
            tooltip.trigger('close');
            return false;
        }
    },

    getTooltip: function() {
        if (!this._tooltip) {
            var data = this.nbdata('tooltip-toggler');
            this._tooltip = nb.find( data['id'] );
        }
        return this._tooltip;
    }
});

//  ---------------------------------------------------------------------------------------------------------------  //

