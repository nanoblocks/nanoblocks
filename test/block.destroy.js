describe('block.destroy()', function() {
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

        nb.define('block1', { events: {
            'init': onEvent,
            'click': onEvent,
            'blur': onEvent
        }});
    });

    afterEach(function() {
        this.$html.remove();
    });

    it('nb.block() will init only the top level block', function() {
        var $node = this.setHTML(
            '<div data-nb="block1"/>'
        );
        var node = $node[0];

        expect(this.events).to.be.eql( {} );

        var block = nb.block(node);
        block.testProp = true;
        expect(nb.block(node).testProp).to.be.eql(true);

        // Инстанс блока будут создан задано и свойство, которое дописали, будет утеряно.
        block.destroy();
        expect(nb.block(node).testProp).to.be.eql(undefined);
    });

});
