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