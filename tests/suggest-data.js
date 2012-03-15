module("Array data source");

test("Strings sorting", function() {
    return;

    var a =  { n: 'a'  };
    var b =  { n: 'b'  };
    var c =  { n: 'c'  };
    var aa = { n: 'aa' };
    var ab = { n: 'ab' };

    // 1. Sorting by key.

    // 1.1. Sort strings.
    var ar11 =   [ a, b, aa, c ];
    var ar11_s = [ a, aa, b, c ];
    deepEqual(new nb.suggest.arrayDS(ar11, 'n').ar, ar11_s);

    // 1.2. Sort by length.
    var ar12_1 =      [ a, aa ];
    var ar12_2 =      [ aa, a ];
    var ar12_2_copy = [ aa, a ];
    var ar12_3 =      [ b, aa, a, ab ];
    var ar12_3_s =    [ a, aa, ab, b ];

    deepEqual(new nb.suggest.arrayDS(ar12_1, 'n').ar, ar12_1);
    deepEqual(new nb.suggest.arrayDS(ar12_2, 'n').ar, ar12_1);
    deepEqual(ar12_2, ar12_2_copy, 'Initial array must not be changed');
    deepEqual(new nb.suggest.arrayDS(ar12_3, 'n').ar, ar12_3_s);

    // 1.3. Sort numbers.

    // 2. Searching.
    // 3. Caching.
});

test("Numbers sorting", function() {
    return;

    var e1  = { n: 1  };
    var e2  = { n: 2  };
    var e3  = { n: 3  };
    var e11 = { n: 11 };
    var e21 = { n: 21 };

    var ar21 =   [ e1, e3, e21, e2, e11 ];
    var ar21_s = [ e1, e2, e3, e11, e21 ];
    deepEqual(new nb.suggest.arrayDS(ar21, 'n').ar, ar21_s);
});

// 2. Searching.
test("Searching: strings", function() {

});

// 3. Caching.