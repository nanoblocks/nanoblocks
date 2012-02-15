var nb = {};

// ----------------------------------------------------------------------------------------------------------------- //

//  Минимальный common.js
//  ---------------------

//  Наследование:
//
//      function Foo() {}
//      Foo.prototype.foo = function() {
//          console.log('foo');
//      };
//
//      function Bar() {}
//      nb.inherit(Bar, Foo);
//
//      var bar = Bar();
//      bar.foo();
//
nb.inherit = function(child, parent) {
    var F = function() {};
    F.prototype = parent.prototype;
    child.prototype = new F();
    child.prototype.constructor = child;
};

//  Расширение объекта свойствами другого объекта(ов):
//
//      var foo = { foo: 42 };
//      nb.extend( foo, { bar: 24 }, { boo: 66 } );
//
nb.extend = function(dest) {
    var srcs = [].slice.call(arguments, 1);

    for (var i = 0, l = srcs.length; i < l; i++) {
        var src = srcs[i];
        for (var key in src) {
            dest[key] = src[key];
        }
    }

    return dest;
};


// ----------------------------------------------------------------------------------------------------------------- //

//  nb.Events
//  ---------

//  Простейший pub/sub
//
//  nb.Events -- объект, который можно подмиксовать к любому другому объекту:
//
//      var foo = {};
//      nb.extend( foo, nb.Events );
//
//      foo.on('bar', function(e, data) {
//          console.log(e, data);
//      });
//
//      foo.trigger('bar', 42);
//
//  Или же:
//
//      function Foo() {}
//
//      nb.extend( Foo.prototype, nb.Events );
//
//      var foo = new Foo();
//
//      foo.on('bar', function(e, data) {
//          console.log(e, data);
//      });
//
//      foo.trigger('bar', 42);
//

nb.Events = {};

//  Возвращает список обработчиков события name.
//  Если еще ни одного обработчика не забинжено, возвращает (и сохраняет) пустой список.
nb.Events._getEventHandlers = function(name) {
    var handlers = this._eventHandlers || (( this._eventHandlers = {} ));

    return handlers[name] || (( handlers[name] = [] ));
};

//  Подписываем обработчик handler на событие name.
nb.Events.on = function(name, handler) {
    var handlers = this._getEventHandlers(name);

    handlers.push(handler);
};

//  Отписываем обработчик handler от события name.
//  Если не передать handler, то удалятся вообще все обработчики события name.
nb.Events.off = function(name, handler) {
    if (handler) {
        var handlers = this._getEventHandlers(name);
        //  Ищем этот хэндлер среди уже забинженных обработчиков этого события.
        var i = handlers.indexOf(handler);

        //  Нашли и удаляем этот обработчик.
        if (i !== -1) {
            handlers.splice(i, 1);
        }
    } else {
        //  Удаляем всех обработчиков этого события.
        var handlers = this._eventHandlers;
        if (handlers) {
            delete handlers[name];
        }
    }
};

//  "Генерим" событие name. Т.е. вызываем по очереди (в порядке подписки) все обработчики события name.
//  В каждый передаем name и params.
nb.Events.trigger = function(name, params) {
    // Копируем список хэндлеров. Если вдруг внутри какого-то обработчика будет вызван off(),
    // то мы не потеряем вызов следующего обработчика.
    var handlers = this._getEventHandlers(name).slice();

    for (var i = 0, l = handlers.length; i < l; i++) {
        //  Вызываем обработчик в контексте this.
        handlers[i].call(this, name, params);
    }
};

//  Общий канал для общения, не привязанный к конкретным экземплярам блоков.
nb.extend(nb, nb.Events);


// ----------------------------------------------------------------------------------------------------------------- //

//  Интерфейсная часть
//  ------------------

//  Метод создает блок на заданной ноде:
//
//      var popup = nb.block( document.getElementById('popup') );
//
nb.block = function(node) {
    var block_id = node.getAttribute('data-nb');
    if (!block_id) {
        //  Эта нода не содержит блока. Ничего не делаем.
        return null;
    }

    var block;

    var id = node.getAttribute('id');
    if (id) {
        //  Пытаемся достать блок из кэша по id.
        block = nb.Block._blocks[id];
    } else {
        //  У блока нет атрибута id. Создаем его, генерим уникальный id.
        id = 'nb-' + nb.Block._id++;
        node.setAttribute('id', id);
    }

    if (!block) {
        //  Блока в кэше еще нет.
        //  Создаем экземпляр блока нужного класса и инициализируем его.
        block = nb.Block._blocks[id] = new nb.Block._classes[block_id];

        //  Инициализируем блок.
        block._init(node);
        block.trigger('init');
    }

    return block;
};

//  Метод определяет новый блок (точнее класс):
//
//      nb.define('popup', {
//          events: {
//              'init': 'init',
//              'click .close': 'close',
//              'open': 'open'
//          },
//
//          'init': function() { ... }
//          ...
//      });
//
nb.define = function(name, options) { // FIXME: Сделать миксины.
    var Class = function() {};
    nb.inherit(Class, nb.Block);

    //  Добавляем имя блока (на всякий случай).
    Class.prototype.name = name;

    //  Делим события на DOM и кастомные.
    var events = nb.Block._prepareEvents(options.events);

    //  Добавляем в прототип информацию про DOM-события (в том числе и с уточняющими селекторами),
    //  которые должен ловить блок.
    var domEvents = Class.prototype._domEvents = events.dom;
    //  Добавляем в прототип специальные обработчики для DOM-событий.
    //  Если, например, в блоке есть события `click .foo` и `click .bar`,
    //  то будет добавлен всего один обработчик `click`.
    //  Если у блока вообще нет ничего про `click`, то `click` не будет добавлен вовсе.
    for (var event in domEvents) {
        Class.prototype[event] = nb.Block._eventHandlers[event];
    }
    //  Добавляем в прототип информацию про кастомные события блока.
    //  Они будут забинжены на экземпляр блока при его создании.
    Class.prototype._customEvents = events.custom;
    //  Уже не нужно.
    delete options.events;

    //  Все, что осталось в options -- это дополнительные методы блока.
    nb.extend(Class.prototype, options);

    //  Сохраняем класс в кэше.
    nb.Block._classes[name] = Class;
};

//  Неленивая инициализация.
//  Находим все ноды с классом `_init` и на каждой из них инициализируем блок.
//  По-дефолту ищем ноды во всем документе, но можно передать ноду,
//  внутри которой будет происходить поиск. Полезно для инициализации динамически
//  созданных блоков.
nb.init = function(where) {
    where = where || document;

    var nodes = where.getElementsByClassName('_init');
    for (var i = 0, l = nodes.length; i < l; i++) {
        nb.block( nodes[i] );
    }
};


// ----------------------------------------------------------------------------------------------------------------- //

//  nb.Block
//  --------

nb.Block = function() {};

// ----------------------------------------------------------------------------------------------------------------- //

//  Кэш классов для создания экземпляров блоков.
nb.Block._classes = {};

//  Обработчики DOM-событий. Они добавляются по необходимости в прототип соответствующих классов.
nb.Block._eventHandlers = {};

//  Список всех поддерживаемых DOM-событий.
nb.Block._domEvents = [ 'click', 'dblclick', 'mouseup', 'mousedown', 'keydown', 'keypress', 'keyup' ]; // FIXME: Еще чего-нибудь добавить.
//  Regexp для строк вида `click .foo`.
nb.Block._rx_domEvents = new RegExp( '^(' + nb.Block._domEvents.join('|') + ')\\b\\s*(.*)?$' );

//  Автоинкрементный id для блоков, у которых нет атрибута id.
nb.Block._id = 0;
//  Кэш проинициализированных блоков.
nb.Block._blocks = {};

// ----------------------------------------------------------------------------------------------------------------- //

nb.Block.prototype._init = function(node) {
    this.node = node;
    this._bindCustomEvents();
};

//  Вешаем кастомные (не DOM) события на экземпляр блока.
nb.Block.prototype._bindCustomEvents = function() {
    var that = this;

    var events = this._customEvents;
    for (var event in events) {
        (function(event, handler) {
            //  Если `handler` это строка, то нужно вызывать соответствующий метод блока.
            var method = (typeof handler === 'string') ? that[handler] : handler;

            //  method при это всегда вызывается в контексте that.
            that.on(event, method);
        })( event, events[event] );
    }
};

//  Метод возвращает значение data-атрибута блока.
nb.Block.prototype.data = function(key) {
    return this.node.getAttribute('data-' + key);
};

//  Создаем методы блоков для обработки событий click, ...
//  Эти методы не добавлены в прототип Block сразу, они добавляются в класс,
//  унаследованный от Block только если этот блок подписывается на такое событие.
nb.Block._domEvents.forEach(function(event) {

    nb.Block._eventHandlers[event] = function(e) {
        var blockNode = this.node;
        var node = e.target;

        //  Идем вверх по DOM, проверяем, матчатся ли ноды на какие-нибудь
        //  селекторы из событий блока.
        var events = this._domEvents[event];
        var r;
        while (1) {
            for (var i = 0, l = events.length; i < l; i++) {
                var event_ = events[i];
                var selector = event_.selector;

                //  Проверяем, матчится ли нода на селектор.
                if ( !selector || $(node).is(selector) ) {
                    var handler = event_.handler;
                    if (typeof handler === 'string') {
                        handler = this[handler];
                    }

                    if ( handler.call(this, e, node) === false ) {
                        r = false;
                    }
                }
            }

            //  Если хотя бы один блок вернул false, останавливаемся.
            if (r === false) { return r; }

            //  Дошли до ноды блока, дальше не идем.
            if (node === blockNode) { return; }

            node = node.parentNode;
        }
    };

});

//  Делим события на DOM и кастомные.
//  Селекторы для DOM событий сразу компилируем.
nb.Block._prepareEvents = function(events) {
    events = events || {};

    var dom = {};
    var custom = {};

    for (var event in events) {
        //  Матчим строки вида `click` или `click .foo`.
        var r = nb.Block._rx_domEvents.exec(event);

        if (r) {
            //  Тип DOM-события, например, `click`.
            var type = r[1];
            var typeEvents = dom[type] || (( dom[type] = [] ));

            typeEvents.push({
                selector: r[2] || '',
                handler: events[event]
            });
        } else {
            custom[event] = events[event];
        }
    }

    return {
        dom: dom,
        custom: custom
    };
};

//  Добавляем интерфейс событий ко всем экземплярам блоков.
nb.extend(nb.Block.prototype, nb.Events);

// ----------------------------------------------------------------------------------------------------------------- //

//  Инициализация библиотеки
//  ------------------------

$(function() {
    //  Инициализируем все неленивые блоки.
    nb.init();

    //  Навешиваем на документ обработчики всех событий,
    //  использующихся хоть в каких-нибудь блоках.
    nb.Block._domEvents.forEach(function(event) {
        $(document).on(event, function(e) {
            var node = e.target;

            var block, parent;

            //  Идем вверх по DOM'у и ищем ноды, являющиеся блоками.
            //  Отсутствие parentNode означает, что node === document.
            while (( parent = node.parentNode )) {
                block = nb.block(node);
                if ( block && block[event] ) {
                    var r = block[event](e);
                    //  Если обработчик вернул false, то выше не баблимся.
                    if (r === false) { return r; }
                }
                node = parent;
            }
        });
    });
});

