describe('popup', function() {
    beforeEach(function() {
        this.$body = $(document.body);

        this.popupOnCloseSpy = sinon.spy();

        this.popupNode = $('<div class="popup _hidden" data-nb="popup">Hi, I am popup</div>').appendTo(document.body);
        this.popupNode2 = $('<div class="popup _hidden" data-nb="popup">Hi, I am popup 2</div>').appendTo(document.body);
        this.parentPopupNode = $('<div class="popup _hidden" data-nb="popup">Hi, I am parent popup</div>').appendTo(document.body);
        this.childPopupNode = $('<div class="popup _hidden" data-nb="popup">Hi, I am child popup</div>').appendTo(document.body);
        this.ballonNode1 = $('<div class="popup _hidden" data-nb="ballon">Hi, I am ballon 1</div>').appendTo(document.body);
        this.ballonNode2 = $('<div class="popup _hidden" data-nb="ballon">Hi, I am ballon 2</div>').appendTo(document.body);

        this.popup = nb.block(this.popupNode[0], { 'close': this.popupOnCloseSpy });
        this.popup2 = nb.block(this.popupNode2[0]);
        this.parentPopup = nb.block(this.parentPopupNode[0]);
        this.childPopup = nb.block(this.childPopupNode[0]);
        this.ballon1 = nb.block(this.ballonNode1[0]);
        this.ballon2 = nb.block(this.ballonNode2[0]);
    });

    afterEach(function() {
        this.popup.destroy();
        this.popup2.destroy();
        this.parentPopup.destroy();
        this.childPopup.destroy();
        this.ballon1.destroy();
        this.ballon2.destroy();

        this.popupNode.remove();
        this.popupNode2.remove();
        this.parentPopupNode.remove();
        this.childPopupNode.remove();
        this.ballonNode1.remove();
        this.ballonNode2.remove();
    });

    describe('single popup close', function() {

        it('esc must close it', function(done) {
            var that = this;
            this.popup.trigger('open', { where: document.body });

            this.$body.trigger($.Event('keydown', { keyCode: 27 }));

            setTimeout(function() {
                expect(that.popupNode.is(':visible')).to.eql(false);
                done();
            }, 10);
        });

    });

    describe('do not close if ignoreEsc specified', function() {

        it('esc should not close popup', function(done) {
            var that = this;
            this.popup.ignoreEsc = true;
            this.popup.trigger('open', { where: document.body });

            this.$body.trigger($.Event('keydown', { keyCode: 27 }));

            setTimeout(function() {
                expect(that.popupNode.is(':visible')).to.eql(true);
                done();
            }, 10);
        });

    });

    describe('close inner popup first', function() {

        it('ESC should close only child popup', function(done) {
            var that = this;
            this.parentPopup.trigger('open', { where: document.body });
            this.childPopup.trigger('open', { where: this.parentPopupNode, parent: this.parentPopup });

            this.$body.trigger($.Event('keydown', { keyCode: 27 }));

            setTimeout(function() {
                expect(that.parentPopupNode.is(':visible')).to.eql(true);
                expect(that.childPopupNode.is(':visible')).to.eql(false);
                done();
            }, 10);
        });

        it('next ESC should close parent popup', function(done) {
            var that = this;

            this.$body.trigger($.Event('keydown', { keyCode: 27 }));

            setTimeout(function() {
                expect(that.parentPopupNode.is(':visible')).to.eql(false);
                expect(that.childPopupNode.is(':visible')).to.eql(false);
                done();
            }, 10);
        });

    });

    describe('stop ESC keydown propagation if some popup closed', function() {

        it('ESC must be stopped', function(done) {
            var evt = $.Event('keydown', { keyCode: 27 });

            this.popup.trigger('open', { where: document.body });

            this.$body.trigger(evt);

            setTimeout(function() {
                expect(evt.isImmediatePropagationStopped()).to.eql(true);
                expect(evt.isPropagationStopped()).to.eql(true);
                done();
            }, 10);
        });

        it('ESC should not be stopped if no popup was closed', function(done) {
            var evt = $.Event('keydown', { keyCode: 27 });

            this.$body.trigger(evt);

            setTimeout(function() {
                expect(evt.isImmediatePropagationStopped()).to.eql(false);
                expect(evt.isPropagationStopped()).to.eql(false);
                done();
            }, 10);
        });

    });

    describe('you cannot open multiple popups at the same time', function() {

        it('open 2 popups', function(done) {
            var that = this;

            this.popup.trigger('open', { where: document.body });
            this.popup2.trigger('open', { where: document.body });

            setTimeout(function() {
                expect(that.popupNode.is(':visible')).to.eql(false);
                expect(that.popupOnCloseSpy.callCount).to.eql(1);
                expect(that.popupNode2.is(':visible')).to.eql(true);
                done();
            }, 10);
        });

    });

    describe('ballon', function() {

        describe('you can open multiple ballons at the same time', function() {

            it('first ballon is shown', function(done) {
                var that = this;
                this.ballon1.trigger('open', { where: document.body });

                setTimeout(function() {
                    expect(that.ballonNode1.is(':visible')).to.eql(true);
                    done();
                }, 10);
            });

            it('second ballon is shown', function(done) {
                var that = this;
                this.ballon1.trigger('open', { where: document.body });
                this.ballon2.trigger('open', { where: document.body });

                setTimeout(function() {
                    expect(that.ballonNode2.is(':visible')).to.eql(true);
                    done();
                }, 10);
            });

            it('both are visible', function(done) {
                var that = this;

                this.ballon1.trigger('open', { where: document.body });
                this.ballon2.trigger('open', { where: document.body });

                setTimeout(function() {
                    expect(that.ballonNode1.is(':visible')).to.eql(true);
                    expect(that.ballonNode2.is(':visible')).to.eql(true);
                    done();
                }, 10);
            });

        });

    });

    describe('closeAll', function() {

        describe('closes all open popups', function() {});

        describe('if isPopup returns false - ballon / popup will not be closed', function() {});

    });

});
