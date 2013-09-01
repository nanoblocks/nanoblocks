describe('custom events', function() {
    beforeEach(function() {
        var that = this;
        this.setHTML = function(html) {
            that.$html = $(html);
            that.$html.appendTo(document.body);
            return that.$html;
        };

        var events = this.events = {};
        var returns = this.returns = {};

        var onEvent = function(evt) {
            var type = typeof evt === 'string' ? evt : evt.type;

            events[type] = events[type] || [];
            returns[type] = returns[type] || {};

            events[type].push(this.name);

            return returns[type][this.name];
        };

        nb.define('block', { events: {
            'nb-test-event': onEvent,
            'test-event': onEvent
        }});
    });

    afterEach(function() {
        this.$html.remove();
    });

    it('block can listen to custom events from the outer world', function() {
        var $node = this.setHTML('<div data-nb="block"/>');
        var block = nb.block($node[0]);
        block.trigger('nb-test-event');
        block.trigger('test-event');
        expect(this.events).to.be.eql({ 'nb-test-event': [ 'block' ], 'test-event': [ 'block' ] });
    });
});
