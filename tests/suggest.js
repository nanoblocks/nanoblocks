module("Ajax requests");

test("Do not request while typing. Only after specified delay.", function() {
    expect(3);

    /* Init */
    var handler_spy = sinon.spy(function(text) {});

    // Fake server.
    var server = sinon.fakeServer.create();
    server.respondWith(
        "GET",
        /(?:\?&)?callback=([^&]*).*(?:\?&)?text=([^&]*)&?/,
        function(xhr, callback, text) {
            xhr.respond(
                200,
                { "Content-Type": "application/json" },
                callback + '([ { "label": "' + text + '" } ]);' // jsonp format
            );
            handler_spy(text);
        }
    );

    // Init suggest.
    var $input = $('<input type="text" data-nb="suggest" data-nb-source-url="/get-suggest" data-nb-delay="500" />').appendTo(document.body);
    var suggest = nb.block($input[0]); // init new suggest block
    $input.trigger(jQuery.Event("focusin")); // on this event suggest will initialized.

    // Fake time.
    var time = sinon.useFakeTimers();


    /* Scenario */
    $input.val("f").keyup();    // Type first letter.
    time.tick(450);             // Wait less then delay.
    $input.val("fa").keyup();   // Type another letter.
    time.tick(550);             // Wait more then delay.

    server.respond();


    /* Checks */
    ok(!!suggest.popup, "suggest ready");
    equal(handler_spy.callCount, 1, "only one request done");
    strictEqual(handler_spy.getCall(0).args[0], "fa", 'that was a request for suggest with text: "fa"');

    /* Restore */
    server.restore();
    time.restore();
});

test("Retry request data in case of fail", function() {
    expect(4);

    /* Init */
    // Fake time.
    var time = sinon.useFakeTimers();

    // Fake server.
    var server = sinon.fakeServer.create();
    server.respondWith([ 503, {}, "" ]);

    // Init suggest.
    var $input = $('<input type="text" data-nb="suggest" data-nb-source-url="/get-suggest" data-nb-delay="500" />').appendTo(document.body);
    var suggest = nb.block($input[0]); // init new suggest block
    $input.trigger(jQuery.Event("focusin")); // on this event suggest will initialized.

    /* Scenario */
    $input.val("f").keyup();    // Type first letter.
    time.tick(550);             // Wait more then delay for request to be started.

    // Before first request.
    equal(server.requests.length, 1, 'Now request was sent');
    var req = suggest._requests['f'];
    equal(req.retries, 2, '2 retries left');

    server.respond(); // Server respond with 503 first time.

    /* Checks */
    equal(server.requests.length, 3, "there must be 3 request, that were sent");
    equal(Object.keys(suggest._requests).length, 0, "there must be no requests: after allowed number of fails request will be removed");

    /* Restore */
    server.restore();
    time.restore();
});

test("After text changed - make more retries", function() {
    expect(2);

    /* Init */
    // Fake time.
    var time = sinon.useFakeTimers();

    // Fake server.
    var server = sinon.fakeServer.create();
    server.respondWith([ 503, {}, "" ]);

    // Init suggest.
    var $input = $('<input type="text" data-nb="suggest" data-nb-source-url="/get-suggest" data-nb-delay="500" />').appendTo(document.body);
    var suggest = nb.block($input[0]); // init new suggest block
    $input.trigger(jQuery.Event("focusin")); // on this event suggest will initialized.

    /* Scenario */
    $input.val("f").keyup();    // Type first letter.
    time.tick(550);             // Wait more then delay for request to be started.
    server.respond();           // Server respond with 503 first time.
    $input.val("").keyup();     // User removes current text.
    $input.val("f").keyup();    // And reinput the same string again.
    time.tick(550);             // Wait more then delay for request to be started.
    server.respond();           // Server respond with 503 first time again.

    /* Checks */
    equal(server.requests.length, 6, "there must be 2 x 3 requests done");
    equal(Object.keys(suggest._requests).length, 0, "and internal request autoremoved again");

    /* Restore */
    server.restore();
    time.restore();
});

test("Do not request data after user removed his input", function() {
    expect(1);

    /* Init */
    // Fake time.
    var time = sinon.useFakeTimers();

    // Fake server.
    var server = sinon.fakeServer.create();
    server.respondWith([ 503, {}, "" ]);

    // Init suggest.
    var $input = $('<input type="text" data-nb="suggest" data-nb-min_length="2" data-nb-delay="300" data-nb-source-url="/get-suggest" />').appendTo(document.body);
    var suggest = nb.block($input[0]); // init new suggest block
    $input.trigger(jQuery.Event("focusin")); // on this event suggest will initialized.

    /* Scenario */
    $input.val("f").keyup();    // User inputs first letter.
    time.tick(250);             // Wait less, then delay.
    server.respond();           // No requests.
    $input.val("fa").keyup();   // User appends next letter. Now we can request.
    time.tick(270);             // Wait again less than delay.
    $input.val("f").keyup();    // User removes one letter!
    time.tick(350);             // Wait more, then delay, so, that request could be sent (if not min_length value!).
    server.respond();           // No requests.

    /* Checks */
    equal(server.requests.length, 0, "There was no requests at all");

    /* Restore */
    server.restore();
    time.restore();
});

module("Internals");

test("Highlight matches", function() {
    expect(7);

    /* Init */
    var input_html = '<input type="text" class="init" data-nb="suggest" data-nb-source-url="/get-suggest" data-nb-delay="500" />';
    var suggest = nb.block($(input_html)[0]);

    /* Checks */
    equal(suggest.hightlightMatches('abc', 'a'), '<span class="match">a</span><span>bc</span>', 'First a');
    equal(suggest.hightlightMatches('abc', 'b'), '<span>a</span><span class="match">b</span><span>c</span>', 'Inner b');
    equal(suggest.hightlightMatches('abc', 'c'), '<span>ab</span><span class="match">c</span>', 'Last c');

    // Multiple matches.
    equal(suggest.hightlightMatches('abcb', 'b'), '<span>a</span><span class="match">b</span><span>c</span><span class="match">b</span>', 'Middle and last b');
    equal(suggest.hightlightMatches('abac', 'a'), '<span class="match">a</span><span>b</span><span class="match">a</span><span>c</span>', 'First and middle a');
    equal(suggest.hightlightMatches('abca', 'a'), '<span class="match">a</span><span>bc</span><span class="match">a</span>', 'First and last a');
    equal(suggest.hightlightMatches('dabac', 'a'), '<span>d</span><span class="match">a</span><span>b</span><span class="match">a</span><span>c</span>', '2 middle As');
});