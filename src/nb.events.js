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

