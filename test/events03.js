// describe('events', function() {
//     it('parent block can listen to events inside a child block (was impossible earlier)');
// });

describe('nested blocks', function() {
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
            var type = evt.type;

            events[type] = events[type] || [];
            returns[type] = returns[type] || {};

            events[type].push(this.name);

            return returns[type][this.name];
        };

        nb.define('top', { events: {
            'click .top-listen-this': onEvent,
            'click .both-listen-this': onEvent
        }});
        nb.define('nested', { events: {
            'click .nested-listen-this': onEvent,
            'click .both-listen-this': onEvent
        }});
    });

    afterEach(function() {
        this.$html.remove();
    });

    it('top level block can listen to events inside a nested block', function() {
        this.setHTML(
            '<div data-nb="top">' +
                '<div data-nb="nested">' +
                    '<div class="nested-listen-this"></div>' +
                    '<div class="top-listen-this"></div>' +
                '</div>' +
            '</div>'
        ).find('.nested-listen-this').trigger('click');
        expect(this.events.click).to.be.eql( [ 'nested' ] );
    });
});
