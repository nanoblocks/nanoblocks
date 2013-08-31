describe('2 blocks on 1 node: block1 listen to click, block2 listen to dblclick', function() {
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

        nb.define('block1', { events: { click: onEvent } });
        nb.define('block2', { events: { dblclick: onEvent } });
    });

    afterEach(function() {
        this.$html.remove();
    });

    it('click: only block1 reacts', function() {
        this.setHTML(
            '<div class="inner" data-nb="block1 block2"></div>'
        ).trigger('click');
        expect(this.events.click).to.be.eql( [ 'block1' ] );
        expect(this.events.dblclick).to.be(undefined);
    });

    it('dblclick: only block2 reacts', function() {
        this.setHTML(
            '<div class="inner" data-nb="block1 block2"></div>'
        ).trigger('dblclick');
        expect(this.events.click).to.be(undefined);
        expect(this.events.dblclick).to.be.eql( [ 'block2' ] );
    });
});
