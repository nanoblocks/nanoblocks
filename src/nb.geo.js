nb.vec = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Складывает два вектора.
nb.vec.add = function(a, b, s) {
    s = s || 1;
    return [ a[0] + s * b[0], a[1] + s * b[1] ];
};

//  Скалярно умножает два вектора.
nb.vec.mulS = function(a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

//  Умножает матрицу на вектор.
nb.vec.mulM = function(m, a) {
    return [ nb.vec.mulS(m[0], a), nb.vec.mulS(m[1], a) ];
};

//  "Растягивает" вектор. Либо на скаляр, либо на вектор.
nb.vec.scale = function(a, b) {
    b = (typeof b === 'number') ? [ b, b ] : b;
    return [ a[0] * b[0], a[1] * b[1] ];
};

//  Превращаем строку направления вида в соответствующий вектор.
//  Например, 'right top' -> (1, -1)
//
//  (l, t)       (c, t)      (r, t)
//         *-------*-------*
//         |               |
//         |               |
//  (l, c) *     (c, c)    * (r, c)
//         |               |
//         |               |
//         *-------*-------*
//  (l, b)       (c, b)      (r, b)
//
nb.vec.dir2vec = function(dir) {
    return [ nb.vec.dirs[ dir[0] ], nb.vec.dirs[ dir[1] ] ];
}

nb.vec.dirs = {
    left: -1,
    center: 0,
    right: 1,
    top: -1,
    bottom: 1
};

nb.vec.flipDir = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top'
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Создаем из ноды прямоугольник: верхний левый угол и вектор-диагональ.
nb.rect = function(node) {
    if (node instanceof Array) {
        return [ node, [ 0, 0 ] ];
    }

    var $node = $(node);
    var offset = $node.offset();

    return [
        [ offset.left, offset.top ],
        [ $node.width(), $node.height() ]
    ];
};

//  Сдвигает прямоугольник.
nb.rect.move = function(r, a) {
    return [ nb.vec.add(r[0], a), r[1] ];
};

//  "Нормирует" прямоугольник.
nb.rect.norm = function(r) {
    var x = r[0];
    var y = nb.vec.add( x, r[1] );

    var a = [ Math.min( x[0], y[0] ), Math.min( x[1], y[1] ) ];
    var b = [ Math.max( x[0], y[0] ), Math.max( x[1], y[1] ) ];

    return [ a, nb.vec.add(b, a, -1) ];
};

//  Трансформирует прямоугольник.
nb.rect.trans = function(r, m) {
    r = [ nb.vec.mulM( m, r[0] ), nb.vec.mulM( m, r[1] ) ];
    return nb.rect.norm(r);
};

nb.rect.dir2vec = function(r, dir) {
    //  Полудиагональ.
    var h = nb.vec.scale( r[1], 0.5 );
    //  Центр прямоугольника.
    var c = nb.vec.add( r[0], h );
    //  Вектор, указывающий из центра прямоугольника на одну из 9 точек прямоугольника.
    //  См. комментарий к nb.vec.dir2vec.
    var d = nb.vec.scale( nb.vec.dir2vec(dir), h );

    //  Одна из 9 точек.
    return nb.vec.add(c, d);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Сдвигаем прямоугольник what относительно where так, чтобы, совпали две заданные точки привязки (их всего 9).
//  Например, правый верхний угол what совпал с левым верхним углом where.
//
//            what            where
//  *----------*----------*----*----*
//  |                     |         |
//  |                     *    *    *
//  |                     |         |
//  *          *          *----*----*
//  |                     |
//  |                     |
//  |                     |
//  *----------*----------*

//  what и where -- прямоугольники.
//  В how может быть массив вида:
//
//      [
//          'right top',    // Точка привязки для what.
//          'left top'      // Точка привязки для where.
//      ]
//
nb.rect.adjust = function(what, where, how) {
    //  Точка приложения what.
    var a = nb.rect.dir2vec(what, how.what);
    //  Точка приложение where.
    var b = nb.rect.dir2vec(where, how.where);

    //  Смещаем what на смещение от a к b.
    return {
        rect: nb.rect.move( what, nb.vec.add(b, a, -1) ),
        point: b
    };
};

