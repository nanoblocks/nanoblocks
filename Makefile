all:
	$(MAKE) -C blocks/s
	cat src/nb.common.js src/nb.events.js src/nb.blocks.js src/nb.geometry.js > nanoblocks.js

test-tools:
	test -x "$(shell which stylus)"
	test -x "$(shell which uglifyjs)"
	test -x "$(shell which csso)"

.PHONY: all test-tools

# TODO: посмотреть на grunt
#       https://github.com/cowboy/grunt
