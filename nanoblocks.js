//  nanoblocks
//  ==========

var nb = {};

//  ---------------------------------------------------------------------------------------------------------------  //

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
    child.prototype.super = parent.prototype;
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


//  ---------------------------------------------------------------------------------------------------------------  //

//  Префиксы
//  --------
//
//  Поскольку предполагается, что блоки будут смешиваться (например, `nb.Events` подмешивается во все `nb.Block`),
//  то приватные методы и свойства отдельных классов будет называть со специальными префиксами.
//  Для `nb.Events`, например, это `__E_`, для `nb.Block` -- `__B_`.
//  Так как у блоков унаследованных от `nb.Block` могут быть свои приватные методы, то используем `__`, а не `_`.


//  ---------------------------------------------------------------------------------------------------------------  //

//  nb.Events
//  ---------

//  Простейший pub/sub.
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
nb.Events.__E_getHandlers = function(name) {
    var handlers = this.__E_handlers || (( this.__E_handlers = {} ));

    return handlers[name] || (( handlers[name] = [] ));
};

//  Подписываем обработчик handler на событие name.
nb.Events.on = function(name, handler) {
    var handlers = this.__E_getHandlers(name);

    handlers.push(handler);

    return handler;
};

//  Отписываем обработчик handler от события name.
//  Если не передать handler, то удалятся вообще все обработчики события name.
nb.Events.off = function(name, handler) {
    if (handler) {
        var handlers = this.__E_getHandlers(name);
        //  Ищем этот хэндлер среди уже забинженных обработчиков этого события.
        var i = handlers.indexOf(handler);

        //  Нашли и удаляем этот обработчик.
        if (i !== -1) {
            handlers.splice(i, 1);
        }
    } else {
        //  Удаляем всех обработчиков этого события.
        var handlers = this.__E_handlers;
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
    var handlers = this.__E_getHandlers(name).slice();

    for (var i = 0, l = handlers.length; i < l; i++) {
        //  Вызываем обработчик в контексте this.
        handlers[i].call(this, name, params);
    }
};

//  Общий канал для общения, не привязанный к конкретным экземплярам блоков.
nb.extend(nb, nb.Events);


//  ---------------------------------------------------------------------------------------------------------------  //

//  nb.Block
//  --------

//  Базовый класс для блоков. В явном виде не используется.
//  Все реальные блоки наследуются от него при помощи функции `nb.define`.

nb.Block = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Кэш классов для создания экземпляров блоков.
nb.Block.__B_classes = {};

//  Обработчики DOM-событий. Они добавляются по необходимости в прототип соответствующих классов.
nb.Block.__B_eventHandlers = {};

//  Список всех поддерживаемых DOM-событий.
nb.Block.__B_domEvents = [ 'click', 'dblclick', 'mouseup', 'mousedown', 'keydown', 'keypress', 'keyup', 'focusin' ]; // FIXME: Еще чего-нибудь добавить.
//  Regexp для строк вида `click .foo`.
nb.Block.__B_rx_domEvents = new RegExp( '^(' + nb.Block.__B_domEvents.join('|') + ')\\b\\s*(.*)?$' );

//  Автоинкрементный id для блоков, у которых нет атрибута id.
nb.Block.__B_id = 0;
//  Кэш проинициализированных блоков.
nb.Block.__B_cache = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Публичные методы
//  ----------------

//  Публичные методы у `nb.Block` следующие:
//
//    * `on`, 'off`, `trigger` -- миксин от `nb.Events`;
//    * `data` -- получает/меняет `data-nb`-атрибуты блока.
//    * `show`, `hide` -- показывает/прячет блок.
//    * `getMod`, 'setMod`, 'delMod` -- методы для работы с модификаторами.


//  Метод возвращает или устанавливает значение data-атрибута блока.
//  Блок имеет доступ (через этот метод) только к data-атрибутам с префиксом `nb-`.
//  Как следствие, атрибут `data-nb` недоступен -- он определяет тип блока
//  и менять его не рекомендуется в любом случае.
nb.Block.prototype.data = function(key, value) {
    if (value !== undefined) {
        this.node.setAttribute('data-nb-' + key, value);
    } else {
        return this.node.getAttribute('data-nb-' + key);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Показываем блок.
nb.Block.prototype.show = function() {
    $(this.node).removeClass('_hidden');
};

//  Прячем блок.
nb.Block.prototype.hide = function() {
    $(this.node).addClass('_hidden');
};

//  ---------------------------------------------------------------------------------------------------------------  //

// FIXME: Сделать отдельные методы, работающие с нодами, а не с блоками.

//  Получить модификатор.
nb.Block.prototype.getMod = function(name) {
    return this.setMod(name);
};

//  Установить модификатор.
nb.Block.prototype.setMod = function(name, value) {
    var rx = new RegExp('(?:^|\\s+)' + name + '_([\\w-]+)'); // FIXME: Кэшировать regexp?

    var className = this.node.className;
    if (value === undefined) {
        // getMod
        var r = rx.exec(className);
        return (r) ? r[1] : '';
    } else {
        // delMod
        className = className.replace(rx, '').trim();
        if (value !== null) {
            // setMod
            className += ' ' + name + '_' + value;
        }
        this.node.className = className;
    }
};

//  Удалить модификатор.
nb.Block.prototype.delMod = function(name) {
    this.setMod(name, null);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Добавляем интерфейс событий ко всем экземплярам блоков.
nb.extend(nb.Block.prototype, nb.Events);


//  ---------------------------------------------------------------------------------------------------------------  //

//  Приватные методы
//  ----------------

//  Сам конструктор пустой для удобства наследования,
//  поэтому вся реальная инициализация тут.
nb.Block.prototype.__B_init = function(node) {
    this.node = node;
    this.__B_bindCustomEvents();
};

//  Вешаем кастомные (не DOM) события на экземпляр блока.
nb.Block.prototype.__B_bindCustomEvents = function() {
    var that = this;

    var mixinEvents = this.__B_events;
    for (var i = 0, l = mixinEvents.length; i < l; i++) {
        var events = mixinEvents[i].custom;

        for (var event in events) {
            (function(handlers) {
                that.on(event, function(e, params) {
                    for (var i = handlers.length; i--; ) {
                        if ( handlers[i].call(that, e, params) === false ) {
                            return false;
                        }
                    }
                });
            })( events[event] )
        }
    }
};

//  Создаем методы блоков для обработки событий click, ...
//  Эти методы не добавлены в прототип Block сразу, они добавляются в класс,
//  унаследованный от Block только если этот блок подписывается на такое событие.
nb.Block.__B_domEvents.forEach(function(event) {

    nb.Block.__B_eventHandlers[event] = function(e) {
        var blockNode = this.node;
        var node = e.target;

        //  Для каждого миксина ищем подходящий обработчик.
        var mixinEvents = this.__B_events;
        var r;
        for (var i = 0, l = mixinEvents.length; i < l; i++) {
            var events = mixinEvents[i].dom[event];

            //  Идем вверх по DOM, проверяем, матчатся ли ноды на какие-нибудь
            //  селекторы из событий блока.
            while (1) {
                for (var selector in events) {

                    //  Проверяем, матчится ли нода на селектор.
                    //  FIXME: Случай node === blockNode нужно вынести из цикла совсем.
                    var matches = (node === blockNode) ?
                        //  Либо это нода блока и тогда нужно, чтобы селектора не было.
                        !selector :
                        //  Либо это внутрення нода (нода элемента), есть селектор и нода соответствуют селектору.
                        selector && $(node).is(selector);

                    if (matches) {
                        //  Если событие с селектором, то передаем в обработчик ту ноду,
                        //  которая на самом деле матчится на селектор.
                        //  В противном случае, передаем ноду всего блока.
                        var eventNode = (selector) ? node : blockNode;

                        //  В `handlers` лежит цепочка обработчиков этого события.
                        //  Самый последний обработчик -- это обработчик собственно этого блока.
                        //  Перед ним -- обработчик предка и т.д.
                        //  Если в `nb.define` не был указан базовый блок, то длина цепочки равна 1.
                        var handlers = events[selector];
                        for (var j = handlers.length; j--; ) {
                            if ( handlers[j].call(this, e, eventNode) === false ) {
                                //  Обработчик вернул `false`, значит оставшиеся обработчики не вызываем.
                                r = false;
                                break;
                            }
                        }
                    }
                }

                //  Если хотя бы один блок вернул false или же мы дошли до ноды блока, останавливаемся.
                if (r === false || node === blockNode) { break; }

                node = node.parentNode;
            }
        }

        //  Хотя бы один обработчик вернул false. Дальше вверх по DOM'у не баблимся.
        if (r === false) {
            return false;
        }
    };

});

//  Делим события на DOM и кастомные и создаем объект,
//  в котором хранится информация про события и их обработчики.
//  В каждом блоке (а точнее в прототипе класса) есть свойство `__B_events`
//  с примерно такой структурой:
//
//      block.__B_events = [
//          //  Каждый элемент в этом массиве -- это миксин.
//          //  Т.е. для каждого класса, указанного в data-nb,
//          //  в этот массив добавляется такой объект:
//          {
//              //  DOM-события.
//              dom: {
//                  //  Тип DOM-события.
//                  click: {
//                      //  Селектор DOM-события (может быть пустой строкой).
//                      '': [
//                          Этот массив -- это обработчики для блока и его предков.
//                          handler1,
//                          handler2,
//                          ...
//                      ],
//                      '.close': [ handler3 ],
//                      ...
//                  },
//                  ...
//              },
//              //  Кастомные события.
//              custom: {
//                  'open': [ handler4, handler5 ],
//                  ...
//              }
//          },
//          {
//              dom: {
//                  ...
//              },
//              custom: {
//                  ...
//              }
//          },
//          ...
//      ];
//
nb.Block.__B_prepareEvents = function(events, Class) {
    events = events || {};

    var proto = Class.prototype;

    //  Делим события на DOM и кастомные.
    var domEvents = {};
    var customEvents = {};

    for (var event in events) {
        //  Матчим строки вида `click` или `click .foo`.
        var r = nb.Block.__B_rx_domEvents.exec(event);

        var handler = events[event];
        if (typeof handler === 'string') {
            handler = proto[handler];
        }

        var handlers;
        if (r) {
            //  Тип DOM-события, например, `click`.
            var type = r[1];
            var selector = r[2] || '';

            var typeEvents = domEvents[type] || (( domEvents[type] = {} ));
            handlers = typeEvents[selector] || (( typeEvents[selector] = [] ));
        } else {
            handlers = customEvents[event] || (( customEvents[event] = [] ));
        }
        handlers.push(handler);
    }

    //  Добавляем в прототип информацию про события, которые должен ловить блок.
    //  DOM-события (в том числе и с уточняющими селекторами) и кастомные события блока.
    var blockEvents = proto.__B_events || (( proto.__B_events = [] ));
    blockEvents.push({
        dom: domEvents,
        custom: customEvents
    });

    //  Добавляем в прототип специальные обработчики для DOM-событий.
    //  Если, например, в блоке есть события `click .foo` и `click .bar`,
    //  то будет добавлен всего один обработчик `click`.
    //  Если у блока вообще нет ничего про `click`, то `click` не будет добавлен вовсе.
    for (var event in domEvents) {
        proto['__B_on' + event] = nb.Block.__B_eventHandlers[event];
    }
};

//  Наследуем события.
//  В структуре с событиями (`block.__B_events`) есть куски:
//
//      {
//          dom: {
//              'click': {
//                  '.foo': [ .... ] // handlers
//                  ...
//
//  и
//
//      {
//          custom: {
//              'init': [ ... ] // handlers
//
//  Этот метод конкатит вот эти массивы с обработчиками событий.
//
//  FIXME: Нужен еще метод для добавления событий в экземпляр блока.
//
nb.Block.__B_inheritEvents = function(child, parent) {
    //  Это всегда "простой" класс, так что всегда берем нулевой элемент.
    var p_dom = parent[0].dom;
    var c_dom = child[0].dom;
    var p_custom = parent[0].custom;
    var c_custom = child[0].custom;

    //  Конкатим обработчики DOM-событий.
    for (var event in p_dom) {
        var p_selectors = p_dom[event];
        var c_selectors = c_dom[event] || (( c_dom[event] = {} ));

        for (var selector in p_selectors) {
            var p_handlers = p_selectors[selector];
            var c_handlers = c_selectors[selector] || [];
            c_selectors[selector] = p_handlers.concat(c_handlers);
        }
    }

    //  И обработчики кастомных событий.
    for (var event in p_custom) {
        var p_handlers = p_custom[event];
        var c_handlers = c_handlers[event] || [];
        c_custom[event] = p_handlers.concat(c_handlers);
    }
};

//  Достаем класс по имени.
//  Имя может быть "простым" -- это классы, которые определены через `nb.define`.
//  Или "сложным" -- несколько простых классов через пробел (микс нескольких блоков).
nb.Block.__B_getClass = function(name) {
    //  Смотрим в кэше.
    var Class = nb.Block.__B_classes[name];

    //  В кэше нет, это будет "сложный" класс, т.к. все простые точно в кэше есть.
    if (!Class) {
        //  Пустой класс.
        var Class = function() {};

        var events = [];

        var names = name.trim().split(/\s+/);
        for (var i = 0, l = names.length; i < l; i++) {
            //  Примиксовываем все "простые" классы.
            var Mixin = nb.Block.__B_classes[ names[i] ];
            nb.inherit(Class, Mixin);

            //  Собираем массив из структур с событиями.
            //  `__B_events[0]` -- здесь `0` потому, что у "простых" классов там всегда один элемент.
            events.push( Mixin.prototype.__B_events[0] );
        }

        //  Выставляем смиксованные события.
        Class.prototype.__B_events = events;
    }

    return Class;
};

//  ---------------------------------------------------------------------------------------------------------------  //

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
        block = nb.Block.__B_cache[id];
    } else {
        //  У блока нет атрибута id. Создаем его, генерим уникальный id.
        id = 'nb-' + nb.Block.__B_id++;
        node.setAttribute('id', id);
    }

    if (!block) {
        //  Блока в кэше еще нет.
        //  Создаем экземпляр блока нужного класса и инициализируем его.
        var Class = nb.Block.__B_getClass(block_id);
        block = nb.Block.__B_cache[id] = new Class;

        //  Инициализируем блок.
        block.__B_init(node);
        block.trigger('init');
    }

    return block;
};

//  Метод определяет новый блок (точнее класс):
//
//      nb.define('popup', {
//          //  События, на которые реагирует блок.
//          events: {
//              'click': 'onclick',         //  DOM-событие.
//              'click .close': 'onclose',  //  DOM-событие с уточняющим селектором.
//              'open': 'onopen',           //  Кастомное событие.
//              'close': 'onclose',
//              ...
//          },
//
//          //  Дополнительные методы блока.
//          'onclick': function() { ... },
//          ...
//      });
//
nb.define = function(name, options, base) {
    //  Наследуем пустой класс от `nb.Block`.
    var Class = function() {};
    nb.inherit(Class, nb.Block);

    //  Вытаскиваем из `options` информацию про события.
    var events = options.events;
    delete options.events;

    var Parent;
    if (base) {
        //  Если задан базовый класс, наследуемся и от него.
        Parent = nb.Block.__B_classes[base];
        nb.extend(Class.prototype, Parent.prototype);

        //  Выкидываем это свойство, т.к. оно будет мешаться ниже, в `__B_inheritEvents()`.
        delete Class.prototype['__B_events'];
    }

    //  Все, что осталось в options -- это дополнительные методы блока.
    nb.extend(Class.prototype, options);

    //  Сохраняем в `Class` информацию про события (в поле `__B_events`).
    nb.Block.__B_prepareEvents(events, Class);

    if (base) {
        //  Если задан базовый класс, то еще и наследуем события от него.
        nb.Block.__B_inheritEvents(Class.prototype.__B_events, Parent.prototype.__B_events);
    }

    //  Сохраняем класс в кэше.
    nb.Block.__B_classes[name] = Class;
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

//  Находим ноду по ее id, создаем на ней блок и возвращаем его.
nb.find = function(id) {
    var node = document.getElementById(id);
    if (node) {
        return nb.block(node);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Инициализация библиотеки
//  ------------------------

$(function() {
    //  Инициализируем все неленивые блоки.
    nb.init();

    //  Навешиваем на документ обработчики всех событий,
    //  использующихся хоть в каких-нибудь блоках.
    nb.Block.__B_domEvents.forEach(function(event) {
        $(document).on(event, function(e) {
            var node = e.target;

            var block, parent;

            //  Идем вверх по DOM'у и ищем ноды, являющиеся блоками.
            //  Отсутствие parentNode означает, что node === document.
            while (( parent = node.parentNode )) {
                //  Пытаемся создать блок на ноде.
                block = nb.block(node);
                if (block) {
                    //  Проверяем, что у блока есть обработчик соответствующего события.
                    var method = '__B_on' + event;
                    if  ( block[method] ) {
                        if ( block[method](e) === false ) {
                            //  Если обработчик вернул false, то выше не баблимся.
                            return false;
                        }
                    }
                }
                node = parent;
            }
        });
    });
});

