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
    expect(5);

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

    // Check suggest block init was called.
    ok(!!suggest.popup, "suggest ready");

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
    /* Init */

    /* Scenario */

    /* Checks */
});