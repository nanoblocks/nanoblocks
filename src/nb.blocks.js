(function() {

//  ---------------------------------------------------------------------------------------------------------------  //

//  Block
//  --------

//  Базовый класс для блоков. В явном виде не используется.
//  Все реальные блоки наследуются от него при помощи функции `nb.define`.

var Block = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Информация про все объявленные блоки.
var __factories = {};

//  Список всех поддерживаемых DOM-событий.
var __domEvents = [
    'click',
    'dblclick',
    'mouseup',
    'mousedown',
    'keydown',
    'keypress',
    'keyup',
    'mouseenter',
    'mouseleave'
];

//  Regexp для строк вида `click`, `click .foo`.
var __rx_domEvents = new RegExp( '^(' + domEvents.join('|') + ')\\b\\s*(.*)?$' );

//  Автоинкрементный id для блоков, у которых нет атрибута id.
var __id = 0;
//  Кэш проинициализированных блоков.
var __cache = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Приватные методы
//  ----------------

//  Сам конструктор пустой для удобства наследования,
//  поэтому вся реальная инициализация тут.
Block.prototype.__init = function(node) {
    this.node = node;

    //  Обработчики кастомных событий.
    this.__handlers = {};

    //  Развешиваем обработчики кастомных событий.
    this.__bindCustomEvents();
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Вешаем кастомные (не DOM) события на экземпляр блока.
Block.prototype.__bindCustomEvents = function() {
    var that = this;

    var mixinEvents = Factory.get(this.name).events;
    for (var i = 0, l = mixinEvents.length; i < l; i++) {
        var events = mixinEvents[i].custom;

        for (var event in events) {
            (function(handlers) {
                that.__bindCustomEvent(event, function(e, params) {
                    for (var i = handlers.length; i--; ) {
                        //  FIXME: Отдельно обрабатывать результат null.
                        if ( handlers[i].call(that, e, params) === false ) {
                            return false;
                        }
                    }
                });
            })( events[event] )
        }
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Публичные методы и свойства
//  ---------------------------

//  Публичные свойства:
//
//    * `name` -- имя блока (класс, id, ...).
//    * `node` -- html-нода, на которой был проинициализирован блок.

//  Публичные методы у `Block`:
//
//    * `on`, 'off`, `trigger`          -- методы для работы с событиями (кастомными и DOM).
//    * `data`                          -- получает/меняет `data-nb`-атрибуты блока.
//    * `show`, `hide`                  -- показывает/прячет блок.
//    * `getMod`, 'setMod`, 'delMod`    -- методы для работы с модификаторами.

//  ---------------------------------------------------------------------------------------------------------------  //

//  Работа с событиями
//  ------------------

//  Возвращает список обработчиков события name.
//  Если еще ни одного обработчика не забинжено, возвращает (и сохраняет) пустой список.
Block.prototype__getHandlers = function(name) {
    var handlers = this.__handlers;

    return handlers[name] || (( handlers[name] = [] ));
};

//  Подписываем обработчик handler на событие name.
Block.prototype.on = function(name, handler) {
    var r = __rx_domEvents.exec(name);
    if (r) {
        //  DOM-событие.
        this.__bindDOMEvent( r[1], r[2] || '', handler );
    } else {
        //  Кастомное событие.
        this.__bindCustomEvent(name, handler);
    }

    return handler;
};

Block.prototype.__bindCustomEvent = function(name, handler) {
    this.__getHandlers(name).push(handler);
};

Block.prototype.__bindDOMEvent = function(type, selector, handler) {
    $(this.node).on(type, selector, handler);
};

//  Отписываем обработчик handler от события name.
//  Если не передать handler, то удалятся вообще все обработчики события name.
Block.prototype.off = function(name, handler) {
    var r = __rx_domEvents.exec(name);
    if (r) {
        //  DOM-событие.
        $(this.node).off( r[1], r[2] || '', handler );

    } else {
        //  Кастомное событие.
        if (handler) {
            var handlers = this.__getHandlers(name);
            //  Ищем этот хэндлер среди уже забинженных обработчиков этого события.
            var i = handlers.indexOf(handler);

            //  Нашли и удаляем этот обработчик.
            if (i !== -1) {
                handlers.splice(i, 1);
            }
        } else {
            //  Удаляем всех обработчиков этого события.
            this.__handlers[name] = null;
        }

    }
};

//  "Генерим" событие name. Т.е. вызываем по очереди (в порядке подписки) все обработчики события name.
//  В каждый передаем name и params.
Block.prototype.trigger = function(name, params) {
    // Копируем список хэндлеров. Если вдруг внутри какого-то обработчика будет вызван off(),
    // то мы не потеряем вызов следующего обработчика.
    var handlers = this.__getHandlers(name).slice();

    for (var i = 0, l = handlers.length; i < l; i++) {
        //  Вызываем обработчик в контексте this.
        handlers[i].call(this, name, params);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Метод возвращает или устанавливает значение data-атрибута блока.
//  Блок имеет доступ (через этот метод) только к data-атрибутам с префиксом `nb-`.
//  Как следствие, атрибут `data-nb` недоступен -- он определяет тип блока
//  и менять его не рекомендуется в любом случае.
//
//  Если вызвать метод без аргументов, то он вернет объект со всеми data-атрибутами.
//
Block.prototype.data = function(key, value) {
    return nb.node.data(this.node, key, value);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Показываем блок.
Block.prototype.show = function() {
    $(this.node).removeClass('_hidden');
};

//  Прячем блок.
Block.prototype.hide = function() {
    $(this.node).addClass('_hidden');
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Работа с модификаторами
//  -----------------------

//  Получить модификатор.
Block.prototype.getMod = function(name) {
    return nb.node.setMod(this.node, name);
};

//  Установить модификатор.
Block.prototype.setMod = function(name, value) {
    nb.node.setMod(this.node, name, value);
};

//  Удалить модификатор.
Block.prototype.delMod = function(name) {
    nb.node.setMod(this.node, name, false);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Factory
//  -------

var Factory = function(ctor, events) {
    this.ctor = ctor;
    this._prepareEvents(events);
};

Factory.prototype.create = function(node) {
    return new this.ctor(node);
};

//  Наследуем события.
//  В структуре с событиями (`block.__events`) есть куски:
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
Factory.prototype._extendEvents = function(base) {
    //  Это всегда "простой" класс, так что всегда берем нулевой элемент.
    var t_dom = this.events[0].dom;
    var b_dom = base.events[0].dom;

    //  Конкатим обработчики DOM-событий.
    for (var event in b_dom) {
        var b_selectors = b_dom[event];
        var t_selectors = t_dom[event] || (( t_dom[event] = {} ));

        for (var selector in b_selectors) {
            var b_handlers = b_selectors[selector];
            var t_handlers = t_selectors[selector] || [];
            t_selectors[selector] = b_handlers.concat(t_handlers);
        }
    }

    var t_custom = this.events[0].custom;
    var b_custom = base.events[0].custom;

    //  И обработчики кастомных событий.
    for (var event in b_custom) {
        var b_handlers = b_custom[event];
        var t_handlers = t_custom[event] || [];
        t_custom[event] = b_handlers.concat(t_handlers);
    }
};


//  Делим события на DOM и кастомные и создаем объект,
//  в котором хранится информация про события и их обработчики.
//  В каждом блоке (а точнее в прототипе класса) есть свойство `__events`
//  с примерно такой структурой:
//
//      [
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
Factory.prototype._prepareEvents = function(events) {
    events = events || {};

    var proto = this.ctor.prototype;

    //  Делим события на DOM и кастомные.
    var dom = {};
    var custom = {};

    for (var event in events) {
        //  Проверяем, нет ли в event префикса !. Например, '! click .foo'.
        var r = /^!\s*(.*)/.exec(event);
        var important = !!r;
        if (r) {
            event = r[1];
        }

        //  Матчим строки вида `click` или `click .foo`.
        r = __rx_domEvents.exec(event);

        var handler = events[event];
        if (typeof handler === 'string') {
            handler = proto[handler];
        }

        var handlers;
        if (r) {
            //  Тип DOM-события, например, `click`.
            var type = r[1];
            var selector = r[2] || '';

            var typeEvents = dom[type] || (( dom[type] = {} ));
            handlers = ( !important && typeEvents[selector] ) || (( typeEvents[selector] = [] ));
        } else {
            handlers = ( !important && custom[event] ) || (( custom[event] = [] ));
        }

        handlers.push(handler);
    }

    this.events = [
        {
            dom: dom,
            custom: custom
        }
    ];

};

Factory.prototype._onevent = function(event, e) {
    var blockNode = this.node;
    var node = e.target;

    //  Для каждого миксина ищем подходящий обработчик.
    var mixinEvents = this.__events;
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

//  Достаем класс по имени.
//  Имя может быть "простым" -- это классы, которые определены через `nb.define`.
//  Или "сложным" -- несколько простых классов через пробел (микс нескольких блоков).
Factory.get = function(name) {
    //  Смотрим в кэше.
    var factory = __factories[name];

    //  В кэше нет, это будет "сложный" класс, т.к. все простые точно в кэше есть.
    if (!factory) {
        //  Пустой класс.
        var ctor = function() {};

        var events = [];

        var names = name.trim().split(/\s+/);
        for (var i = 0, l = names.length; i < l; i++) {
            //  Примиксовываем все "простые" классы.
            var mixin = getFactory( names[i] );
            nb.inherit(ctor, mixin.ctor);

            //  FIXME: А что будет с super_?
            //  ctor.prototype.super_ = Block ?

            //  Собираем массив из структур с событиями.
            //  `mixin.events[0]` -- здесь `0` потому, что у "простых" классов там всегда один элемент.
            events.push( mixin.events[0] );
        }

        factory = new Factory(name, ctor);
        factory.events = events;
    }

    return factory;
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
        block = cache[id];
    } else {
        //  У блока нет атрибута id. Создаем его, генерим уникальный id.
        id = 'nb-' + __id++;
        node.setAttribute('id', id);
    }

    if (!block) {
        //  Блока в кэше еще нет.
        //  Создаем экземпляр блока нужного класса и инициализируем его.
        var Class = Block.__getClass(block_id);
        block = cache[id] = new Class;

        //  Инициализируем блок.
        block.__init(node);
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
nb.define = function(name, methods, base) {
    if (base) {
        base = Factory.get(base);
    }

    //  Вытаскиваем из `methods` информацию про события.
    var events = methods.events;
    delete methods.events;

    //  "Пустой" конструктор.
    var ctor = function() {};
    //  Наследуемся либо от дефолтного конструктора, либо от указанного базового.
    nb.inherit(ctor, (base) ? base.ctor : Block );
    //  Все, что осталось в methods -- это дополнительные методы блока.
    nb.extend(ctor.prototype, methods);
    //  Иногда полезно знать, что же это за блок.
    ctor.prototype.name = name;

    var factory = new Factory(ctor, events);

    //  Если указан базовый блок, нужно "склеить" события.
    if (base) {
        factory._extendEvents(base);
    }

    //  Сохраняем для дальнейшего применения.
    //  Достать нужную factory можно вызовом Factory.get(name).
    __factories[name] = factory;

    return factory;
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

})();

//  ---------------------------------------------------------------------------------------------------------------  //

//  Инициализация библиотеки
//  ------------------------

//  Навешиваем на документ обработчики всех DOM-событий.
//  NOTE: Поскольку события вешаем на document, то не нужно ждать domReady.
domEvents.forEach(function(event) {
    //  Ловим события только на блоках, для чего передаем селектор .nb.
    $(document).on(event, '.nb', function(e) {
        var node = e.currentTarget;

        var name = node.getAttribute('data-nb');
        if (!name) { return; }

        var factory = Factory.get(name);
        return factory.__onevent(event, node);
    });
});

$(function() {
    //  Инициализируем все неленивые блоки.
    nb.block.init();
});

