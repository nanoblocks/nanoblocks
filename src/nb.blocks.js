(function() {

//  ---------------------------------------------------------------------------------------------------------------  //

//  Block
//  --------

//  Базовый класс для блоков. В явном виде не используется.
//  Все реальные блоки наследуются от него при помощи функции `nb.define`.

var Block = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Информация про все объявленные блоки.
var _factories = {};

//  Список всех повешенных на document событий.
var _docEvents = {};

//  Список всех поддерживаемых DOM-событий.
var _domEvents = [
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
var _rx_domEvents = new RegExp( '^(' + _domEvents.join('|') + ')\\b\\s*(.*)?$' );

//  Автоинкрементный id для блоков, у которых нет атрибута id.
var _id = 0;
//  Кэш проинициализированных блоков.
var _cache = {};

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
    this.__bindEvents();

    this.trigger('init');

    //  Отправляем в "космос" сообщение, что блок проинициализирован.
    //  Проверка nb.root нужна для того, чтобы при создании самого nb.root не происходило ошибки.
    if (nb.root) {
        nb.root.trigger('inited:' + this.id, this);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Вешаем кастомные (не DOM) события на экземпляр блока.
Block.prototype.__bindEvents = function() {
    var that = this;

    var mixinEvents = Factory.get(this.name).events;
    for (var i = 0, l = mixinEvents.length; i < l; i++) {
        var events = mixinEvents[i].custom;

        for (var event in events) {
            (function(handlers) {
                that.__bindCustomEvent(event, function(e, params) {
                    for (var i = handlers.length; i--; ) {
                        var r = handlers[i].call(that, e, params);
                        //  false означает, что нужно прекратить обработку и не баблиться дальше,
                        //  а null -- что просто прекратить обработку.
                        if (r === false || r === null) { return r; }
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
Block.prototype.__getHandlers = function(name) {
    var handlers = this.__handlers;

    return handlers[name] || (( handlers[name] = [] ));
};

//  Подписываем обработчик handler на событие name.
Block.prototype.on = function(name, handler) {
    if (typeof name === 'string') {
        //  Вешаем только одно событие.

        var r = _rx_domEvents.exec(name);
        if (r) {
            //  DOM-событие.
            $(this.node).on( r[1], r[2] || '', handler );
        } else {
            //  Кастомное событие.
            this.__bindCustomEvent(name, handler);
        }

        return handler;
    }

    //  В этом случае name -- это объект, т.е. вешаем несколько событий сразу.
    for (var event in name) {
        this.on( event, name[event] );
    }
};

Block.prototype.__bindCustomEvent = function(name, handler) {
    this.__getHandlers(name).push(handler);
};

//  Отписываем обработчик handler от события name.
//  Если не передать handler, то удалятся вообще все обработчики события name.
Block.prototype.off = function(name, handler) {
    if (typeof name === 'string') {
        //  Отписываем одно событие.

        var r = _rx_domEvents.exec(name);
        if (r) {
            //  DOM-событие.
            $(this.node).off( r[1], r[2] || '', handler );

        } else {
            if (handler) {
                //  Кастомное событие.

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

    } else {
        //  event -- это объект, т.е. отписываем сразу несколько событий.

        for (var event in name) {
            this.off(event, name[event]);
        }

    }
};

//  "Генерим" событие name. Т.е. вызываем по очереди (в порядке подписки) все обработчики события name.
//  В каждый передаем name и params.
Block.prototype.trigger = function(name, params) {
    //  Копируем список хэндлеров. Если вдруг внутри какого-то обработчика будет вызван off(),
    //  то мы не потеряем вызов следующего обработчика.
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

Block.prototype.children = function() {
    var children = [];

    var nodes = this.node.getElementsByClassName('nb');
    for (var i = 0, l = nodes.length; i < l; i++) {
        var block = nb.block( nodes[i] );
        if (block) { children.push(block); }
    }

    return children;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Factory
//  -------

var Factory = function(name, ctor, events) {
    this.name = name;

    ctor.prototype.name = name;
    ctor.prototype.factory = this;
    this.ctor = ctor;

    this.events = (events instanceof Array) ? events : this._prepareEvents(events);
};

//  ---------------------------------------------------------------------------------------------------------------  //

Factory.prototype.create = function(node, events) {
    var block;

    var id = node.getAttribute('id');
    if (id) {
        //  Пытаемся достать блок из кэша по id.
        block = _cache[id];
    } else {
        //  У блока нет атрибута id. Создаем его, генерим уникальный id.
        id = 'nb-' + _id++;
        node.setAttribute('id', id);
    }

    if (!block) {
        block = new this.ctor(node);

        //  Инициализируем блок.
        block.__init(node);

        if (events) {
            block.on(events);
        }

        _cache[id] = block;
    }

    return block;
};

//  ---------------------------------------------------------------------------------------------------------------  //

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
            var t_handlers = t_selectors[selector];

            t_selectors[selector] = (t_handlers === null) ? [] : b_handlers.concat( t_handlers || [] );
        }
    }

    var t_custom = this.events[0].custom;
    var b_custom = base.events[0].custom;

    //  И обработчики кастомных событий.
    for (var event in b_custom) {
        var b_handlers = b_custom[event];
        var t_handlers = t_custom[event];

        t_custom[event] = (t_handlers === null) ? [] : b_handlers.concat( t_handlers || [] );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Делим события на DOM и кастомные и создаем объект,
//  в котором хранится информация про события и их обработчики,
//  с примерно такой структурой:
//
//      {
//          //  DOM-события.
//          dom: {
//              //  Тип DOM-события.
//              click: {
//                  //  Селектор DOM-события (может быть пустой строкой).
//                  '': [
//                      //  Этот массив -- это обработчики для блока и его предков.
//                      //  Для "простых" блоков (без наследования), в массиве всегда один хэндлер.
//                      handler1,
//                      handler2,
//                      ...
//                  ],
//                  '.close': [ handler3 ],
//                  ...
//              },
//              ...
//          },
//          //  Кастомные события.
//          custom: {
//              'open': [ handler4, handler5 ],
//              ...
//          }
//      }
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
        r = _rx_domEvents.exec(event);
        var handlers, key;
        if (r) {
            //  Тип DOM-события, например, `click`.
            var type = r[1];

            handlers = dom[type] || (( dom[type] = {} ));
            //  Селектор.
            key = r[2] || '';

        } else {
            handlers = custom;
            key = event;
        }

        var handler = events[event];
        if (typeof handler === 'string') {
            handler = proto[handler];
        }
        if (handler === null) {
            //  Особый случай, бывает только при наследовании блоков.
            //  null означает, что нужно игнорировать родительские обработчики события.
            handlers[key] = null;
        } else {
            handlers = ( !important && handlers[key] ) || (( handlers[key] = [] ));
            handlers.push(handler);
        }

    }

    for (var type in dom) {
        if (!_docEvents[type]) {

            (function(type) {
                //  FIXME: Для большинства событий (click, ...) не нужен селектор,
                //  он нужен только для mouseenter/mouseleave.

                //  Ловим события только на блоках, для чего передаем селектор .nb.
                //  $(document).on(type, '.nb', function(e) {
                //      var node = e.currentTarget;

                $(document).on(type, function(e) {
                    var node = e.target;

                    var name = node.getAttribute('data-nb');
                    if (!name) { return; }

                    var factory = Factory.get(name);
                    return Factory._onevent(type, e);
                });
            })(type);

            _docEvents[type] = true;
        }
    }

    return [
        {
            dom: dom,
            custom: custom
        }
    ];

};

//  ---------------------------------------------------------------------------------------------------------------  //

//  FIXME: Сейчас неправильно отрабатывается ситуация, когда, скажем, click пришелся в блок,
//  который его обрабатывает, но не останавливает баблинг. Нужно, чтобы процесс шел выше по DOM'у
//  и искал следующий вышележащий блок.
Factory._onevent = function(type, e) {
    var node = e.target;

    var R;

    while (1) {
        var nodes = [];
        var blockNode = null;
        var name;
        var parent;

        while (( parent = node.parentNode )) {
            nodes.push(node);
            if (( name = node.getAttribute('data-nb') )) {
                blockNode = node;
                break;
            }
            node = parent;
        }

        if (!blockNode) { break; }

        var n = nodes.length;

        var factory = Factory.get(name);
        var mixinEvents = factory.events;

        var block;

        for (var i = 0, l = mixinEvents.length; i < l; i++) {
            var events = mixinEvents[i].dom[type];
            if (!events) {
                continue;
            }

            var matched = [];

            //  Идем вверх по DOM, проверяем, матчатся ли ноды на какие-нибудь
            //  селекторы из событий блока.
            for (var j = 0; j < n; j++) {
                node = nodes[j];

                if (node === blockNode) {
                    var handlers = events[''];
                    if (handlers) {
                        matched.push({
                            handlers: handlers,
                            node: node
                        });
                    }

                } else {

                    //  FIXME: Вынести из внешнего цикла.
                    var $node = $(node);

                    for (var selector in events) {
                        //  Проверяем, матчится ли нода на селектор.
                        if ( selector && $node.is(selector) ) {
                            matched.push({
                                handlers: events[selector],
                                node: node
                            });
                        }
                    }
                }
            }

            if (matched.length) {
                //  Для каждого миксина ищем подходящий обработчик.

                block = block || factory.create(blockNode);

                var r;
                for (var j = 0, k = matched.length; j < k; j++) {
                    var item = matched[j];

                    //  В `handlers` лежит цепочка обработчиков этого события.
                    //  Самый последний обработчик -- это обработчик собственно этого блока.
                    //  Перед ним -- обработчик предка и т.д.
                    //  Если в `nb.define` не был указан базовый блок, то длина цепочки равна 1.
                    var handlers = item.handlers;
                    for (var p = handlers.length; p--; ) {
                        if ( handlers[p].call(block, e, item.node) === false ) {
                            //  Обработчик вернул `false`, значит оставшиеся обработчики не вызываем.
                            r = false;
                            break;
                        }
                    }

                    //  Хотя бы один обработчик вернул false. Дальше вверх по DOM'у не баблимся.
                    if (r === false) {
                        R = r;
                        break;
                    }
                }
            }
        }

        node = node.parentNode;

    }

    if (R === false) { return R; }

};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Достаем класс по имени.
//  Имя может быть "простым" -- это классы, которые определены через `nb.define`.
//  Или "сложным" -- несколько простых классов через пробел (микс нескольких блоков).
Factory.get = function(name) {
    //  Смотрим в кэше.
    var factory = _factories[name];

    //  В кэше нет, это будет "сложный" класс, т.к. все простые точно в кэше есть.
    if (!factory) {
        //  Пустой класс.
        var ctor = function() {};

        var events = [];

        var names = name.split(/\s+/);
        for (var i = 0, l = names.length; i < l; i++) {
            //  Примиксовываем все "простые" классы.
            var mixin = Factory.get( names[i] );
            nb.inherit(ctor, mixin.ctor);

            //  FIXME: А что будет с super_?
            //  Ответ. Будет ерунда. Чтобы эту ерунду замечать вовремя, напишем пока null.
            ctor.prototype.super_ = null;

            //  Собираем массив из структур с событиями.
            //  `mixin.events[0]` -- здесь `0` потому, что у "простых" классов там всегда один элемент.
            events.push( mixin.events[0] );
        }

        factory = new Factory(name, ctor, events);

        _factories[name] = factory;
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
nb.block = function(node, name, events) {
    if (name && typeof name !== 'string') {
        events = name;
        name = null;
    }

    name = name || node.getAttribute('data-nb');
    if (!name) {
        //  Эта нода не содержит блока. Ничего не делаем.
        return null;
    }

    return Factory.get(name).create(node, events);
};

//  Находим ноду по ее id, создаем на ней блок и возвращаем его.
nb.find = function(id) {
    var node = document.getElementById(id);
    if (node) {
        return nb.block(node);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

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
    if (typeof name !== 'string') {
        //  Анонимный блок.

        //  Сдвигаем параметры.
        base = methods;
        methods = name;
        //  Генерим ему уникальное имя.
        name = 'nb-' + _id++;
    }

    if (base) {
        base = Factory.get(base);
    }

    //  Вытаскиваем из `methods` информацию про события.
    var events = methods.events;
    //  Оставляем только методы.
    delete methods.events;

    //  "Пустой" конструктор.
    var ctor = function() {};
    //  Наследуемся либо от дефолтного конструктора, либо от указанного базового.
    nb.inherit( ctor, (base) ? base.ctor : Block );
    //  Все, что осталось в methods -- это дополнительные методы блока.
    nb.extend(ctor.prototype, methods);

    var factory = new Factory(name, ctor, events);

    //  Если указан базовый блок, нужно "склеить" события.
    if (base) {
        factory._extendEvents(base);
    }

    //  Сохраняем для дальнейшего применения.
    //  Достать нужную factory можно вызовом Factory.get(name).
    _factories[name] = factory;

    return factory;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Неленивая инициализация.
//  Находим все ноды с классом `_init` и на каждой из них инициализируем блок.
//  По-дефолту ищем ноды во всем документе, но можно передать ноду,
//  внутри которой будет происходить поиск. Полезно для инициализации динамически
//  созданных блоков.
nb.block.init = function(where) {
    where = where || document;

    var nodes = where.getElementsByClassName('_init');
    for (var i = 0, l = nodes.length; i < l; i++) {
        nb.block( nodes[i] );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Создаем "космос".
//  Физически это пустой блок, созданный на ноде html.
//  Его можно использовать как глобальный канал для отправки сообщений
//  и для навешивания разных live-событий на html.
nb.root = nb.define( {} ).create( document.getElementsByTagName('html')[0] );

//  ---------------------------------------------------------------------------------------------------------------  //

//  Инициализация библиотеки
//  ------------------------

$(function() {
    //  Инициализируем все неленивые блоки.
    nb.block.init();
});

//  ---------------------------------------------------------------------------------------------------------------  //

})();

